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

export type WiringStatus = {
  athleteResolved: boolean
  profileActive: boolean
  checkoutLive: boolean
  parentLinked: boolean
  notificationSent: boolean
}

export type EnrichedActivationRow = ActivationRequestRow & {
  wiring: WiringStatus
  /** True when status=approved but at least one wiring step is false */
  wiringIncomplete: boolean
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
    const slug = typeof reqRow.fundraising_slug === "string" ? reqRow.fundraising_slug.trim().toLowerCase() : ""
    
    // First check if profile exists
    const { data: existingProfile } = await admin
      .from("athlete_fundraising_profiles")
      .select("id")
      .eq("athlete_id", resolvedAthleteIdForApprove)
      .maybeSingle()

    if (existingProfile) {
      // Profile exists - just activate it
      const { error: activateErr } = await admin
        .from("athlete_fundraising_profiles")
        .update({ 
          is_active: true, 
          checkout_live: true, 
          updated_at: now 
        })
        .eq("athlete_id", resolvedAthleteIdForApprove)

      if (activateErr) {
        console.warn("[reviewFundraisingActivationRequest] activate profile", activateErr.message)
        return { ok: false, error: activateErr.message }
      }
    } else {
      // No profile exists - CREATE one
      // Get athlete info for the fundraising code
      const { data: athleteData } = await admin
        .from("athletes")
        .select("id, \"firstName\", \"lastName\", gradYear")
        .eq("id", resolvedAthleteIdForApprove)
        .single()
      
      const firstName = athleteData?.firstName || "Athlete"
      const lastName = athleteData?.lastName || "Unknown"
      const gradYear = athleteData?.gradYear || new Date().getFullYear() + 4
      
      // Generate fundraising code: NCU-LASTNAME-YY
      const code = `NCU-${lastName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 10)}-${String(gradYear).slice(-2)}`
      
      const { error: createErr } = await admin
        .from("athlete_fundraising_profiles")
        .insert({
          athlete_id: resolvedAthleteIdForApprove,
          slug: slug,
          is_active: true,
          checkout_live: true,
          primary_fundraising_code: code,
          campaign_goal_cents: 50000, // $500 default
          total_raised_cents: 0,
          created_at: now,
          updated_at: now,
        })

      if (createErr) {
        // If slug collision, try with unique suffix
        if (createErr.code === "23505") {
          const uniqueSlug = `${slug}-${Date.now().toString(36).slice(-4)}`
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

/* ─────────────── Enriched listing with wiring status ─────────────── */

export async function listEnrichedActivationRequestsAdmin(): Promise<EnrichedActivationRow[]> {
  const rows = await listFundraisingActivationRequestsAdmin()
  if (rows.length === 0) return []

  const admin = createAdminClient()

  // Collect all athlete_ids that are non-null
  const athleteIds = rows
    .map((r) => r.athlete_id)
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
  const uniqueAthleteIds = [...new Set(athleteIds)]

  // Collect all user_id + athlete_id pairs for parent link checks
  const userAthleteKeys = rows
    .filter((r) => r.athlete_id)
    .map((r) => ({ userId: r.user_id, athleteId: r.athlete_id! }))

  // Batch query: fundraising profiles
  let profileMap = new Map<string, { is_active: boolean; checkout_live: boolean }>()
  if (uniqueAthleteIds.length > 0) {
    const { data: profiles } = await admin
      .from("athlete_fundraising_profiles")
      .select("athlete_id, is_active, checkout_live")
      .in("athlete_id", uniqueAthleteIds)
    for (const p of profiles ?? []) {
      profileMap.set(p.athlete_id, { is_active: !!p.is_active, checkout_live: !!p.checkout_live })
    }
  }

  // Batch query: parent links
  let linkSet = new Set<string>()
  if (userAthleteKeys.length > 0) {
    const { data: links } = await admin
      .from("parent_athlete_links")
      .select("user_id, athlete_id")
    for (const l of links ?? []) {
      linkSet.add(`${l.user_id}:${l.athlete_id}`)
    }
  }

  return rows.map((r) => {
    const athleteResolved = typeof r.athlete_id === "string" && r.athlete_id.trim().length > 0
    const profile = athleteResolved ? profileMap.get(r.athlete_id!) : undefined
    const profileActive = profile?.is_active ?? false
    const checkoutLive = profile?.checkout_live ?? false
    const parentLinked = athleteResolved ? linkSet.has(`${r.user_id}:${r.athlete_id}`) : false
    const notificationSent = r.reviewed_at !== null && r.status === "approved"

    const wiring: WiringStatus = {
      athleteResolved,
      profileActive,
      checkoutLive,
      parentLinked,
      notificationSent,
    }

    const wiringIncomplete =
      r.status === "approved" &&
      (!athleteResolved || !profileActive || !checkoutLive || !parentLinked || !notificationSent)

    return { ...r, wiring, wiringIncomplete }
  })
}

/* ─────────────── Fix actions for broken wiring ─────────────── */

export async function fixParentLinkAction(
  requestId: string,
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from("fundraising_activation_requests")
    .select("user_id, athlete_id")
    .eq("id", requestId)
    .single()

  if (!req?.athlete_id || !req?.user_id) {
    return { ok: false, error: "Request missing user or athlete ID." }
  }

  const result = await ensureParentAthleteLinkAdmin(admin, {
    parentUserId: req.user_id,
    athleteId: req.athlete_id,
  })

  revalidatePath("/admin/fundraising/activation-requests")
  return result
}

export async function fixProfileActiveAction(
  requestId: string,
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from("fundraising_activation_requests")
    .select("athlete_id")
    .eq("id", requestId)
    .single()

  if (!req?.athlete_id) {
    return { ok: false, error: "Request missing athlete ID." }
  }

  const { error } = await admin
    .from("athlete_fundraising_profiles")
    .update({ is_active: true, checkout_live: true, updated_at: new Date().toISOString() })
    .eq("athlete_id", req.athlete_id)

  if (error) return { ok: false, error: error.message }

  revalidatePath("/admin/fundraising/activation-requests")
  return { ok: true }
}

export async function resendNotificationAction(
  requestId: string,
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from("fundraising_activation_requests")
    .select("user_id, athlete_id, fundraising_slug, requester_email")
    .eq("id", requestId)
    .single()

  if (!req?.athlete_id || !req?.user_id || !req?.fundraising_slug) {
    return { ok: false, error: "Request missing required fields." }
  }

  try {
    await sendFundraisingActivationApprovedNotifications(admin, {
      parentUserId: req.user_id,
      requesterEmail: req.requester_email ?? null,
      athleteId: req.athlete_id,
      fundraisingSlug: req.fundraising_slug,
    })
  } catch (e) {
    console.error("[resendNotificationAction]", e)
    return { ok: false, error: "Failed to send notification." }
  }

  revalidatePath("/admin/fundraising/activation-requests")
  return { ok: true }
}
