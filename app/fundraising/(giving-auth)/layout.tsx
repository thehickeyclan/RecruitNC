import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FUNDRAISING_AUTH_RETURN_COOKIE } from "@/lib/fundraising/fundraising-auth-return-cookie"

/** Nested hub routes requiring login: playbook, training fund, scholarship **apply**, campaign checkout pages, etc. Public: `/fundraising`, `/fundraising/leaderboard`, `/fundraising/activity`, `/fundraising/athletes/**`, `/fundraising/scholarships/**` except segments served only from `(giving-auth)` (e.g. `.../apply`). */
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
