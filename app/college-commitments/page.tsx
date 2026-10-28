import { createClient } from "@/lib/supabase/server"
import { fetchCommitmentAthletes, type CommitmentAthleteListItem } from "@/lib/athletes-commitments-fetch"
import { withCompetedWeights } from "@/lib/commitments-competed-weight"
import { resolveCollegeLogoUrlMap } from "@/lib/entity-logo-resolve"
import { COLLEGE_LEADERBOARD_MIN_CLASS_YEAR } from "@/lib/colleges"
import { shareMetadata } from "@/lib/share-metadata"
import { CollegeCommitmentsClient } from "./college-commitments-client"
import { headers } from "next/headers"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"
import { liveStates, recruitingCoverage } from "@/lib/recruiting/brand"

export const metadata = shareMetadata({
  title: "College Commitments",
  description: "North Carolina wrestlers committed to college: DI, DII, DIII, NAIA and NJCAA.",
  path: "/college-commitments",
  kicker: "RecruitNC",
})

export const revalidate = 120

/**
 * Every commitment, every class, newest first, in one read. The filters run in the browser over
 * this list, so the counts on the division tiles and the rows under them can never disagree (they
 * came from two separate queries before). The read is capped at 500; there are under 200 today.
 */
export default async function CollegeCommitmentsPage() {
  const onRw = stagedBrandForHost((await headers()).get("host")) === "national"
  const states = liveStates(onRw).map((st) => st.code)
  let commitments: Array<CommitmentAthleteListItem & { top_honor?: string | null; state?: string }> = []
  try {
    const supabase = await createClient()
    /*
     * Every live state on RecruitWrestlers, North Carolina alone on NC United (Matt, 28 Oct 2026):
     * a South Carolina commitment reported and approved shows here the day it is.
     */
    const perState = await Promise.all(
      states.map(async (st) => (await fetchCommitmentAthletes(supabase, { year: "all", gender: "all", division: "all", limit: 500, state: st })).athletes.map((a) => ({ ...a, state: st }))),
    )
    const everyClass = perState.flat().sort((a, b) => String(b.commitmentdate ?? "").localeCompare(String(a.commitmentdate ?? "")))
    // The same classes /colleges and /high-schools count, so the three views give one total.
    const athletes = everyClass.filter((a) => a.graduationyear >= COLLEGE_LEADERBOARD_MIN_CLASS_YEAR)
    // Colleges whose row has no logo go through the same resolver the logo APIs use (static
    // files, then logo_mappings): once per college, not once per card as the cards used to.
    const missing = [...new Set(athletes.filter((a) => !a.collegeLogoUrl && a.college).map((a) => a.college))]
    const [withWeights, logos] = await Promise.all([
      withCompetedWeights(athletes),
      resolveCollegeLogoUrlMap(Object.fromEntries(missing.map((name) => [name, [name]]))).catch(() => ({}) as Record<string, string>),
    ])
    commitments = withWeights.map((a) => (a.collegeLogoUrl || !logos[a.college] ? a : { ...a, collegeLogoUrl: logos[a.college] }))
  } catch (error) {
    console.error("[college-commitments] load failed:", error)
  }

  return <CollegeCommitmentsClient commitments={commitments} coverage={recruitingCoverage(onRw)} showState={states.length > 1} />
}
