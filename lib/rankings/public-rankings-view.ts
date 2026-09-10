import "server-only"

import { unstable_cache } from "next/cache"

import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { loadPublicAthleteNationalTeamData } from "@/lib/load-public-athlete-profile"
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

export type PublicRankingCredentialKind =
  | "all-american"
  | "state-champion"
  | "state-placer"
  | "national-placer"
  | "national-qualifier"
  | "national-team"
  | "significant-win"
  | "national-ranked"

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
 * Credentials, from the results tables rather than from the ranking board.
 *
 * These pills used to be derived from `buildRecruitNcRankingBoard`, which does per-athlete match,
 * duals and NCHSAA work for a whole class and takes thirty to forty seconds. Once the evidence
 * came off the public page, the entire cost of that board was three words on a badge — and every
 * visitor who arrived after the cache expired waited a minute for them.
 *
 * The shared name-, school-, and graduation-year-aware tournament lookups provide the pills.
 * That matters because many verified bracket rows predate athlete profiles and have no
 * `athlete_id`; an ID-only query silently drops legitimate credentials.
 */
type CredentialSources = {
  state: Map<string, Array<{ year: number; place: number | null }>>
  allAmerican: Map<string, { count: number; detail: string }>
  nationalPlacements: Map<string, Array<{ event: string; year: number; place: number }>>
  nationalQualifiers: Map<string, Array<{ event: string; year: number }>>
  nationalTeam: Map<string, number>
  significantWins: Map<string, number>
}

function nationalPlacement(value: unknown): number | null {
  const text = String(value ?? "").trim()
  if (!text) return null
  if (/champ/i.test(text)) return 1
  if (/runner|finalist/i.test(text)) return 2
  const match = text.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\b/i)
  if (!match) return null
  const place = Number(match[1])
  return Number.isInteger(place) && place >= 1 && place <= 8 ? place : null
}

function isFargoFreestyle(division: unknown): boolean {
  return /\b(?:freestyle|fs)\b/i.test(String(division ?? ""))
}

/**
 * The same lookup the Tournament of Champions field board uses, per athlete.
 *
 * An earlier version batched two queries on `wrestling_nchsaa_results.athlete_id` because it was
 * fast. That column is populated for 598 of 10,702 rows, so anyone whose bracket name differs
 * from their roster name got nothing: Holt Quincy is a two-time state champion and showed as a
 * state placer. `getMergedNchsaaForAthlete` reconciles a name against the athlete's school and
 * the seasons they could have wrestled, which is why the field board has him right.
 *
 * It costs a few queries per athlete rather than two for the class. That is the correct trade —
 * the whole page is cached, and a credential that is wrong is worth nothing however fast it loads.
 */
async function loadCredentialSources(
  admin: ReturnType<typeof createAdminClient>,
  athletes: Array<Record<string, unknown>>,
): Promise<CredentialSources> {
  const state = new Map<string, Array<{ year: number; place: number | null }>>()
  const allAmerican = new Map<string, { count: number; detail: string }>()
  const nationalPlacements = new Map<string, Array<{ event: string; year: number; place: number }>>()
  const nationalQualifiers = new Map<string, Array<{ event: string; year: number }>>()
  const nationalTeam = new Map<string, number>()
  const significantWins = new Map<string, number>()
  if (athletes.length === 0) {
    return { state, allAmerican, nationalPlacements, nationalQualifiers, nationalTeam, significantWins }
  }

  const settled = await Promise.all(
    athletes.map(async (athlete) => {
      const id = String(athlete.id)
      try {
        // One canonical bundle for every tournament source. Profiles, Data Dawg, the admin
        // ranking engine and this public page therefore resolve identity the same way.
        const [bundle, team] = await Promise.all([
          loadAthleteTournamentBundle(admin, athlete, { nhscaAllTime: true }),
          loadPublicAthleteNationalTeamData(admin, athlete),
        ])
        return { id, bundle, team }
      } catch {
        // One athlete failing must not blank the whole class.
        return {
          id,
          bundle: { nchsaa: [], nhsca: [], super32: [], fargo: [], other: [] },
          team: { nationalTeamResults: [], qualityWins: [] },
        }
      }
    }),
  )

  for (const { id, bundle, team } of settled) {
    const parsed = bundle.nchsaa
      .map((row) => ({
        year: Number(row.year),
        // A zero means qualified and did not place, not first.
        place: row.place == null || Number(row.place) < 1 ? null : Number(row.place),
      }))
      .filter((r) => Number.isFinite(r.year))
    if (parsed.length) state.set(id, parsed)

    const finishes = [
      ...bundle.nhsca
        .filter((result) => nationalPlacement(result.placement) != null)
        .map((result) => ({ year: result.year, detail: `${result.year} NHSCA ${result.placement}` })),
      ...bundle.fargo
        // Match the TOC/admin definition: Fargo freestyle podium finishes count here.
        .filter((result) => isFargoFreestyle(result.division) && nationalPlacement(result.placement) != null)
        .map((result) => ({ year: result.year, detail: `${result.year} Fargo ${result.placement}` })),
    ].sort((a, b) => b.year - a.year)

    if (finishes.length) {
      allAmerican.set(id, {
        count: finishes.length,
        detail: finishes.map((finish) => finish.detail).join(" · "),
      })
    }

    const placements = [
      ...bundle.super32
        .map((result) => ({ event: "Super 32", year: result.year, place: nationalPlacement(result.placement) }))
        .filter((result): result is { event: string; year: number; place: number } => result.place != null),
      ...bundle.other
        .filter((result) => result.placement != null)
        .map((result) => ({ event: result.eventShortName || result.eventName, year: result.year, place: Number(result.placement) })),
    ]
    if (placements.length) nationalPlacements.set(id, placements)

    const qualifiers = bundle.other
      .filter((result) => result.qualified)
      .map((result) => ({ event: result.eventShortName || result.eventName, year: result.year }))
    if (qualifiers.length) nationalQualifiers.set(id, qualifiers)

    if (team.nationalTeamResults.length) nationalTeam.set(id, team.nationalTeamResults.length)
    const qualityWinCount = team.qualityWins.reduce((total, block) => total + block.wins.length, 0)
    if (qualityWinCount) significantWins.set(id, qualityWinCount)
  }

  return { state, allAmerican, nationalPlacements, nationalQualifiers, nationalTeam, significantWins }
}

