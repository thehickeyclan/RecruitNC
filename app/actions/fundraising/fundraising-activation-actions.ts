"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { resolveFundraisingAthletePublicBySlugForRequest } from "@/lib/fundraising/athlete-fundraising-profiles"
import { ensureParentAthleteLinkAdmin } from "@/lib/fundraising/ensure-parent-athlete-link-admin"
import { sendFundraisingActivationApprovedNotifications } from "@/lib/fundraising/send-fundraising-activation-approved-notifications"

export type ActivationRequestRow = {
  id: string
  user_id: string
  /** Copy of auth email at submit time — may be null for older rows or edge auth states. */
  requester_email: string | null
  athlete_id: string | null
  fundraising_slug: string
  status: string
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  admin_note: string | null
}

export async function submitFundraisingActivationRequestAction(params: {
  fundraisingSlug: string
  athleteId: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const slug = params.fundraisingSlug.trim().toLowerCase()
  if (!slug) return { ok: false, error: "Missing page." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Sign in required." }

  const { data: existingPending } = await supabase
    .from("fundraising_activation_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("fundraising_slug", slug)
    .eq("status", "pending")
    .maybeSingle()

  if (existingPending) {
    return { ok: true }
  }

  const requesterEmail =
    typeof user.email === "string" && user.email.trim() ? user.email.trim().toLowerCase() : null

  const { error } = await supabase.from("fundraising_activation_requests").insert({
    user_id: user.id,
    athlete_id: params.athleteId,
    fundraising_slug: slug,
    status: "pending",
    requester_email: requesterEmail,
  })

  if (error) {
    if (error.code === "23505") return { ok: true }
    if (error.code === "42703" || error.message?.includes("requester_email")) {
      return {
        ok: false,
        error:
          "Database needs column requester_email — run scripts/supabase-fundraising-activation-requester-email.sql in Supabase, or contact support.",
      }
    }
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return { ok: false, error: "Database table missing — run scripts/supabase-fundraising-activation.sql in Supabase." }
    }
    console.warn("[submitFundraisingActivationRequest]", error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath(`/fundraising/athletes/${slug}`)
  return { ok: true }
}

async function resolveAthleteIdForActivationApprove(params: {
  storedAthleteId: string | null
  fundraisingSlug: string
}): Promise<string | null> {
  const stored =
    typeof params.storedAthleteId === "string" && params.storedAthleteId.trim()
      ? params.storedAthleteId.trim()
      : null
  if (stored) return stored

  const slug = params.fundraisingSlug.trim().toLowerCase()
  if (!slug) return null

  const resolved = await resolveFundraisingAthletePublicBySlugForRequest(slug)
  if (!resolved) return null

  const fromProfile = typeof resolved.profile?.athlete_id === "string" ? resolved.profile.athlete_id.trim() : ""
  if (fromProfile) return fromProfile

  const eid = resolved.entry?.id
  if (eid && !eid.startsWith("spartan-fundraising:")) return eid

  return null
}

export async function reviewFundraisingActivationRequestAdminAction(
  requestId: string,
  nextStatus: "approved" | "rejected",
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Unauthorized" }

  const admin = createAdminClient()
  const { data: reqRow, error: fetchErr } = await admin
    .from("fundraising_activation_requests")
    .select("id, user_id, requester_email, athlete_id, fundraising_slug, status")
    .eq("id", requestId)
    .maybeSingle()

  if (fetchErr || !reqRow) {
    console.warn("[reviewFundraisingActivationRequest] fetch", fetchErr?.message)
    return { ok: false, error: fetchErr?.message ?? "Request not found." }
  }

  let resolvedAthleteIdForApprove: string | null = null

  if (nextStatus === "approved") {
    const slug =
      typeof reqRow.fundraising_slug === "string" ? reqRow.fundraising_slug.trim().toLowerCase() : ""
    const parentUserId = typeof reqRow.user_id === "string" ? reqRow.user_id.trim() : ""
    if (!slug || !parentUserId) {
      return { ok: false, error: "Request is missing slug or user — cannot approve." }
    }

    resolvedAthleteIdForApprove = await resolveAthleteIdForActivationApprove({
      storedAthleteId: typeof reqRow.athlete_id === "string" ? reqRow.athlete_id : null,
      fundraisingSlug: slug,
    })

    if (!resolvedAthleteIdForApprove) {
      return {
        ok: false,
        error:
          "Cannot resolve a recruiting athlete UUID for this slug (roster-only / Spartan-only rows need a profile or manual link). Fix the fundraising profile or use Profile → attach parent, then approve again.",
      }
    }

    const linked = await ensureParentAthleteLinkAdmin(admin, {
      parentUserId,
      athleteId: resolvedAthleteIdForApprove,
    })
    if (!linked.ok) return { ok: false, error: linked.error }
  }

  const now = new Date().toISOString()

  if (nextStatus === "approved" && resolvedAthleteIdForApprove) {
    // First try to update existing active profile
    const { data: activatedProfiles, error: liveErr } = await admin
      .from("athlete_fundraising_profiles")
      .update({ checkout_live: true, updated_at: now })
      .eq("athlete_id", resolvedAthleteIdForApprove)
      .eq("is_active", true)
      .select("id")

    if (liveErr) {
      console.warn("[reviewFundraisingActivationRequest] checkout_live on profile", liveErr.message)
      return { ok: false, error: liveErr.message }
    }
    
    // If no active profile exists, CREATE one
    if (!activatedProfiles?.length) {
      const slug = typeof reqRow.fundraising_slug === "string" ? reqRow.fundraising_slug.trim().toLowerCase() : ""
      
      // Get athlete info to build the profile
      const { data: athleteData } = await admin
        .from("athletes")
        .select("id, \"firstName\", \"lastName\", gradYear")
        .eq("id", resolvedAthleteIdForApprove)
        .single()
      
      if (!athleteData) {
        return { ok: false, error: "Could not find athlete record to create fundraising profile." }
      }
      
      // Generate a fundraising code
      const firstName = athleteData.firstName || "athlete"
      const lastName = athleteData.lastName || "unknown"
      const gradYear = athleteData.gradYear || new Date().getFullYear() + 4
      const code = `NCU-${lastName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8)}${firstName.charAt(0).toUpperCase()}-${String(gradYear).slice(-2)}`
      
      const { error: createErr } = await admin
        .from("athlete_fundraising_profiles")
        .insert({
          athlete_id: resolvedAthleteIdForApprove,
          slug: slug,
          is_active: true,
          checkout_live: true,
          primary_fundraising_code: code,
          campaign_goal_cents: 50000, // $500 default goal
          total_raised_cents: 0,
          created_at: now,
          updated_at: now,
        })
      
      if (createErr) {
        // If slug already exists, try with a unique suffix
        if (createErr.code === "23505") {
          const uniqueSlug = `${slug}-${Date.now().toString(36)}`
          const { error: retryErr } = await admin
            .from("athlete_fundraising_profiles")
            .insert({
              athlete_id: resolvedAthleteIdForApprove,
              slug: uniqueSlug,
              is_active: true,
              checkout_live: true,
              primary_fundraising_code: code,
              campaign_goal_cents: 50000,
              total_raised_cents: 0,
              created_at: now,
              updated_at: now,
            })
          if (retryErr) {
            console.warn("[reviewFundraisingActivationRequest] create profile retry", retryErr.message)
            return { ok: false, error: retryErr.message }
          }
        } else {
          console.warn("[reviewFundraisingActivationRequest] create profile", createErr.message)
          return { ok: false, error: createErr.message }
        }
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    reviewed_at: now,
    reviewed_by: user.id,
  }

  if (nextStatus === "approved" && resolvedAthleteIdForApprove) {
    const existing = typeof reqRow.athlete_id === "string" ? reqRow.athlete_id.trim() : ""
    if (!existing || existing !== resolvedAthleteIdForApprove) {
      updatePayload.athlete_id = resolvedAthleteIdForApprove
    }
  }

  const { error } = await admin.from("fundraising_activation_requests").update(updatePayload).eq("id", requestId)

  if (error) {
    console.warn("[reviewFundraisingActivationRequest]", error.message)
    return { ok: false, error: error.message }
  }

  if (nextStatus === "approved" && resolvedAthleteIdForApprove) {
    const parentUserId = typeof reqRow.user_id === "string" ? reqRow.user_id.trim() : ""
    const slugForNotify =
      typeof reqRow.fundraising_slug === "string" ? reqRow.fundraising_slug.trim().toLowerCase() : ""
    const requesterEmail =
      typeof (reqRow as { requester_email?: string | null }).requester_email === "string"
        ? (reqRow as { requester_email: string }).requester_email
        : null
    if (parentUserId && slugForNotify) {
      try {
        await sendFundraisingActivationApprovedNotifications(admin, {
          parentUserId,
          requesterEmail,
          athleteId: resolvedAthleteIdForApprove,
          fundraisingSlug: slugForNotify,
        })
      } catch (e) {
        console.error("[reviewFundraisingActivationRequest] activation notifications", e)
      }
    }
  }

  const slugOut = typeof reqRow.fundraising_slug === "string" ? reqRow.fundraising_slug : null
  if (slugOut) {
    revalidatePath(`/fundraising/athletes/${slugOut.trim().toLowerCase()}`)
    revalidatePath("/profile")
  }
  revalidatePath("/admin/fundraising/activation-requests")
  return { ok: true }
}

export async function listFundraisingActivationRequestsAdmin(): Promise<ActivationRequestRow[]> {
  const gate = await requireAdmin()
  if (!gate.ok) return []

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("fundraising_activation_requests")
    .select(
      "id, user_id, requester_email, athlete_id, fundraising_slug, status, created_at, reviewed_at, reviewed_by, admin_note",
    )
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.warn("[listFundraisingActivationRequests]", error.message)
    return []
  }
  return (data ?? []) as ActivationRequestRow[]
}
