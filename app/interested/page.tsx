import Link from "next/link"

import { viewSubject } from "@/lib/view-as/subject"
import { coachInterestScope, loadInterested, markInterestSeen } from "@/lib/college-programs/interested-for-coach"
import { loadMyRecruits } from "@/lib/my-recruits"
import { resolveFitViewer } from "@/lib/program-fit-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import InterestedClient from "./interested-client"
import { productName } from "@/lib/recruiting/product-name"

export const dynamic = "force-dynamic"
export const metadata = { title: `Interested in your program | ${productName()}` }

/**
 * Every wrestler whose family told this program they are interested (Matt, 21 Oct 2026: "should
 * we have a left menu item where they can view all?"). Coach Home shows the newest twelve; this is
 * all of them, with the class, room and fit filters. Opening it clears the menu's count.
 */
export default async function InterestedPage() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  const admin = createAdminClient()
  // The coach being viewed, for an admin or business account; otherwise the signed-in coach.
  const subject = user ? await viewSubject(admin, user) : null
  const subjectId = subject?.subjectId ?? ""
  const scope = user ? await coachInterestScope(admin, subjectId) : ({ allowed: false } as const)
  if (!user || !scope.allowed) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center text-white">
        <p className="text-lg font-bold">For approved college coaches</p>
        <p className="mt-2 text-sm text-white/60">Families choose to tell a program they are interested; its approved coaches see them here.</p>
        <Link href="/coach-home" className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628]">
          Coach Home
        </Link>
      </div>
    )
  }
  const [board, fitViewer] = await Promise.all([loadMyRecruits(admin, subjectId).catch(() => null), resolveFitViewer(admin, subjectId).catch(() => null)])
  const onBoard = new Set((board?.recruits ?? []).map((r) => r.athleteId))
  const wrestlers = scope.schoolId ? await loadInterested(admin, scope.schoolId, scope.gender, onBoard, fitViewer).catch(() => []) : []
  // Looking as someone else must not clear that coach's new-interest count.
  if (!subject?.readOnly) await markInterestSeen(admin, user.id).catch(() => {})
  return <InterestedClient wrestlers={wrestlers} program={scope.program} seenAt={scope.seenAt} hasStandard={Boolean(fitViewer?.hasStandard)} />
}
