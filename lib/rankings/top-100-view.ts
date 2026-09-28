import "server-only"

import { unstable_cache } from "next/cache"

import { loadAthleteCredentialsBatch } from "@/lib/credentials/athlete-credentials"
import { createAdminClient } from "@/lib/supabase/admin"
import { credentialsFrom, type PublicRankedAthlete } from "@/lib/rankings/public-rankings-view"

/**
 * The Top 75 College Prospects, classes of 2027 and 2028.
 *
 * The Top 75 is drawn from the published class boards, so a wrestler outside his class cut
 * cannot appear on it however he compares - and 2027 is deep enough that five state champions
 * sat in that gap, invisible to a college coach reading the list to find recruits. This board
 * reaches deeper into each class and is the one that answers "who should I be looking at".
 *
 * It is built to never contradict what is already out: every wrestler on the published Top 75
 * is on it, in the same relative order, and within a class the order follows that class's board
 * exactly. See the seeding script for the two rules and the checks that enforce them.
 *
 * Read from `top_100_rankings`, which only a publish writes.
 */

export type TopHundredBoard = {
  published: boolean
  cap: number
  classes: number[]
  publishedAt: string | null
  athletes: PublicRankedAthlete[]
}

/** What publishes. */
export const TOP_100_CAP = 75

async function buildTopHundred(gender: string): Promise<TopHundredBoard> {
  const admin = createAdminClient()

  const { data: published } = await admin
    .from("top_100_rankings")
    .select("athlete_id, rank, published_at")
    .eq("gender", gender)
    .order("rank", { ascending: true })

  const rows = published ?? []
  if (!rows.length) {
    return { published: false, cap: TOP_100_CAP, classes: [], publishedAt: null, athletes: [] }
  }

  const rankOf = new Map(rows.map((r) => [String(r.athlete_id), Number(r.rank)]))
  const ids = [...rankOf.keys()]

  // Chunked: a hundred ids build a longer URL than PostgREST will reliably accept in one go.
  const athleteRows: Array<Record<string, unknown>> = []
  for (let i = 0; i < ids.length; i += 50) {
    const { data } = await admin
      .from("athletes")
      .select(
        [
          "id, name, photourl, headshot_url, highschool, wrestlingClub, weightclass, graduationyear",
          "prospect_ranking, college",
          'wrestling_name, "firstName", "lastName", nhsca_results, super32_results',
        ].join(", "),
      )
      .in("id", ids.slice(i, i + 50))
    athleteRows.push(...((data ?? []) as unknown as Array<Record<string, unknown>>))
  }

  const credentials = await loadAthleteCredentialsBatch(admin, athleteRows)

  const athletes: PublicRankedAthlete[] = athleteRows
    .map((raw) => ({
      athleteId: String(raw.id),
      rank: rankOf.get(String(raw.id)) ?? Number.MAX_SAFE_INTEGER,
      name: String(raw.name ?? "Athlete"),
      photoUrl:
        [raw.photourl, raw.headshot_url].find(
          (v): v is string => typeof v === "string" && v.startsWith("http"),
        ) ?? null,
      highSchool: (raw.highschool as string) || null,
      club: (raw.wrestlingClub as string) || null,
      weightClass: raw.weightclass == null ? null : String(raw.weightclass),
      graduationYear: raw.graduationyear == null ? null : Number(raw.graduationyear),
      /*
       * No movement arrow. This board is new, so there is nothing to have moved from, and
       * `previous_ranking` belongs to the wrestler's class board rather than to this list.
       */
      previousRank: null,
      collegeCommit: (raw.college as string) || null,
      credentials: credentialsFrom(credentials.get(String(raw.id))),
    }))
    .sort((a, b) => a.rank - b.rank)

  const classes = [...new Set(athletes.map((a) => a.graduationYear).filter((y): y is number => y != null))].sort()

  return {
    published: true,
    cap: TOP_100_CAP,
    classes,
    publishedAt: String(rows[0]?.published_at ?? "") || null,
    athletes,
  }
}

/** Bump the version whenever `TopHundredBoard` changes shape. */
export const loadTopHundred = unstable_cache(buildTopHundred, ["public-college-75", "v2"], {
  revalidate: 3600,
  tags: ["public-rankings"],
})
