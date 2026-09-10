import "server-only"

import { unstable_cache } from "next/cache"

import {
  loadAthleteCredentialsBatch,
  ordinal,
  type AthleteCredentials,
} from "@/lib/credentials/athlete-credentials"
import { createAdminClient } from "@/lib/supabase/admin"
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

/**
 * The only three credentials a public card carries. Narrowed deliberately: a wider union let
 * seven pills onto a card and buried the two that decide a ranking.
 */
export type PublicRankingCredentialKind = "all-american" | "state-champion" | "state-placer"

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

/**
 * Credentials come from the one shared engine, not from a derivation of this page's own.
 *
 * This file used to reconstruct All-American and state credentials itself, and the Tournament of
 * Champions field did the same thing differently. The two disagreed about real wrestlers: this
 * page filtered Fargo to freestyle, so Aaron Ellison's Greco-Roman All-American showed on the TOC
 * field and not here. Neither rule was ever decided — each was an artefact of which page was
 * written first.
 *
 * {@link loadAthleteCredentialsBatch} is now the only place that answers the question.
 */
function credentialsFrom(held: AthleteCredentials | undefined): PublicRankingCredential[] {
  const out: PublicRankingCredential[] = []
  if (!held) return out

  if (held.allAmerican.length) {
    out.push({
      kind: "all-american",
      label: held.allAmerican.length > 1 ? `${held.allAmerican.length}X All-American` : "All-American",
      detail: held.allAmerican.map((f) => `${f.year} ${f.event} ${ordinal(f.place)}`).join(" · "),
    })
  }

  const titles = held.state.filter((r) => r.place === 1)
  const placements = held.state.filter((r) => r.place != null && r.place > 1 && r.place <= 8)

  if (titles.length) {
    out.push({
      kind: "state-champion",
      label: titles.length > 1 ? `${titles.length}X State champ` : "State champ",
      detail: titles.map((t) => `${t.year} state champion`).join(" · "),
    })
  }
  // A champion who also placed in another year has both worth showing.
  if (placements.length) {
    out.push({
      kind: "state-placer",
      label: placements.length > 1 ? `${placements.length}X State placer` : "State placer",
      detail: placements.map((p) => `${p.year} ${ordinal(p.place!)} place`).join(" · "),
    })
  }

  /**
   * Three credentials, and no more.
   *
   * National placer, Super 32 qualifier, national team and significant wins were all shown too,
   * so a card could carry seven pills and the two that decide a ranking — All-American and state
   * title — were lost in the middle of them. A reader scanning a top thirty is comparing
   * wrestlers, and comparison needs the same small set on every card.
   *
   * The data behind the others is still collected and still scores; it is simply not a pill.
   */
  return out
}

/**
 * The columns the shared matcher needs, on top of what the card renders.
 *
 * An allowlist rather than `select("*")`: this table also carries GPA, contact details and staff
 * evaluation notes, none of which belong anywhere near a public page.
 */
const IDENTITY_COLUMNS = ["wrestling_name", '"firstName"', '"lastName"', "nhsca_results", "super32_results"] as const

async function buildPublicClassRanking(year: number): Promise<PublicClassRanking> {
  const cap = getPublicRankingsMax(year)
  if (!isPublicRankingsYearPublished(year)) {
    return { year, published: false, cap, athletes: [] }
  }

  const admin = createAdminClient()
  const { data: rows } = await 
    admin
      .from("athletes")
      .select(
        // No RankWrestler column exists on `athletes`. The ranking engine reads
        // `rankwrestler_rank`, `rank_wrestler_rank` and `rw_rank`, none of which are columns, so
        // its rankWrestler component has always scored zero for everyone. Selecting it here made
        // the whole query fail and the page render empty.
        [
          "id, name, photourl, headshot_url, highschool, wrestlingClub, weightclass, graduationyear",
          "prospect_ranking, previous_ranking, college",
          ...IDENTITY_COLUMNS,
        ].join(", "),
      )
      .eq("graduationyear", year)
      .eq("is_nc_athlete", true)
      .not("prospect_ranking", "is", null)
      .lte("prospect_ranking", cap)
      .order("prospect_ranking", { ascending: true })

  const credentials = await loadAthleteCredentialsBatch(admin, (rows ?? []) as unknown as Array<Record<string, unknown>>)

  const athletes: PublicRankedAthlete[] = (rows ?? []).map((row) => {
    const raw = row as unknown as Record<string, unknown>
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
       * Credentials only. Records, named quality wins and direct wins over other ranked
       * wrestlers stay on the admin board and never reach the browser.
       */
      credentials: credentialsFrom(credentials.get(String(raw.id))),
    }
  })

  return { year, published: true, cap, athletes }
}

/**
 * The key carries a version.
 *
 * `unstable_cache` keys on the name and arguments, not on what the function returns, so changing
 * the shape leaves every stale entry valid for its full hour — All-American pills were added and
 * the page kept serving a payload built before they existed. Bump this whenever the returned
 * shape changes.
 */
const PUBLIC_RANKING_CACHE_VERSION = "v6-shared-credential-engine"

export const loadPublicClassRanking = unstable_cache(
  buildPublicClassRanking,
  ["public-class-ranking", PUBLIC_RANKING_CACHE_VERSION],
  { revalidate: 3600, tags: ["public-rankings"] },
)
