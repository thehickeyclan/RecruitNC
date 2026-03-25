import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Server-side session check. Redirects to sign-in if no user (enforces auth before RSC/streaming).
 */
export async function redirectIfSignedOut(returnToPath: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent(returnToPath)}`)
  }
}
