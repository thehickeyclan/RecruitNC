import { createClient } from "@/lib/supabase/server"
import { fetchCommitmentAthletes, type CommitmentAthleteListItem } from "@/lib/athletes-commitments-fetch"
import { withCompetedWeights } from "@/lib/commitments-competed-weight"
import { resolveCollegeLogoUrlMap } from "@/lib/entity-logo-resolve"
import { COLLEGE_LEADERBOARD_MIN_CLASS_YEAR } from "@/lib/colleges"
import { shareMetadata } from "@/lib/share-metadata"
import { CollegeCommitmentsClient } from "./college-commitments-client"

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
  let commitments: Array<CommitmentAthleteListItem & { top_honor?: string | null }> = []
  try {
    const supabase = await createClient()
    const { athletes: everyClass } = await fetchCommitmentAthletes(supabase, { year: "all", gender: "all", division: "all", limit: 500 })
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

  return <CollegeCommitmentsClient commitments={commitments} />
}
