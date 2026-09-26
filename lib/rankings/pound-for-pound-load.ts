/**
 * Assembling the pound-for-pound list from what we hold.
 *
 * The engine in `pound-for-pound.ts` decides the order; this decides what it is shown. Keeping
 * them apart is what makes the engine testable — every rule in it is pinned by a test that hands
 * it plain objects, and none of those tests needs a database.
 *
 * The one thing worth knowing here: this reads `ranking_drafts` rather than the published
 * `athletes.prospect_ranking`, because the working order is what an admin is reviewing against.
 * A class the boards have not published yet still has a draft, and leaving it out would mean the
 * list silently covered two classes instead of three.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  buildPoundForPound,
  type PoundForPoundEntry,
  type PoundForPoundInput,
  type PoundForPoundMeeting,
} from "./pound-for-pound"

/** The season this list scores. Nothing before it counts, which is the point of the list. */
export const P4P_SEASON = 2026
export const P4P_SEASON_LABEL = "2025-26"

/** Classes still in high school. A graduated class has no season here to score. */
export const P4P_CLASSES = [2027, 2028, 2029] as const

/** How deep into each class board to look. Below this the order is a pool, not a ranking. */
export const P4P_CLASS_DEPTH = 30

/**
 * PostgREST returns a thousand rows and says nothing about the ones it dropped, so every fetch
 * that could exceed it pages explicitly. Three classes of bouts cleared it on the first run.
 */
async function fetchAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data } = await run(from, from + page - 1)
    if (!data?.length) break
    out.push(...data)
    if (data.length < page) break
  }
  return out
}

/** `.in()` on a long id list makes an unwieldy URL, so it goes in chunks. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function bestPlace(places: ReadonlyArray<unknown>): number | null {
  const valid = places.map(Number).filter((n) => Number.isFinite(n) && n >= 1)
  return valid.length ? Math.min(...valid) : null
}

/**
 * Super 32 Early Entry is a separate tournament from Super 32, and treating its winners as
 * national placers put four wrestlers with no NHSCA placement at all into the top fifteen.
 */
function isNationalEvent(name: string): boolean {
  if (/early entry/i.test(name)) return false
  return /fargo/i.test(name) || /super\s*32/i.test(name)
}

function isTocEvent(name: string): boolean {
  return /tournament of champions/i.test(name)
}

export type PoundForPoundBoard = {
  entries: PoundForPoundEntry[]
  meta: {
    season: number
    pool: number
    meetings: number
    classes: number[]
    scoredAt: string
  }
}

