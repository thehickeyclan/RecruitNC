/**
 * Coach Home exactly as one named coach sees it, on a developer's machine.
 *
 * /dev/coach-preview?coach=coachgarland@virginia.edu
 * /dev/coach-preview?coach=...&gender=Female   the same coach on the women's side, without touching the account
 * /dev/coach-preview?coach=...&page=my-recruits   My Recruits instead, the board loaded here
 * /dev/coach-preview?coach=...&page=recently-claimed   the full Recently claimed list
 *
 * Built the morning Virginia's head coach was greeted with Ohio University's logo and nobody
 * could say what he had seen, because seeing it took his password. This runs the same load the
 * real page runs, for any coach, with no session - so a coach's first screen can be looked at
 * before he looks at it.
 *
 * Local development only: it shows one person's account to whoever asks, so it does not exist in
 * a production or preview build at all.
 */
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import CoachHomeClient from "@/app/coach-home/coach-home-client"
import { MyRecruitsHome } from "@/components/coach/my-recruits-home"
import { loadCoachHome } from "@/app/coach-home/load-coach-home"
import { RecentlyClaimedList } from "@/components/coach/recently-claimed"
import { coachInterestScope } from "@/lib/college-programs/interested-for-coach"
import { loadJustClaimed } from "@/lib/college-programs/just-claimed-for-coach"
import { loadMyRecruits } from "@/lib/my-recruits"
import { resolveFitViewer } from "@/lib/program-fit-viewer"

export const dynamic = "force-dynamic"

export default async function CoachPreviewPage({ searchParams }: { searchParams: Promise<{ coach?: string; gender?: string; page?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()

  const params = await searchParams
  const coach = String(params.coach ?? "").trim()
  if (!coach) return <p style={{ padding: 24 }}>Add ?coach=email or ?coach=user-id</p>

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("user_id")
    .or(coach.includes("@") ? `email.ilike.${coach}` : `user_id.eq.${coach}`)
    .maybeSingle()
  if (!profile) return <p style={{ padding: 24 }}>No account for {coach}</p>

  const loaded = await loadCoachHome(admin, String(profile.user_id), params.gender ?? null)
  if (params.page === "my-recruits") {
    const board = await loadMyRecruits(admin, String(profile.user_id)).catch(() => null)
    return <MyRecruitsHome data={loaded.access === "ok" ? loaded.data : null} board={board ? { ...board, fit: {}, hasStandard: false } : null} />
  }
  if (params.page === "recently-claimed") {
    const scope = await coachInterestScope(admin, String(profile.user_id))
    const wrestlers = scope.allowed ? await loadJustClaimed(admin, scope.schoolId, scope.gender, new Set(), await resolveFitViewer(admin, String(profile.user_id)).catch(() => null), 200) : []
    return <RecentlyClaimedList wrestlers={wrestlers} seenAt={null} hasStandard={false} />
  }
  return <CoachHomeClient access={loaded.access} data={loaded.data} />
}