function credentialsFrom(id: string, sources: CredentialSources): PublicRankingCredential[] {
  const out: PublicRankingCredential[] = []
  const aa = sources.allAmerican.get(id)
  if (aa) {
    out.push({
      kind: "all-american",
      label: aa.count > 1 ? `${aa.count}X All-American` : "All-American",
      detail: aa.detail,
    })
  }

  const rows = sources.state.get(id) ?? []
  const titles = rows.filter((r) => r.place === 1)
  const placements = rows.filter((r) => r.place != null && r.place > 1 && r.place <= 8)

  if (titles.length) {
    out.push({
      kind: "state-champion",
      label: titles.length > 1 ? `${titles.length}X State champ` : "State champ",
      detail: titles.map((t) => `${t.year} state champion`).join(" · "),
    })
    // A champion who also placed in another year has both worth showing.
    if (placements.length) {
      out.push({
        kind: "state-placer",
        label: placements.length > 1 ? `${placements.length}X State placer` : "State placer",
        detail: placements.map((p) => `${p.year} ${p.place} place`).join(" · "),
      })
    }
  } else if (placements.length) {
    out.push({
      kind: "state-placer",
      label: placements.length > 1 ? `${placements.length}X State placer` : "State placer",
      detail: placements.map((p) => `${p.year} ${p.place} place`).join(" · "),
    })
  }

  const nationalPlacements = sources.nationalPlacements.get(id) ?? []
  if (nationalPlacements.length) {
    const only = nationalPlacements[0]
    out.push({
      kind: "national-placer",
      label:
        nationalPlacements.length > 1
          ? `${nationalPlacements.length}X National placer`
          : `${only.event} ${only.place === 1 ? "champ" : "placer"}`,
      detail: nationalPlacements.map((r) => `${r.year} ${r.event} — ${r.place}`).join(" · "),
    })
  }

  const qualifiers = sources.nationalQualifiers.get(id) ?? []
  if (qualifiers.length) {
    out.push({
      kind: "national-qualifier",
      label: qualifiers.length > 1 ? `${qualifiers.length}X Super 32 qualifier` : "Super 32 qualifier",
      detail: qualifiers.map((r) => `${r.year} ${r.event}`).join(" · "),
    })
  }

  const nationalTeamAppearances = sources.nationalTeam.get(id) ?? 0
  if (nationalTeamAppearances) {
    out.push({
      kind: "national-team",
      label: "NC United National Team",
      detail: `${nationalTeamAppearances} national team ${nationalTeamAppearances === 1 ? "event" : "events"} on file`,
    })
  }

  const significantWinCount = sources.significantWins.get(id) ?? 0
  if (significantWinCount) {
    out.push({
      kind: "significant-win",
      label: significantWinCount > 1 ? `${significantWinCount} significant wins` : "Significant win",
      detail: `Verified wins over state champions, state placers, or nationally credentialed opponents`,
    })
  }
  return out
}

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
        "id, name, photourl, headshot_url, highschool, wrestlingClub, weightclass, graduationyear, prospect_ranking, previous_ranking, college",
      )
      .eq("graduationyear", year)
      .eq("is_nc_athlete", true)
      .not("prospect_ranking", "is", null)
      .lte("prospect_ranking", cap)
      .order("prospect_ranking", { ascending: true })

  const sources = await loadCredentialSources(admin, (rows ?? []) as Array<Record<string, unknown>>)

  const athletes: PublicRankedAthlete[] = (rows ?? []).map((row) => {
    const raw = row as Record<string, unknown>
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
      credentials: credentialsFrom(String(raw.id), sources),
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
const PUBLIC_RANKING_CACHE_VERSION = "v4-canonical-accolade-bundle"

export const loadPublicClassRanking = unstable_cache(
  buildPublicClassRanking,
  ["public-class-ranking", PUBLIC_RANKING_CACHE_VERSION],
  { revalidate: 3600, tags: ["public-rankings"] },
)
