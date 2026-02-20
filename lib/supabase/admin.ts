import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | null = null

/**
 * Server-side Supabase client using the service role key.
 * Do not import this in client components.
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  // Use override if set (so you can add an editable env var in Vercel when the integration key is locked)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) {
    throw new Error("Supabase URL is not configured. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.")
  }
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
