import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FUNDRAISING_AUTH_RETURN_COOKIE } from "@/lib/fundraising/fundraising-auth-return-cookie"

/** Nested hub routes requiring login: playbook, legacy `/fundraising/give` redirect, `/fundraising/training-fund`, scholarship **apply**, campaign checkout `/fundraising/[slug]`, legacy `/fundraising/donate` redirect target, etc. Public hub: `/fundraising`, corporate + honor-roll, leaderboard, activity, athletes, scholarships browse/donate/thanks — except apply-only `(giving-auth)/scholarships/.../apply`. */
export default async function GivingHubAuthLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const jar = await cookies()
    let path = "/fundraising"
    const enc = jar.get(FUNDRAISING_AUTH_RETURN_COOKIE)?.value
    if (enc) {
      try {
        const decoded = decodeURIComponent(enc)
        if (decoded.startsWith("/fundraising")) path = decoded
      } catch {
        /* ignore malformed cookie */
      }
    }
    redirect(`/auth/signin?returnTo=${encodeURIComponent(path)}`)
  }

  return <>{children}</>
}
