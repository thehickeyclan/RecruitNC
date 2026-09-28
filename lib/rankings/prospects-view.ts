import "server-only"

import { unstable_cache } from "next/cache"

import { loadAthleteCredentialsBatch } from "@/lib/credentials/athlete-credentials"
import { createAdminClient } from "@/lib/supabase/admin"
import { P4P_PUBLIC_CAP } from "@/lib/rankings/pound-for-pound"
import { credentialsFrom, type PublicRankedAthlete } from "@/lib/rankings/public-rankings-view"

/**
 * The Top 50 North Carolina College Prospects — every class, one list.
 *
 * Internally this is the pound-for-pound board, and that name stays on the admin side where it
 * describes what the engine does: score wrestlers against each other regardless of weight. It is
 * the wrong name to sell. A college coach is not shopping for a pound-for-pound argument, they
 * are asking who the best fifty prospects in North Carolina are, and that is what this is.
 *
 * Read from `p4p_rankings`, which only the Publish button writes. The draft an admin is still
 * moving around lives in `p4p_drafts` and never reaches this page.
 */

export type TopProspect = PublicRankedAthlete

export type TopProspectBoard = {
  published: boolean
  cap: number
  classes: number[]
  publishedAt: string | null
  athletes: TopProspect[]
}

async function buildTopProspects(gender: string): Promise<TopProspectBoard> {
  const admin = createAdminClient()

  const { data: published } = await admin
    .from("p4p_rankings")
    .select("athlete_id, rank, published_at")
    .eq("gender", gender)
    .order("rank", { ascending: true })

  const rows = published ?? []
  if (!rows.length) {
    return { published: false, cap: P4P_PUBLIC_CAP, classes: [], publishedAt: null, athletes: [] }
  }

  const rankOf = new Map(rows.map((r) => [String(r.athlete_id), Number(r.rank)]))
  const ids = [...rankOf.keys()]

  /*
   * Chunked: `.in()` on fifty ids is fine, but this list is capped by policy rather than by
   * anything the database enforces, and a future cap of 200 would build a URL long enough to
   * be rejected rather than truncated.
   */
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

  const athletes: TopProspect[] = athleteRows
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
       * No movement arrow. `previous_ranking` is the wrestler's place in their own class, and
       * showing it beside a cross-class number would read as a rise or fall on this list that
       * never happened.
       */
      previousRank: null,
      collegeCommit: (raw.college as string) || null,
      credentials: credentialsFrom(credentials.get(String(raw.id))),
    }))
    .sort((a, b) => a.rank - b.rank)

  const classes = [...new Set(athletes.map((a) => a.graduationYear).filter((y): y is number => y != null))].sort()

  return {
    published: true,
    cap: P4P_PUBLIC_CAP,
    classes,
    publishedAt: String(rows[0]?.published_at ?? "") || null,
    athletes,
  }
}

/** Bump the version whenever `TopProspectBoard` changes shape; see the class ranking loader for why. */
export const loadTopProspects = unstable_cache(buildTopProspects, ["public-top-prospects", "v4-top75"], {
  revalidate: 3600,
  tags: ["public-rankings"],
})
