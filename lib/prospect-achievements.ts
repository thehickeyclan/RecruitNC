/**
 * What a wrestler has actually won, read from the tables that hold it.
 *
 * The directory's achievement filter read three JSON blobs off the athlete row —
 * `state_results`, `nhsca_results`, `super32_results`. Two of them are sparse and the first does
 * not exist as a column at all, so every state check compared against `undefined` and returned
 * nothing. Filtering by "State Champion" produced two wrestlers out of two hundred and sixty.
 *
 * Meanwhile the canonical tables held state results for 144 of those same athletes, and
 * everything imported this month — NHSCA bouts, TOC results, state brackets — went into them and
 * was invisible here.
 *
 * So this reads the same sources the rankings and profiles read. A filter that disagrees with
 * the profile it links to is worse than no filter: it tells a college coach a state champion
 * does not exist.
 */
import type { SupabaseClient } from "@supabase/supabase-js"

export type AchievementLevel =
  | "all-american"
  | "state-champion"
  | "state-placer"
  | "state-qualifier"
  | "dnq"

export type AchievementFacts = {
  /** Best NCHSAA finish, 1 for a title. */
  bestStatePlace?: number | null
  /** Did they wrestle at states at all, placed or not? */
  stateQualifier?: boolean
  /** Best NHSCA Nationals finish. */
  bestNhscaPlace?: number | null
  /** Best Super 32 finish. */
  bestSuper32Place?: number | null
  /** Top-eight finishes at the national events below, e.g. "Fargo 2025", read from the brackets. */
  nationalPodiums?: string[]
}

/**
 * The events whose top eight is All-American (Matt, 29 Oct 2026): Super 32, Fargo, NHSCA, Ironman,
 * Powerade, Beast of the East and National Preps, and for girls their own - Fargo, NHSCA, Super 32,
 * Ironman Women, National Preps girls and USAW Women's Nationals (U17 and U20). Super 32's
 * early-entry qualifiers are separate events and are not.
 */
const AA_EVENTS: Array<[RegExp, string]> = [
  [/^super32-20\d\d$/, "Super 32"],
  [/^fargo-/, "Fargo"],
  [/^nhsca-nationals-/, "NHSCA"],
  [/^ironman-women-/, "Ironman"],
  [/^ironman-20/, "Ironman"],
  [/^powerade-/, "Powerade"],
  [/^beast-of-the-east-/, "Beast of the East"],
  [/^national-preps-/, "National Preps"],
  [/^usaw-womens-nationals-20\d\d-u(17|20)-/, "USAW Women's Nationals"],
]
const AA_EVENT_FILTER = [
  "event_key.like.super32-20%",
  "event_key.like.fargo-%",
  "event_key.like.nhsca-nationals-%",
  "event_key.like.ironman-%",
  "event_key.like.powerade-%",
  "event_key.like.beast-of-the-east-%",
  "event_key.like.national-preps-%",
  "event_key.like.usaw-womens-nationals-%",
].join(",")
/** Only the placement matches decide a finish, so only they are fetched. */
const PLACEMENT_ROUND_FILTER = "round.ilike.%place%,round.ilike.final%,round.ilike.championship%"

/** Winner's place and loser's place in each placement match (as lib/national-results-from-bouts.ts reads them). */
const PLACEMENT_ROUNDS: Array<[RegExp, number, number]> = [
  [/^(1st place( match)?|finals?|championship( final)?)$/i, 1, 2],
  [/^3rd place( match)?$/i, 3, 4],
  [/^5th place( match)?$/i, 5, 6],
  [/^7th place( match)?$/i, 7, 8],
]
export function placementFromRounds(bouts: ReadonlyArray<{ round: string | null; win: boolean | null; is_bye: boolean | null }>): number | null {
  for (const b of bouts) {
    if (b.is_bye) continue
    const hit = PLACEMENT_ROUNDS.find(([re]) => re.test(String(b.round ?? "").trim()))
    if (hit) return b.win ? hit[1] : hit[2]
  }
  return null
}

export function aaEventLabel(eventKey: string): string | null {
  return AA_EVENTS.find(([re]) => re.test(eventKey))?.[1] ?? null
}

export type Achievement = { level: AchievementLevel; badge: string; color: string }

/**
 * The loudest true thing about a wrestler.
 *
 * Ordered by what a college coach reads first: a national podium outranks a state title, which
 * outranks a state place, which outranks having been there.
 */
/** Top eight at any national event we count - the one rule the badge and the Honors filter share. */
export function isAllAmerican(facts: AchievementFacts): boolean {
  const podium = (place: number | null | undefined) => place != null && Number(place) >= 1 && Number(place) <= 8
  return podium(facts.bestNhscaPlace) || podium(facts.bestSuper32Place) || (facts.nationalPodiums?.length ?? 0) > 0
}

