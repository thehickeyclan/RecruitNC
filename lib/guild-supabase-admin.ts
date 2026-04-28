import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type GuildPublicUserRow = {
  id: string
  email: string | null
  role: string | null
}

/** Server-only: Wrestling Guild Supabase (separate project from RecruitNC). */
export function isGuildSupabaseConfigured(): boolean {
  return Boolean(process.env.GUILD_SUPABASE_URL?.trim() && process.env.GUILD_SUPABASE_SERVICE_ROLE_KEY?.trim())
}

export function createGuildAdminClient(): SupabaseClient | null {
  const url = process.env.GUILD_SUPABASE_URL?.trim()
  const key = process.env.GUILD_SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Strip ILIKE metacharacters so user input cannot broaden the query. */
export function sanitizeEmailForIlike(raw: string): string {
  return raw.trim().replace(/%/g, "").replace(/_/g, "")
}

/**
 * Guild `public.users` (or equivalent): parent rows matching email (case-insensitive).
 */
export async function fetchGuildParentUsersByEmail(email: string): Promise<{
  ok: true
  rows: GuildPublicUserRow[]
} | { ok: false; error: string }> {
  const client = createGuildAdminClient()
  if (!client) {
    return { ok: false, error: "Guild Supabase is not configured (GUILD_SUPABASE_URL / GUILD_SUPABASE_SERVICE_ROLE_KEY)." }
  }
  const safe = sanitizeEmailForIlike(email)
  if (!safe || !safe.includes("@")) {
    return { ok: false, error: "Enter a valid email address." }
  }
  const { data, error } = await client
    .from("users")
    .select("id, email, role")
    .ilike("email", safe)
    .eq("role", "parent")
    .limit(20)

  if (error) {
    console.error("[guild-supabase-admin] users select", error.message)
    return { ok: false, error: error.message }
  }
  return {
    ok: true,
    rows: (data ?? []).map((r) => ({
      id: String((r as { id: string }).id),
      email: (r as { email?: string | null }).email ?? null,
      role: (r as { role?: string | null }).role ?? null,
    })),
  }
}

export async function fetchGuildUserById(id: string): Promise<GuildPublicUserRow | null> {
  const client = createGuildAdminClient()
  if (!client) return null
  const { data, error } = await client.from("users").select("id, email, role").eq("id", id).maybeSingle()
  if (error || !data) return null
  return {
    id: String((data as { id: string }).id),
    email: (data as { email?: string | null }).email ?? null,
    role: (data as { role?: string | null }).role ?? null,
  }
}
