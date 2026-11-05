import Link from "next/link"

import { RecentlyClaimedList } from "@/components/coach/recently-claimed"
import { viewSubject } from "@/lib/view-as/subject"
import { coachInterestScope } from "@/lib/college-programs/interested-for-coach"
import { claimedSeenAt, loadJustClaimed, markClaimedSeen } from "@/lib/college-programs/just-claimed-for-coach"
import { loadMyRecruits } from "@/lib/my-recruits"
import { resolveFitViewer } from "@/lib/program-fit-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { productName } from "@/lib/recruiting/product-name"

export const dynamic = "force-dynamic"
export const metadata = { title: `Recently claimed | ${productName()}` }

/**
 * Every wrestler claimed in the last 30 days (Matt, 5 Nov 2026): My Recruits shows four, this is
 * all of them, with the state, class, credential and fit filters. Opening it clears the menu's count.
 */
export default async function RecentlyClaimedPage() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  const admin = createAdminClient()
  const subject = user ? await viewSubject(admin, user) : null
  const subjectId = subject?.subjectId ?? ""
  const scope = user ? await coachInterestScope(admin, subjectId) : ({ allowed: false } as const)
  if (!user || !scope.allowed) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center text-white">
        <p className="text-lg font-bold">For approved college coaches</p>
        <p className="mt-2 text-sm text-white/60">Families who just claimed their wrestler&apos;s profile are listed here for approved coaches.</p>
        <Link href="/my-recruits" className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628]">
          My Recruits
        </Link>
      </div>
    )
  }
  const [board, fitViewer, account] = await Promise.all([
    loadMyRecruits(admin, subjectId).catch(() => null),
    resolveFitViewer(admin, subjectId).catch(() => null),
    admin.auth.admin.getUserById(subjectId).then((r) => r.data?.user ?? null, () => null),
  ])
  const onBoard = new Set((board?.recruits ?? []).map((r) => r.athleteId))
  const wrestlers = await loadJustClaimed(admin, scope.schoolId, scope.gender, onBoard, fitViewer, 200).catch(() => [])
  const seenAt = claimedSeenAt(account)
  // Looking as someone else must not clear that coach's count.
  if (!subject?.readOnly) await markClaimedSeen(admin, user.id).catch(() => {})
  return <RecentlyClaimedList wrestlers={wrestlers} seenAt={seenAt} hasStandard={Boolean(fitViewer?.hasStandard)} />
}