export async function buildPoundForPoundBoard(options: {
  supabase: SupabaseClient
  gender?: string
  classes?: readonly number[]
  depth?: number
}): Promise<PoundForPoundBoard> {
  const { supabase } = options
  const gender = options.gender ?? "Male"
  const classes = [...(options.classes ?? P4P_CLASSES)]
  const depth = options.depth ?? P4P_CLASS_DEPTH

  const drafts = await fetchAll<{ athlete_id: string; rank: number; class_year: number }>(
    (from, to) =>
      supabase
        .from("ranking_drafts")
        .select("athlete_id, rank, class_year")
        .in("class_year", classes)
        .eq("gender", gender)
        .lte("rank", depth)
        .range(from, to),
  )
  const classRankOf = new Map(drafts.map((d) => [String(d.athlete_id), Number(d.rank)]))
  const ids = [...classRankOf.keys()]
  if (!ids.length) {
    return {
      entries: [],
      meta: { season: P4P_SEASON, pool: 0, meetings: 0, classes, scoredAt: new Date().toISOString() },
    }
  }

  const [athletes, stateRows, tournamentRows, matchRows, nhscaRows] = await Promise.all([
    (async () => {
      const out: Array<{ id: string; name: string; graduationyear: number; highschool: string | null; weightclass: string | null }> = []
      for (const part of chunk(ids, 100)) {
        const { data } = await supabase
          .from("athletes")
          .select("id, name, graduationyear, highschool, weightclass")
          .in("id", part)
        out.push(...((data ?? []) as typeof out))
      }
      return out
    })(),
    (async () => {
      const out: Array<{ athlete_id: string; place: number | null }> = []
      for (const part of chunk(ids, 100)) {
        const { data } = await supabase
          .from("wrestling_nchsaa_results")
          .select("athlete_id, place")
          .eq("year", P4P_SEASON)
          .in("athlete_id", part)
        out.push(...((data ?? []) as typeof out))
      }
      return out
    })(),
    (async () => {
      const out: Array<{ athlete_id: string; event_short_name: string | null; placement: number | null }> = []
      for (const part of chunk(ids, 100)) {
        const { data } = await supabase
          .from("other_tournament_results")
          .select("athlete_id, event_short_name, placement")
          .eq("year", P4P_SEASON)
          .in("athlete_id", part)
        out.push(...((data ?? []) as typeof out))
      }
      return out
    })(),
    (async () => {
      const out: Array<{ athlete_id: string; wins: number | null; losses: number | null }> = []
      for (const part of chunk(ids, 100)) {
        const { data } = await supabase
          .from("matches")
          .select("athlete_id, wins, losses")
          .eq("season", P4P_SEASON_LABEL)
          .in("athlete_id", part)
        out.push(...((data ?? []) as typeof out))
      }
      return out
    })(),
    (async () => {
      const out: Array<{ athlete_id: string; placement: number | null; division: string | null }> = []
      for (const part of chunk(ids, 100)) {
        const { data } = await supabase
          .from("nhsca_placements")
          .select("athlete_id, placement, division")
          .eq("year", P4P_SEASON)
          .in("athlete_id", part)
        out.push(...((data ?? []) as typeof out))
      }
      return out
    })(),
  ])

  const group = <T extends { athlete_id: string }>(rows: T[]): Map<string, T[]> => {
    const map = new Map<string, T[]>()
    for (const row of rows) {
      const key = String(row.athlete_id)
      const held = map.get(key) ?? []
      held.push(row)
      map.set(key, held)
    }
    return map
  }
  const stateBy = group(stateRows)
  const tournamentBy = group(tournamentRows)
  const matchBy = group(matchRows)
  const nhscaBy = group(nhscaRows)

  const inputs: PoundForPoundInput[] = athletes.map((athlete) => {
    const id = String(athlete.id)
    const tournaments = tournamentBy.get(id) ?? []
    const nhsca = nhscaBy.get(id) ?? []
    const record = (matchBy.get(id) ?? [])[0]
    /*
     * The division of their *best* NHSCA finish, because that is the finish being scored. Taking
     * any division would let a deep run in one bracket be discounted by an entry in another.
     */
    const bestNhsca = nhsca
      .filter((row) => Number(row.placement) >= 1)
      .sort((a, b) => Number(a.placement) - Number(b.placement))[0]
    return {
      id,
      name: String(athlete.name ?? "Unnamed"),
      graduationYear: Number(athlete.graduationyear),
      classRank: classRankOf.get(id) ?? null,
      statePlace: bestPlace((stateBy.get(id) ?? []).map((row) => row.place)),
      nationalPlace: bestPlace([
        ...nhsca.map((row) => row.placement),
        ...tournaments.filter((row) => isNationalEvent(String(row.event_short_name ?? ""))).map((row) => row.placement),
      ]),
      nationalDivision: (bestNhsca?.division as PoundForPoundInput["nationalDivision"]) ?? null,
      tocPlace: bestPlace(
        tournaments.filter((row) => isTocEvent(String(row.event_short_name ?? ""))).map((row) => row.placement),
      ),
      wins: Number(record?.wins ?? 0),
      losses: Number(record?.losses ?? 0),
    }
  })

  const inPool = new Set(ids)
  const meetings: PoundForPoundMeeting[] = []
  for (const part of chunk(ids, 40)) {
    const bouts = await fetchAll<{
      athlete_id: string
      opponent_id: string | null
      win: boolean | null
      event_date: string | null
      event_name: string | null
    }>((from, to) =>
      supabase
        .from("other_tournament_bouts")
        .select("athlete_id, opponent_id, win, event_date, event_name")
        .in("athlete_id", part)
        .not("opponent_id", "is", null)
        .range(from, to),
    )
    for (const bout of bouts) {
      const opponentId = String(bout.opponent_id)
      if (!inPool.has(opponentId)) continue
      meetings.push(
        bout.win
          ? { winnerId: String(bout.athlete_id), loserId: opponentId, date: bout.event_date, event: bout.event_name }
          : { winnerId: opponentId, loserId: String(bout.athlete_id), date: bout.event_date, event: bout.event_name },
      )
    }
  }

  return {
    entries: buildPoundForPound(inputs, meetings),
    meta: {
      season: P4P_SEASON,
      pool: inputs.length,
      meetings: meetings.length,
      classes,
      scoredAt: new Date().toISOString(),
    },
  }
}
