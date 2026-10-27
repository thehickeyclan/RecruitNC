/**
 * My Recruits: the coach's home (Matt, 27 Oct 2026). The board and its funnel first
 * (components/my-recruits-board.tsx), then what needs the coach and who to add
 * (components/coach/my-recruits-home.tsx), from Coach Home's loader.
 */
import { cookies } from "next/headers"
import { AuthGuard } from "@/components/auth-guard"
import { MyRecruitsHome } from "@/components/coach/my-recruits-home"
import { loadCoachHome } from "@/app/coach-home/load-coach-home"
import { VIEW_GENDER_COOKIE } from "@/lib/recruiting/coach-program"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function MyRecruitsPage() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  const loaded = user ? await loadCoachHome(createAdminClient(), user.id, (await cookies()).get(VIEW_GENDER_COOKIE)?.value).catch(() => null) : null
  return (
    <AuthGuard>
      <MyRecruitsHome data={loaded?.access === "ok" ? loaded.data : null} />
    </AuthGuard>
  )
}
