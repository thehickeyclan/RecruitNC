import "server-only"

import { unstable_cache } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { buildRecruitNcRankingBoard } from "@/lib/rankings/recruitnc-ranking-engine"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"

/**
 * The public read model for a class ranking — one server-side shape, the way the TOC field has one.
 *
 * The rankings pages were two 560-line client components, one per class, each fetching an API and
 * re-deriving its own layout. They drifted from each other and from the field page, and neither
 * could show why a wrestler sat where they sat. This assembles everything once, on the server,
 * and the page renders it.
 *
 * Ordering is the published `prospect_ranking`, not the engine's live opinion. The engine is what
 * staff review on the admin board before deciding; a public page must show the ranking that was
 * actually decided, or the two would disagree the moment somebody wins a match.
 */

export type PublicRankingCredentialKind = "all-american" | "state-champion" | "state-placer" | "national-ranked"

export type PublicRankingCredential = {
  kind: PublicRankingCredentialKind
  label: string
  /** Tooltip: the specific result behind the pill. */
  detail: string
}

export type PublicRankedAthlete = {
  athleteId: string
  rank: number
  name: string
  photoUrl: string | null
  highSchool: string | null
  club: string | null
  weightClass: string | null
  graduationYear: number | null
  /** Where they sat in the previous published edition, for a movement arrow. */
  previousRank: number | null
  collegeCommit: string | null
  credentials: PublicRankingCredential[]
}

export type PublicClassRanking = {
  year: number
  published: boolean
  cap: number
  athletes: PublicRankedAthlete[]
}

/** Pills read the same as the TOC field's, so the two pages speak one visual language. */
function credentialsFor(evidence: Array<{ kind: string; label: string }>): PublicRankingCredential[] {
  const out: PublicRankingCredential[] = []
  const titles = evidence.find((e) => /NCHSAA title/i.test(e.label))
  const placer = evidence.find((e) => /NCHSAA (best finish|state)/i.test(e.label))
  const allAmerican = evidence.find((e) => /\b(1st|2nd|3rd|[4-8]th)\b/.test(e.label) && /NHSCA|Fargo/i.test(e.label))

  if (allAmerican) out.push({ kind: "all-american", label: "All-American", detail: allAmerican.label })
  if (titles) out.push({ kind: "state-champion", label: "State champ", detail: titles.label })
  else if (placer) out.push({ kind: "state-placer", label: "State placer", detail: placer.label })
  return out
}

/**
 * Uncached build. Expensive: the evidence comes from the staff ranking board, which does
 * per-athlete match, duals and NCHSAA work and takes thirty to forty seconds for a full class.
 * That is fine for one admin reviewing a board and impossible on a public page, hence the cache
 * around it. A published ranking changes when staff publish one, which is monthly at most.
 */
async function buildPublicClassRanking(year: number): Promise<PublicClassRanking> {
  const cap = getPublicRankingsMax(year)
  if (!isPublicRankingsYearPublished(year)) {
    return { year, published: false, cap, athletes: [] }
  }

  const admin = createAdminClient()
  const [{ data: rows }, board] = await Promise.all([
    admin
      .from("athletes")
      .select(
        // No RankWrestler column exists on `athletes`. The ranking engine reads
        // `rankwrestler_rank`, `rank_wrestler_rank` and `rw_rank`, none of which are columns, so
        // its rankWrestler component has always scored zero for everyone. Selecting it here made
        // the whole query fail and the page render empty.
        "id, name, photourl, headshot_url, highschool, wrestlingClub, weightclass, graduationyear, prospect_ranking, previous_ranking, college, rankings",
      )
      .eq("graduationyear", year)
      .eq("is_nc_athlete", true)
      .not("prospect_ranking", "is", null)
      .lte("prospect_ranking", cap)
      .order("prospect_ranking", { ascending: true }),
    // Evidence only. The engine's ordering is deliberately not used here — see the note above.
    buildRecruitNcRankingBoard({ supabase: admin, year: String(year), gender: "Male" }).catch(() => []),
  ])

  const evidenceById = new Map(board.map((entry) => [String(entry.id), entry.evidence ?? []]))

  const athletes: PublicRankedAthlete[] = (rows ?? []).map((row) => {
    const raw = row as Record<string, unknown>
    const evidence = (evidenceById.get(String(raw.id)) ?? []) as Array<{ kind: string; label: string; tone?: string }>
    return {
      athleteId: String(raw.id),
      rank: Number(raw.prospect_ranking),
      name: String(raw.name ?? "Athlete"),
      photoUrl: [raw.photourl, raw.headshot_url].find(
        (v): v is string => typeof v === "string" && v.startsWith("http"),
      ) ?? null,
      highSchool: (raw.highschool as string) || null,
      club: (raw.wrestlingClub as string) || null,
      weightClass: raw.weightclass == null ? null : String(raw.weightclass),
      graduationYear: raw.graduationyear == null ? null : Number(raw.graduationyear),
      previousRank: raw.previous_ranking == null ? null : Number(raw.previous_ranking),
      collegeCommit: (raw.college as string) || null,
      /**
       * Credentials only. The board's evidence — records, named quality wins, direct wins over
       * other ranked wrestlers — is staff-facing and never leaves the admin board, so it is used
       * here to derive the pills and then discarded rather than serialized to the browser.
       */
      credentials: credentialsFor(evidence),
    }
  })

  return { year, published: true, cap, athletes }
}

export const loadPublicClassRanking = unstable_cache(
  buildPublicClassRanking,
  ["public-class-ranking"],
  { revalidate: 3600, tags: ["public-rankings"] },
)