export function highestAchievement(facts: AchievementFacts): Achievement {
  if (isAllAmerican(facts)) {
    return { level: "all-american", badge: "All-American", color: "bg-purple-600 text-white" }
  }
  if (facts.bestStatePlace === 1) {
    return { level: "state-champion", badge: "State Champion", color: "bg-yellow-500 text-white" }
  }
  const place = facts.bestStatePlace
  if (place != null && place >= 2 && place <= 6) {
    return { level: "state-placer", badge: "State Placer", color: "bg-blue-600 text-white" }
  }
  if (facts.stateQualifier || (place != null && place > 6)) {
    return { level: "state-qualifier", badge: "State Qualifier", color: "bg-green-600 text-white" }
  }
  return { level: "dnq", badge: "DNQ", color: "bg-gray-400 text-white" }
}

/** Smallest positive place wins; nulls and zeroes are "competed, did not place". */
function bestPlace(current: number | null | undefined, candidate: unknown): number | null {
  const value = Number(candidate)
  if (!Number.isFinite(value) || value < 1) return current ?? null
  if (current == null) return value
  return Math.min(current, value)
}

/**
 * Achievements for a set of athletes, in three queries rather than three per wrestler.
 *
 * Super 32 is matched by name because `super32_results` carries no athlete_id — which is a gap
 * worth closing, and until it is, a name match is better than pretending the results are absent.
 */
export async function loadAchievements(
  supabase: SupabaseClient,
  athletes: ReadonlyArray<{ id: string; name?: string | null }>,
): Promise<Map<string, AchievementFacts>> {
  const out = new Map<string, AchievementFacts>()
  const ids = athletes.map((a) => String(a.id)).filter(Boolean)
  if (!ids.length) return out
  const facts = (id: string): AchievementFacts => {
    const existing = out.get(id)
    if (existing) return existing
    const fresh: AchievementFacts = {}
    out.set(id, fresh)
    return fresh
  }

  // PostgREST caps a request, so the ids go in batches rather than one enormous `in`.
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200)
    const [state, nhsca, otherStates] = await Promise.all([
      supabase.from("wrestling_nchsaa_results").select("athlete_id, place").in("athlete_id", batch),
      supabase.from("nhsca_placements").select("athlete_id, placement").in("athlete_id", batch),
      // Every other state's placers, every season we hold (Matt, 29 Oct 2026: "same thing with states").
      supabase.from("state_tournament_placers").select("athlete_id, place").in("athlete_id", batch).limit(5000),
    ])
    for (const row of otherStates.data ?? []) {
      const f = facts(String(row.athlete_id))
      f.bestStatePlace = bestPlace(f.bestStatePlace, row.place)
      f.stateQualifier = true
    }
    for (const row of state.data ?? []) {
      const f = facts(String(row.athlete_id))
      f.bestStatePlace = bestPlace(f.bestStatePlace, row.place)
      // A row in the state table means they were at the state tournament.
      f.stateQualifier = true
    }
    for (const row of nhsca.data ?? []) {
      const f = facts(String(row.athlete_id))
      f.bestNhscaPlace = bestPlace(f.bestNhscaPlace, row.placement)
    }

    // National podiums from the brackets: every linked wrestler, every state, boys and girls.
    type Bout = { athlete_id: string; event_key: string; weight_class: string | null; round: string | null; win: boolean | null; is_bye: boolean | null; year: number | null }
    const bouts: Bout[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("other_tournament_bouts")
        .select("athlete_id, event_key, weight_class, round, win, is_bye, year")
        .in("athlete_id", batch)
        .or(AA_EVENT_FILTER)
        .or(PLACEMENT_ROUND_FILTER)
        .order("id")
        .range(from, from + 999)
      if (error || !data?.length) break
      bouts.push(...(data as Bout[]))
      if (data.length < 1000) break
    }
    const byEntry = new Map<string, Bout[]>()
    for (const b of bouts) {
      if (!aaEventLabel(b.event_key)) continue
      const key = `${b.athlete_id}|${b.event_key}|${b.weight_class ?? ""}`
      byEntry.set(key, [...(byEntry.get(key) ?? []), b])
    }
    for (const [key, entry] of byEntry) {
      const placement = placementFromRounds(entry)
      if (placement == null || placement > 8) continue
      const [athleteId, eventKey] = key.split("|") as [string, string]
      const year = Number(entry[0]!.year) || Number(eventKey.match(/20\d\d/)?.[0]) || null
      const label = `${aaEventLabel(eventKey)}${year ? ` ${year}` : ""}`
      const f = facts(athleteId)
      f.nationalPodiums = [...new Set([...(f.nationalPodiums ?? []), label])]
    }
  }

  const byName = new Map<string, string>()
  for (const a of athletes) {
    const key = String(a.name ?? "").trim().toLowerCase()
    if (key) byName.set(key, String(a.id))
  }
  if (byName.size) {
    const { data } = await supabase.from("super32_results").select("athlete_name, placement")
    for (const row of data ?? []) {
      const id = byName.get(String(row.athlete_name ?? "").trim().toLowerCase())
      if (!id) continue
      const f = facts(id)
      f.bestSuper32Place = bestPlace(f.bestSuper32Place, row.placement)
    }
  }

  return out
}
