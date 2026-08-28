import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Gives an auth account the profile row its signup failed to write.
 *
 * `/api/auth/signup` creates the account first and the profile second, inside a catch that logs
 * and carries on. That is the right call at the time — the account exists, so failing the request
 * would leave somebody unable to retry with an email that is now taken — but it means the gap is
 * silent. Sixty-two accumulated over a year: no name, no role, invisible to admin tooling, and
 * absent from every email export.
 *
 * So the repair runs on a schedule instead, where it costs nobody anything.
 */

/** `profile_type` carries a check constraint and accepts fewer values than `role`. */
const PROFILE_TYPES = new Set(["fan", "athlete", "parent", "hs-club-coach", "college-coach", "media", "referee"])

/** `role` is NOT NULL. The least privileged value in use, so a missing one grants nothing. */
const DEFAULT_ROLE = "fan"

function clean(value: unknown): string | null {
  const s = String(value ?? "").trim()
  return s ? s : null
}

export type BackfillResult = {
  authUsers: number
  profiles: number
  created: number
  createdEmails: string[]
  errors: string[]
}

export async function backfillMissingProfiles(admin: SupabaseClient): Promise<BackfillResult> {
  const authUsers: { id: string; email?: string; created_at: string; user_metadata?: Record<string, unknown> }[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return { authUsers: 0, profiles: 0, created: 0, createdEmails: [], errors: [error.message] }
    authUsers.push(...(data.users as typeof authUsers))
    if (data.users.length < 1000) break
  }

  const existing: { user_id: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("user_profiles").select("user_id").range(from, from + 999)
    if (error) return { authUsers: authUsers.length, profiles: 0, created: 0, createdEmails: [], errors: [error.message] }
    existing.push(...data)
    if (data.length < 1000) break
  }

  const have = new Set(existing.map((p) => p.user_id))
  const missing = authUsers.filter((u) => !have.has(u.id))
  if (missing.length === 0) {
    return { authUsers: authUsers.length, profiles: existing.length, created: 0, createdEmails: [], errors: [] }
  }

  const rows = missing.map((u) => {
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>
    const first = clean(meta.first_name)
    const last = clean(meta.last_name)
    const declared = clean(meta.profile_type) ?? clean(meta.role)
    return {
      user_id: u.id,
      email: clean(u.email) ?? clean(meta.email),
      first_name: first,
      last_name: last,
      full_name: clean(meta.full_name) ?? clean([first, last].filter(Boolean).join(" ")),
      cell_phone: clean(meta.cell_phone),
      role: clean(meta.role) ?? clean(meta.profile_type) ?? DEFAULT_ROLE,
      profile_type: declared && PROFILE_TYPES.has(declared) ? declared : "fan",
      is_admin: false,
      // Their real signup date, so the growth chart does not show them all arriving tonight.
      created_at: u.created_at,
      updated_at: new Date().toISOString(),
    }
  })

  let created = 0
  const errors: string[] = []
  for (let i = 0; i < rows.length; i += 25) {
    const chunk = rows.slice(i, i + 25)
    const { error } = await admin.from("user_profiles").upsert(chunk, { onConflict: "user_id" })
    if (error) errors.push(error.message)
    else created += chunk.length
  }

  return {
    authUsers: authUsers.length,
    profiles: existing.length,
    created,
    createdEmails: rows.map((r) => r.email ?? r.user_id).slice(0, 25),
    errors: [...new Set(errors)],
  }
}
