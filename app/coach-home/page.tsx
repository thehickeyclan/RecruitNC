/**
 * Coach Home: everything a college coach uses, on one page.
 *
 * A coach had to know the site to use it - rankings under one menu, profiles under another, the
 * comparison under a third, My Recruits and messages somewhere else again - and most never found
 * past the page they landed on (Matt, 10 October 2026). Nothing here is new: it is the search, the
 * coach's own board and inbox, and a door to each tool, in the order a coach reaches for them.
 *
 * Verified college coaches and admins, on the comparison's rule (lib/compare-access.ts) without
 * its tester list - testers were given the comparison, not the rest of a coach's account.
 */
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import CoachHomeClient from "./coach-home-client"
import { loadCoachHome } from "./load-coach-home"

export const dynamic = "force-dynamic"

export const metadata = { title: "Coach Home | RecruitNC" }

export default async function CoachHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <CoachHomeClient access="signed-out" data={null} />

  const loaded = await loadCoachHome(createAdminClient(), user.id)
  return <CoachHomeClient access={loaded.access} data={loaded.data} />
}
