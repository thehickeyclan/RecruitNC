import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

function isMissingTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  if (err.code === "42P01") return true
  return Boolean(err.message?.includes("does not exist"))
}

/** Hub page load: audit trail + bump last_touched_at (best-effort). */
export async function recordCrmHubView(admin: SupabaseClient, contactUserId: string, actorUserId: string): Promise<void> {
  const now = new Date().toISOString()
  const { error: aErr } = await admin.from("crm_hub_audit_log").insert({
    contact_user_id: contactUserId,
    actor_user_id: actorUserId,
    action: "hub_view",
    metadata: {},
  })
  if (aErr && !isMissingTable(aErr)) {
    console.warn("[crm-hub] audit insert hub_view:", aErr.message)
  }

  const { error: sErr } = await admin.from("crm_contact_settings").upsert(
    {
      contact_user_id: contactUserId,
      last_touched_at: now,
      updated_at: now,
    },
    { onConflict: "contact_user_id" },
  )
  if (sErr && !isMissingTable(sErr)) {
    console.warn("[crm-hub] settings upsert touch:", sErr.message)
  }
}

export async function appendCrmAudit(
  admin: SupabaseClient,
  params: {
    contactUserId: string
    actorUserId: string
    action: string
    metadata?: Record<string, unknown>
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin.from("crm_hub_audit_log").insert({
    contact_user_id: params.contactUserId,
    actor_user_id: params.actorUserId,
    action: params.action,
    metadata: params.metadata ?? {},
  })
  if (error) {
    if (isMissingTable(error)) return { ok: true }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function touchCrmContactSettings(admin: SupabaseClient, contactUserId: string): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await admin.from("crm_contact_settings").upsert(
    {
      contact_user_id: contactUserId,
      last_touched_at: now,
      updated_at: now,
    },
    { onConflict: "contact_user_id" },
  )
  if (error && !isMissingTable(error)) {
    console.warn("[crm-hub] touch settings:", error.message)
  }
}

export async function createCrmContactNote(
  admin: SupabaseClient,
  params: {
    contactUserId: string
    authorUserId: string
    body: string
    pinned?: boolean
  },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const body = params.body.trim()
  if (!body) return { ok: false, error: "Note cannot be empty." }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const { error } = await admin.from("crm_contact_notes").insert({
    id,
    contact_user_id: params.contactUserId,
    author_user_id: params.authorUserId,
    body,
    pinned: !!params.pinned,
    created_at: now,
    updated_at: now,
  })
  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, error: "Run scripts/crm-hub-extensions.sql in Supabase (crm_contact_notes missing)." }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, id }
}

const PRIORITIES = new Set(["low", "normal", "high", "urgent"])

export async function patchCrmContactSettings(
  admin: SupabaseClient,
  contactUserId: string,
  patch: { assigned_admin_user_id?: string | null; priority?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (patch.priority != null && patch.priority !== "" && !PRIORITIES.has(patch.priority)) {
    return { ok: false, error: "Invalid priority." }
  }

  const now = new Date().toISOString()
  const row: Record<string, unknown> = {
    contact_user_id: contactUserId,
    updated_at: now,
    last_touched_at: now,
  }
  if (patch.assigned_admin_user_id !== undefined) {
    row.assigned_admin_user_id = patch.assigned_admin_user_id
  }
  if (patch.priority !== undefined) {
    row.priority = patch.priority === "" ? null : patch.priority
  }

  const { error } = await admin.from("crm_contact_settings").upsert(row, { onConflict: "contact_user_id" })
  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, error: "Run scripts/crm-hub-extensions.sql in Supabase (crm_contact_settings missing)." }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function fetchCrmAdminAssignees(
  admin: SupabaseClient,
): Promise<{ ok: true; rows: { user_id: string; label: string }[] } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("user_profiles")
    .select("user_id, full_name")
    .eq("is_admin", true)
    .order("full_name", { ascending: true })
    .limit(500)

  if (error) return { ok: false, error: error.message }
  const rows = (data ?? []).map((r) => {
    const u = r as { user_id: string; full_name: string | null }
    const name = (u.full_name || "").trim()
    const label = name || u.user_id.slice(0, 8)
    return { user_id: u.user_id, label }
  })
  return { ok: true, rows }
}
