"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"

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

export async function acknowledgeFundraisingPlaybookAction(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Sign in required." }

  const now = new Date().toISOString()
  const { error } = await supabase.from("fundraising_playbook_acks").upsert(
    { user_id: user.id, acknowledged_at: now, source: "members", updated_at: now },
    { onConflict: "user_id" },
  )
  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return { ok: false, error: "Database table missing — run scripts/supabase-fundraising-activation.sql in Supabase." }
    }
    console.warn("[acknowledgeFundraisingPlaybook]", error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath("/fundraising/playbook/members")
  revalidatePath("/fundraising/athletes")
  return { ok: true }
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

  const { data: ack } = await supabase.from("fundraising_playbook_acks").select("user_id").eq("user_id", user.id).maybeSingle()
  if (!ack) {
    return {
      ok: false,
      error: "Read and acknowledge the fundraising playbook first (bottom of /fundraising/playbook/members — sign in required).",
    }
  }

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
  const now = new Date().toISOString()
  const { error } = await admin
    .from("fundraising_activation_requests")
    .update({
      status: nextStatus,
      reviewed_at: now,
      reviewed_by: user.id,
    })
    .eq("id", requestId)

  if (error) {
    console.warn("[reviewFundraisingActivationRequest]", error.message)
    return { ok: false, error: error.message }
  }

  const { data: row } = await admin.from("fundraising_activation_requests").select("fundraising_slug").eq("id", requestId).maybeSingle()
  const slug = typeof row?.fundraising_slug === "string" ? row.fundraising_slug : null
  if (slug) revalidatePath(`/fundraising/athletes/${slug}`)
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
