import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { loadPublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { loadStatePlacerIndex } from "@/lib/state-placers"
import { buildScoutingReport, loadOpponentIndex } from "@/lib/scouting-report"
import { writeSummary } from "@/lib/scouting-report-summary"
import { scoutingReportAvailable } from "@/lib/scouting-report-access"
import { ScoutingReportDocument } from "@/app/athletes/[id]/scouting-report/scouting-report-client"

/**
 * One real scouting report, on an unlisted page, for the college coach outreach to link to.
 *
 * Coaches will not sign up for a document they have never seen, and describing it in an e-mail
 * does not work — the thing that sells it is the page itself: who he beat, who beat him, and what
 * those opponents had done. So this is the genuine article built by the same pipeline as the gated
 * one, not a mock-up that could drift from what a coach actually receives.
 *
 * Shown with the wrestler's and his family's permission, and sent only to college coaching staff.
 *
 * Unlisted rather than secret: nothing links here and it is marked noindex, but a URL in an e-mail
 * is not access control. That is the reason it is pinned to one consenting athlete rather than
 * taking an id from the address bar — an open sample route would hand out a report on any wrestler
 * in the database to anyone who could paste a uuid.
 */

/** Luke Richards, Class of 2028, Cardinal Gibbons. Permission on file. */
const SAMPLE_ATHLETE_ID = "1a2d638e-5978-45d4-b6c8-bc95ba754367"

export const metadata: Metadata = {
  title: "Scouting report | RecruitNC",
  /* A recruiting document about a minor is never indexed, sample or not. */
  robots: { index: false, follow: false },
}

/* Rebuilt hourly: fresh enough to stay true, cached enough that a mailshot cannot hammer it. */
export const revalidate = 3600

export default async function SampleScoutingReportPage() {
  const admin = createAdminClient()
  const loaded = await loadPublicAthleteProfile(SAMPLE_ATHLETE_ID, admin)
  if (!loaded.ok) notFound()
  if (!scoutingReportAvailable(loaded.athlete as Record<string, unknown>)) notFound()

  /* The same index the gated report and the profile use, so none of the three can disagree. */
  const [baseIndex, stateIndex] = await Promise.all([
    loadOpponentIndex(admin),
    loadStatePlacerIndex(admin, new Date(), { outOfState: true }).catch(() => ({
      statePlacers: [],
      stateSchools: [],
      fargoAllAmericans: [],
    })),
  ])

  const report = await buildScoutingReport(
    admin,
    loaded.athlete as Record<string, unknown>,
    { ...baseIndex, ...stateIndex },
    "full",
    "Sample copy · NC United / RecruitNC",
  )
  const summary = await writeSummary(report)

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Says what this is before a coach wonders why they can read it. Hidden when printed. */}
      <div className="print:hidden border-b border-[#D3B574]/30 bg-[#0f1c2e] px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D3B574]">
            Sample scouting report
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            This is a real RecruitNC scouting report, shared with the wrestler&apos;s family&apos;s
            permission. College coaches get one of these on any North Carolina wrestler, free.{" "}
            <a
              href="/auth/coach-signup"
              className="font-semibold text-[#D3B574] underline underline-offset-2 hover:text-[#e2c98d]"
            >
              Get your free coach access
            </a>
            .
          </p>
        </div>
      </div>

      <ScoutingReportDocument report={{ ...report, summary }} athleteId={SAMPLE_ATHLETE_ID} />
    </div>
  )
}
