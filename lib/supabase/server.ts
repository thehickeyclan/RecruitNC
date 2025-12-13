import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export { createServerClient } from "@supabase/ssr"

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

  return createSupabaseServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false, // DISABLE auto-refresh on server too
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
