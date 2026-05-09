import type { ReactNode } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/** Nested hub routes requiring login: playbook, leaderboard, campaigns, training fund, scholarship **apply**, etc. Public: `/fundraising`, `/fundraising/athletes/**`, `/fundraising/scholarships/**` except segments served only from `(giving-auth)` (e.g. `.../apply`). */
export default async function GivingHubAuthLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const h = await headers()
    const path = h.get("x-fundraising-return-path") ?? "/fundraising"
    redirect(`/auth/signin?returnTo=${encodeURIComponent(path)}`)
  }

  return <>{children}</>
}
