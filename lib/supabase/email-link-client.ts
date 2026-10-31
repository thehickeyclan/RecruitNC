import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * The client for sending sign-up confirmations: the implicit flow, not PKCE.
 *
 * A PKCE confirmation can only be finished in the browser that started the sign-up, so a family
 * who opened the email in the Gmail app was confirmed nowhere and asked to sign in (Matt's test,
 * 31 Oct 2026). An implicit token is checked on our server (/auth/callback, verifyOtp), from any
 * browser on any device. No session is kept: this client only asks Supabase to send the email.
 */
export function createEmailLinkClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
