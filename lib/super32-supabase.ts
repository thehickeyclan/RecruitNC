import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const globalForSuper32 = globalThis as unknown as { super32AdminClient?: SupabaseClient }

/**
 * Optional second Supabase project holding legacy Super32 roster tables (`nc_roster`, `nc_roster_2024`).
 * Set in Vercel when that project exists; otherwise `isSuper32Configured()` is false and callers skip it.
 */
export function isSuper32Configured(): boolean {
  return !!(process.env.SUPER32_SUPABASE_URL?.trim() && process.env.SUPER32_SUPABASE_SERVICE_ROLE_KEY?.trim())
}

export function getSuper32Admin(): SupabaseClient {
  if (!isSuper32Configured()) {
    throw new Error("Super32 Supabase is not configured (SUPER32_SUPABASE_URL / SUPER32_SUPABASE_SERVICE_ROLE_KEY)")
  }
  if (globalForSuper32.super32AdminClient) return globalForSuper32.super32AdminClient

  const client = createClient(
    process.env.SUPER32_SUPABASE_URL!,
    process.env.SUPER32_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch },
    },
  )
  globalForSuper32.super32AdminClient = client
  return client
}
