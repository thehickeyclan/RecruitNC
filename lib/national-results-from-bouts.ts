/**
 * Super 32, NHSCA, Fargo and Journeymen results worked out from the bouts, for wrestlers outside
 * North Carolina (Matt, 18 October 2026: South Carolina rankings).
 *
 * The placement tables a profile and the ranking formula read — `super32_results`,
 * `nhsca_placements`, `fargo_results`, and `other_tournament_results` for Journeymen — were filled
 * for North Carolina only. The brackets underneath are national and complete in
 * `other_tournament_bouts`, so an SC wrestler's linked bouts hold his whole national record while
 * every table the formula reads says he has none: Sy Strobel, 4th at NHSCA 2025, scored zero for
 * it. This reads his bouts and returns the same rows the tables would have held.
 *
 * North Carolina is untouched: an NC wrestler returns nothing here, and his tables answer as before.
 *
 * Finishes come from the placement rounds, the rule `summarizeBoutsByEvent` uses: winning the
 * 3rd-place match is third, losing it fourth. A wrestler who never reached a placement match has
 * no placement, which is not a claim that he did not place. Byes are not matches.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { TournamentResultForDisplay } from "@/lib/public-profile-data"
import type { OtherTournamentResult } from "@/lib/other-tournaments"
import { athleteStateCode, HOME_STATE } from "@/lib/recruiting/states"

export type NationalResultsFromBouts = {
  nhsca: TournamentResultForDisplay[]
  super32: TournamentResultForDisplay[]
  fargo: TournamentResultForDisplay[]
  other: OtherTournamentResult[]
}

const EMPTY: NationalResultsFromBouts = { nhsca: [], super32: [], fargo: [], other: [] }

type BoutRow = {
  event_key: string
  event_name: string | null
  event_date: string | null
  year: number | null
  weight_class: string | null
  round: string | null
  win: boolean | null
  is_bye: boolean | null
  athlete_club: string | null
}

/** Winner's place, loser's place. Labels as NHSCA, Super 32, Fargo and Journeymen print them. */
const PLACEMENT_ROUNDS: Array<[RegExp, number, number]> = [
  [/^(1st place( match)?|finals?|championship( final)?)$/i, 1, 2],
  [/^3rd place( match)?$/i, 3, 4],
  [/^5th place( match)?$/i, 5, 6],
  [/^7th place( match)?$/i, 7, 8],
]

function ordinal(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`
}

/** Record and finish for one wrestler's bouts at one event. */
export function summarizeEvent(bouts: ReadonlyArray<Pick<BoutRow, "round" | "win" | "is_bye" | "weight_class">>): {
  wins: number
  losses: number
  record: string
  placement: number | null
  weight: string | null
} {
  const real = bouts.filter((b) => !b.is_bye)
  const wins = real.filter((b) => b.win === true).length
  const losses = real.length - wins
  let placement: number | null = null
  for (const b of real) {
    const label = String(b.round ?? "").trim()
    const hit = PLACEMENT_ROUNDS.find(([re]) => re.test(label))
    if (!hit) continue
    placement = b.win ? hit[1] : hit[2]
    break
  }
  const weight = real.find((b) => b.weight_class)?.weight_class ?? bouts.find((b) => b.weight_class)?.weight_class ?? null
  return { wins, losses, record: `${wins}-${losses}`, placement, weight: weight ? String(weight) : null }
}

function fargoDivision(eventKey: string): string {
  const age = /-16u-/.test(eventKey) ? "16U" : /-junior-/.test(eventKey) ? "Junior" : ""
  const style = /-gr$/.test(eventKey) ? "Greco-Roman" : "Freestyle"
  return [age, style].filter(Boolean).join(" ")
}

/**
 * The rows for one athlete, or nothing for a North Carolina wrestler.
 *
 * `athlete` needs `id`, `state` and `is_nc_athlete` — the bundle passes the full row.
 */
export async function loadNationalResultsFromBouts(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
): Promise<NationalResultsFromBouts> {
  const id = String(athlete.id ?? "").trim()
  const code = athleteStateCode(athlete as { state?: string | null; is_nc_athlete?: boolean | null })
  if (!id || !code || code === HOME_STATE) return EMPTY

  const { data, error } = await supabase
    .from("other_tournament_bouts")
    .select("event_key, event_name, event_date, year, weight_class, round, win, is_bye, athlete_club")
    .eq("athlete_id", id)
    .or("event_key.like.super32-20%,event_key.like.nhsca-nationals-%,event_key.like.fargo-%,event_key.like.journeymen-fall-classic-%")
    .limit(2000)
  if (error || !data?.length) return EMPTY

  const byEvent = new Map<string, BoutRow[]>()
  for (const b of data as BoutRow[]) {
    // Super 32 itself only: the early-entry qualifiers are separate events with their own keys.
    if (/^super32-early-entry/.test(b.event_key)) continue
    byEvent.set(b.event_key, [...(byEvent.get(b.event_key) ?? []), b])
  }

  const out: NationalResultsFromBouts = { nhsca: [], super32: [], fargo: [], other: [] }
  for (const [key, bouts] of byEvent) {
    const s = summarizeEvent(bouts)
    if (s.wins + s.losses === 0) continue
    const year = Number(bouts[0]!.year) || Number(key.match(/20\d\d/)?.[0]) || 0
    if (!year) continue
    const row: TournamentResultForDisplay = {
      year,
      placement: s.placement ? ordinal(s.placement) : "",
      record: s.record,
      ...(s.weight ? { weight: s.weight } : {}),
    }
    if (/^super32-20\d\d$/.test(key)) out.super32.push(row)
    else if (/^nhsca-nationals-/.test(key)) out.nhsca.push(row)
    else if (/^fargo-/.test(key)) out.fargo.push({ ...row, division: fargoDivision(key) })
    else if (/^journeymen-fall-classic-/.test(key)) {
      out.other.push({
        eventKey: key,
        eventName: String(bouts[0]!.event_name ?? "Journeymen Fall Classic"),
        eventShortName: "Journeymen Fall Classic",
        eventState: null,
        eventDate: bouts[0]!.event_date ?? null,
        year,
        weight: s.weight ?? "",
        wins: s.wins,
        losses: s.losses,
        record: s.record,
        placement: s.placement,
        qualified: false,
        entrants: null,
        club: bouts[0]!.athlete_club ?? null,
      })
    }
  }
  const byYear = (a: { year: number }, b: { year: number }) => b.year - a.year
  out.nhsca.sort(byYear)
  out.super32.sort(byYear)
  out.fargo.sort(byYear)
  out.other.sort(byYear)
  return out
}
