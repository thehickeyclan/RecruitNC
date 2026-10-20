import "server-only"

import data from "@/lib/college-programs/roster-room.json"
import { COLLEGE_WEIGHTS } from "@/lib/college-programs/roster-depth"

/**
 * Who is in a college's wrestling room, and what it will look like when a wrestler arrives
 * (Matt, 19 Oct 2026: "assess who is on the roster, graduation years, weight, and make
 * recommendations on the likelihood to recruit certain weights"). From Muse's v3 roster pull:
 * every team's 2026-27 roster with each wrestler's weight, class and projected final season.
 *
 * The rule, worked out here and never by a model: for a wrestler who would arrive in the fall of
 * year Y, a teammate at the same weight is still there if their final season ends after Y
 * (projected_final_season > Y); one whose final season is Y or earlier will have used their
 * eligibility. A teammate with no known final season is counted as staying, so the room is never
 * shown emptier than it may be.
 *
 * The honesty rule from the first pull still holds: this is a direction, not a vacancy. Redshirts,
 * weight changes, transfers and the coach's own recruiting change every room. The label says
 * "likely need", never "a spot is open".
 */

export type RoomWrestler = { name: string; weight: number | null; cls: string | null; finalSeason: number | null; redshirt: boolean; homeState: string | null; highSchool: string | null }
export type Room = { season: string; wrestlers: RoomWrestler[] }
export type Need = "likely" | "some" | "crowded"

type Raw = [string, number | null, string | null, number | null, 0 | 1, string | null, string | null]
const TEAMS = (data as unknown as { teams: Record<string, Partial<Record<"mens" | "womens", { season: string; wrestlers: Raw[] }>>> }).teams

export function roomFor(schoolId: string, team: "mens" | "womens"): Room | null {
  const t = TEAMS[schoolId]?.[team]
  if (!t) return null
  return {
    season: t.season,
    wrestlers: t.wrestlers.map(([name, weight, cls, finalSeason, rs, homeState, highSchool]) => ({ name, weight, cls, finalSeason, redshirt: rs === 1, homeState, highSchool })),
  }
}

export type WeightRow = {
  weight: number
  /** On the roster now. */
  now: number
  /** Will have used their eligibility by the arrival fall. */
  leaving: number
  /** Still there in the arrival season (unknown final season counted here). */
  staying: number
  need: Need
  wrestlers: RoomWrestler[]
}

/** The label for a weight from who will still be there. Two or fewer is room; three or more is a crowd. */
export const needOf = (staying: number): Need => (staying <= 1 ? "likely" : staying === 2 ? "some" : "crowded")

export const NEED_LABEL: Record<Need, string> = { likely: "Likely need", some: "Some room", crowded: "Crowded" }

/** Too few weights printed to judge: the room view says so instead of showing empty weights. */
export const weightsPublished = (room: Room) => room.wrestlers.length > 0 && room.wrestlers.filter((w) => w.weight != null).length / room.wrestlers.length >= 0.5

/** Every college weight, for a wrestler arriving in the fall of `arrivalFall`. */
export function roomByWeight(room: Room, team: "mens" | "womens", arrivalFall: number): WeightRow[] {
  return COLLEGE_WEIGHTS[team].map((weight) => {
    const at = room.wrestlers.filter((w) => w.weight === weight)
    const leaving = at.filter((w) => w.finalSeason != null && w.finalSeason <= arrivalFall).length
    const staying = at.length - leaving
    return { weight, now: at.length, leaving, staying, need: needOf(staying), wrestlers: [...at].sort((a, b) => (a.finalSeason ?? 9999) - (b.finalSeason ?? 9999)) }
  })
}

/** One line for Scout and Compare: the room at a few weights for one arrival year. */
export function needSentence(rows: WeightRow[], weights: number[], arrivalFall: number): string {
  return rows
    .filter((r) => weights.includes(r.weight))
    .map((r) => `${r.weight}: ${r.now} now, ${r.leaving} gone by fall ${arrivalFall}, ${r.staying} still there (${NEED_LABEL[r.need].toLowerCase()})`)
    .join("; ")
}
