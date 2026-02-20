import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | null = null

/**
 * Single source of truth for Supabase URL used by admin (DB) and auth.
 * Root cause of profile outages: two different URLs (auth vs admin) = hangs/405.
 * See docs/ROOT_CAUSE_PROFILE_FAILURE.md.
 */
function getSupabaseUrl(): string {
  const primary = process.env.SUPABASE_URL
  const fallback = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (primary && fallback && primary !== fallback) {
    throw new Error(
      "Supabase URL mismatch: SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL must be the same project. " +
        "Using two projects causes profile/auth failures. See docs/ROOT_CAUSE_PROFILE_FAILURE.md."
    )
  }
  const url = primary || fallback
  if (!url) {
    throw new Error("Supabase URL is not configured. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.")
  }
  return url
}

/**
 * Server-side Supabase client using the service role key.
 * Do not import this in client components.
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = getSupabaseUrl()
  // Use override if set (so you can add an editable env var in Vercel when the integration key is locked)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      "Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY_OVERRIDE."
    )
  }

  adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { "x-application-name": "nc-wrestling-portal-admin" },
    },
  })

  return adminClient
}

/**
 * Backwards-compatible alias used elsewhere in the app.
 */
export function createServiceRoleClient(): SupabaseClient {
  return createAdminClient()
}
