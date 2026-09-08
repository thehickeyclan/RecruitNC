import "server-only"

import { unstable_cache } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { getMergedNchsaaForAthlete } from "@/lib/nchsaa-results"
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

/**
 * Credentials, from the results tables rather than from the ranking board.
 *
 * These pills used to be derived from `buildRecruitNcRankingBoard`, which does per-athlete match,
 * duals and NCHSAA work for a whole class and takes thirty to forty seconds. Once the evidence
 * came off the public page, the entire cost of that board was three words on a badge — and every
 * visitor who arrived after the cache expired waited a minute for them.
 *
 * Two batch queries on `athlete_id` replace it. Pills read the same as the Tournament of
 * Champions field's, because they now come from the same place.
 */
type CredentialSources = {
  state: Map<string, Array<{ year: number; place: number | null }>>
  allAmerican: Map<string, string>
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
  const allAmerican = new Map<string, string>()
  if (athletes.length === 0) return { state, allAmerican }

  const settled = await Promise.all(
    athletes.map(async (athlete) => {
      const id = String(athlete.id)
      try {
        const rows = await getMergedNchsaaForAthlete(admin, athlete as never)
        return [id, rows] as const
      } catch {
        // One athlete failing must not blank the whole class.
        return [id, []] as const
      }
    }),
  )

  for (const [id, rows] of settled) {
    const parsed = rows
      .map((row) => ({
        year: Number(row.year),
        // A zero means qualified and did not place, not first.
        place: row.place == null || Number(row.place) < 1 ? null : Number(row.place),
      }))
      .filter((r) => Number.isFinite(r.year))
    if (parsed.length) state.set(id, parsed)
  }

  const { data: fargoRows } = await admin
    .from("fargo_results")
    .select("athlete_id, year, placement, is_all_american")
    .in("athlete_id", athletes.map((a) => String(a.id)))
    .eq("is_all_american", true)

  for (const row of fargoRows ?? []) {
    const id = String((row as { athlete_id?: unknown }).athlete_id ?? "")
    if (!id || allAmerican.has(id)) continue
    const year = (row as { year?: unknown }).year
    const placement = (row as { placement?: unknown }).placement
    allAmerican.set(id, `${year ?? ""} Fargo ${placement ? `${placement}th` : "All-American"}`.trim())
  }

  return { state, allAmerican }
}

function credentialsFrom(id: string, sources: CredentialSources): PublicRankingCredential[] {
  const out: PublicRankingCredential[] = []
  const aa = sources.allAmerican.get(id)
  if (aa) out.push({ kind: "all-american", label: "All-American", detail: aa })

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

export const loadPublicClassRanking = unstable_cache(
  buildPublicClassRanking,
  ["public-class-ranking"],
  { revalidate: 3600, tags: ["public-rankings"] },
)
