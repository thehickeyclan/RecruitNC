"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { resolveFundraisingAthletePublicBySlugForRequest } from "@/lib/fundraising/athlete-fundraising-profiles"
import { ensureParentAthleteLinkAdmin } from "@/lib/fundraising/ensure-parent-athlete-link-admin"

export type ActivationRequestRow = {
  id: string
  user_id: string
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

  const { error } = await supabase.from("fundraising_activation_requests").insert({
    user_id: user.id,
    athlete_id: params.athleteId,
    fundraising_slug: slug,
    status: "pending",
  })

  if (error) {
    if (error.code === "23505") return { ok: true }
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
    .select("id, user_id, athlete_id, fundraising_slug, status")
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
    .select("id, user_id, athlete_id, fundraising_slug, status, created_at, reviewed_at, reviewed_by, admin_note")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.warn("[listFundraisingActivationRequests]", error.message)
    return []
  }
  return (data ?? []) as ActivationRequestRow[]
}
