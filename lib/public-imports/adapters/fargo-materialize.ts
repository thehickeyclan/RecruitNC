/**
 * Expand adapter matches into per-athlete bout rows and season aggregates.
 * Freestyle and Greco remain independent careers.
 */

import { buildFargoDivisionLabel } from "@/lib/fargo-division"
import { canonicalizeWrestlerName } from "../normalize"
import type { FargoBoutProposed, FargoProposed } from "../types"
import type {
  FargoAdapterParseResult,
  FargoParsedMatch,
  FargoParsedPlacer,
} from "./fargo-adapter-types"

function boutSide(
  name: string,
  state: string | null | undefined,
  club: string | null | undefined,
  oppName: string,
  oppState: string | null | undefined,
  oppClub: string | null | undefined,
  win: boolean,
  m: FargoParsedMatch,
  parsed: FargoAdapterParseResult,
): FargoBoutProposed {
  const ctx = parsed.context
  return {
    year: ctx.year,
    style: ctx.style,
    gender: ctx.gender,
    age_division: String(ctx.age_division),
    weight_class: m.weight_class,
    athlete_name: canonicalizeWrestlerName(name),
    athlete_state: state ?? null,
    athlete_club: club ?? null,
    opponent_name: canonicalizeWrestlerName(oppName),
    opponent_state: oppState ?? null,
    opponent_club: oppClub ?? null,
    round: m.round ?? null,
    result_type: m.result_type,
    score: m.score ?? null,
    win,
    match_order: m.match_order ?? null,
    source_event_id: ctx.source_event_id ?? null,
    source_bracket_id: m.source_bracket_id ?? null,
    source_match_id: m.source_match_id ?? null,
    source_url: ctx.source_url ?? null,
    source_adapter: ctx.source_adapter,
    source_payload: m.raw ?? null,
  }
}

/** Two orientation rows per dual (winner + loser perspectives). */
export function expandMatchesToBouts(parsed: FargoAdapterParseResult): FargoBoutProposed[] {
  const out: FargoBoutProposed[] = []
  for (const m of parsed.matches) {
    out.push(
      boutSide(
        m.winner_name,
        m.winner_state,
        m.winner_club,
        m.loser_name,
        m.loser_state,
        m.loser_club,
        true,
        m,
        parsed,
      ),
      boutSide(
        m.loser_name,
        m.loser_state,
        m.loser_club,
        m.winner_name,
        m.winner_state,
        m.winner_club,
        false,
        m,
        parsed,
      ),
    )
  }
  return out
}

function placerMap(placers: FargoParsedPlacer[]): Map<string, FargoParsedPlacer> {
  const map = new Map<string, FargoParsedPlacer>()
  for (const p of placers) {
    const key = `${p.weight_class}|${canonicalizeWrestlerName(p.athlete_name).toLowerCase()}`
    map.set(key, p)
  }
  return map
}

/**
 * Build season aggregates from bout perspectives + optional placer list.
 * Does not merge FS and GR.
 */
export function materializeFargoSeasons(
  parsed: FargoAdapterParseResult,
  opts?: { stateFilter?: string | null },
): FargoProposed[] {
  const bouts = expandMatchesToBouts(parsed)
  const placers = placerMap(parsed.placers)
  const byAthlete = new Map<
    string,
    {
      name: string
      state: string | null
      club: string | null
      weight: string
      wins: number
      losses: number
    }
  >()

  for (const b of bouts) {
    const key = `${b.weight_class}|${b.athlete_name.toLowerCase()}`
    const cur = byAthlete.get(key) ?? {
      name: b.athlete_name,
      state: b.athlete_state ?? null,
      club: b.athlete_club ?? null,
      weight: b.weight_class,
      wins: 0,
      losses: 0,
    }
    if (b.win) cur.wins += 1
    else cur.losses += 1
    if (!cur.state && b.athlete_state) cur.state = b.athlete_state
    if (!cur.club && b.athlete_club) cur.club = b.athlete_club
    byAthlete.set(key, cur)
  }

  // Placers with no matches still get a season row
  for (const p of parsed.placers) {
    const key = `${p.weight_class}|${canonicalizeWrestlerName(p.athlete_name).toLowerCase()}`
    if (!byAthlete.has(key)) {
      byAthlete.set(key, {
        name: canonicalizeWrestlerName(p.athlete_name),
        state: p.state ?? null,
        club: p.club ?? null,
        weight: p.weight_class,
        wins: 0,
        losses: 0,
      })
    }
  }

  const ctx = parsed.context
  const division = buildFargoDivisionLabel(ctx.age_division, ctx.gender, ctx.style)
  const filter = opts?.stateFilter?.toUpperCase() ?? null
  const seasons: FargoProposed[] = []

  for (const [key, a] of byAthlete) {
    if (filter && (a.state ?? "").toUpperCase() !== filter) continue
    const pl = placers.get(key)
    const placement = pl?.placement ?? null
    const is_all_american = placement != null && placement >= 1 && placement <= 8
    const parts = a.name.split(/\s+/)
    seasons.push({
      year: ctx.year,
      athlete_name: a.name,
      first_name: parts.length > 1 ? parts.slice(0, -1).join(" ") : a.name,
      last_name: parts.length > 1 ? parts[parts.length - 1] : "",
      division,
      style: ctx.style,
      gender: ctx.gender,
      age_division: String(ctx.age_division),
      weight_class: a.weight,
      wins: a.wins,
      losses: a.losses,
      record: `${a.wins}-${a.losses}`,
      placement,
      is_all_american,
      high_school: null,
      state: a.state ?? (filter || null),
      club: a.club ?? pl?.club ?? null,
      notes: null,
      event_name: "US Marine Corps National Championships (Fargo)",
      source_url: ctx.source_url ?? null,
      source_label: ctx.source_label ?? null,
    })
  }

  return seasons
}

/** Filter bout rows to athletes matching a state (e.g. NC). */
export function filterBoutsByAthleteState(
  bouts: FargoBoutProposed[],
  state: string,
): FargoBoutProposed[] {
  const s = state.toUpperCase()
  return bouts.filter((b) => (b.athlete_state ?? "").toUpperCase() === s)
}
