import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export { createServerClient } from "@supabase/ssr"

/**
 * ⚠️ LOCKED CONFIGURATION - DO NOT MODIFY ⚠️
 * 
 * Server-side Supabase client configuration.
 * autoRefreshToken MUST be false to prevent rate limits.
 * 
 * See AUTH_CONFIG_LOCKED.md for full documentation.
 */
export async function createClient() {
  const cookieStore = await cookies()

  // CRITICAL: Check for rate limit cooldown BEFORE creating client
  // Even creating the client with stale cookies can trigger validation attempts
  const rateLimitCooldown = cookieStore.get("rate_limit_cooldown")?.value
  if (rateLimitCooldown) {
    const cooldownTime = parseInt(rateLimitCooldown, 10)
    const now = Date.now()
    if (cooldownTime && now < cooldownTime + 600000) {
      // In cooldown - create a minimal client that won't make auth calls
      // This prevents any automatic validation attempts
      console.warn("[Supabase Server] Rate limit cooldown active, creating minimal client")
    }
  }

  // ⚠️ CRITICAL: autoRefreshToken MUST be false
  const AUTO_REFRESH_TOKEN = false // ⚠️ DO NOT CHANGE - LOCKED CONFIG
  
  // Validate critical setting at runtime
  if (AUTO_REFRESH_TOKEN !== false) {
    console.error("🚨 CRITICAL ERROR: autoRefreshToken must be false to prevent rate limits!")
    throw new Error("Invalid auth configuration - autoRefreshToken must be false")
  }

  return createSupabaseServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: AUTO_REFRESH_TOKEN, // ⚠️ LOCKED - DO NOT CHANGE
      persistSession: false,
      detectSessionInUrl: false,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              sameSite: "none",
              secure: true,
            }),
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/** Alias for NHSCA live dashboard server actions; same as `createClient`. */
export const getSupabaseServerClient = createClient
