/**
 * The handful of finishes a coach decides on, for the top of the profile: national placings, the
 * Tournament of Champions, NCHSAA state placings, and NC Freestyle & Greco state titles.
 *
 * Built from the same rows the sections below print, so the strip can never claim a finish the
 * page does not show. Labels name the tournament in full enough to be unambiguous - "NCHSAA 7A
 * State 4th", never "State 4th", and USA Wrestling's state title is "NC Freestyle State Champion"
 * (Matt: always label their state championships). Overflow brackets ("(OF)") and duals are not
 * finishes.
 */

import { isNationalEvent, styleOfEvent } from "@/lib/wrestling-style"
import type { TournamentRow } from "@/lib/profile/tournament-rows"

export type Credential = {
  /** The event, as a card title: "NHSCA Nationals", "NCHSAA 7A State", "TOC". */
  title: string
  /** The finish: "4th · All-American · ’25". */
  detail: string
  /** One line, for anywhere a card will not fit. */
  label: string
  tier: "national" | "toc" | "state" | "olympic-state"
}

function placeNumber(placement: string | null): number | null {
  if (!placement) return null
  if (/champion/i.test(placement)) return 1
  const m = placement.match(/^(\d+)(st|nd|rd|th)\b/i)
  return m ? Number(m[1]) : null
}

function placeWord(place: number): string {
  if (place === 1) return "Champion"
  const suffix = place === 2 ? "nd" : place === 3 ? "rd" : "th"
  return `${place}${suffix}`
}

const shortYear = (year: number) => `’${String(year).slice(-2)}`

/** "Fargo · Freestyle" -> "Fargo Freestyle"; "2026 NHSCA National Championships" -> "NHSCA". */
function nationalName(row: TournamentRow): string {
  const event = row.event.replace(/^\d{4}\s+/, "")
  if (/^fargo/i.test(event)) return event.replace(/\s*·\s*/, " ")
  if (/nhsca/i.test(event)) return "NHSCA Nationals"
  if (/early entry/i.test(event)) return "Super 32 Early Entry"
  if (/super 32/i.test(event)) return "Super 32"
  if (/journeymen/i.test(event)) return "Journeymen"
  if (/beast of the east/i.test(event)) return "Beast of the East"
  if (/ironman/i.test(event)) return "Ironman"
  return event
}

export function profileCredentials(input: {
  stateRows: readonly TournamentRow[]
  tocRows: readonly TournamentRow[]
  tournamentRows: readonly TournamentRow[]
  max?: number
}): Credential[] {
  const out: Array<Credential & { place: number; year: number }> = []
  const add = (title: string, detail: string, tier: Credential["tier"], place: number, year: number) =>
    out.push({ title, detail, label: `${title} ${detail}`, tier, place, year })

  for (const row of input.tournamentRows) {
    if (row.isDuals || /\(OF\)|overflow/i.test(row.event)) continue
    const place = placeNumber(row.placement)
    if (place == null || place > 8) continue
    if (isNationalEvent(row.event)) {
      const aa = /fargo|nhsca/i.test(row.event) && place > 1 ? " · All-American" : ""
      add(nationalName(row), `${placeWord(place)}${aa} · ${shortYear(row.year)}`, "national", place, row.year)
    } else if (place === 1 && /nc freestyle|freestyle & greco/i.test(row.event)) {
      const style = styleOfEvent(row.event, row.team) === "greco" ? "Greco" : "Freestyle"
      add(`NC ${style} State`, `Champion · ${shortYear(row.year)}`, "olympic-state", place, row.year)
    }
  }
  for (const row of input.tocRows) {
    const place = placeNumber(row.placement)
    if (place == null || place > 8) continue
    add("TOC", `${placeWord(place)} · ${shortYear(row.year)}`, "toc", place, row.year)
  }
  for (const row of input.stateRows) {
    const place = placeNumber(row.placement)
    if (place == null || place > 6) continue
    const cls = row.event.match(/\b(\d+A|NCISA[^ ]*)\b/i)?.[1]
    add(`NCHSAA${cls ? ` ${cls}` : ""} State`, `${placeWord(place)} · ${shortYear(row.year)}`, "state", place, row.year)
  }

  const tierRank = { national: 0, toc: 1, state: 2, "olympic-state": 3 } as const
  return out
    .sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || a.place - b.place || b.year - a.year)
    .slice(0, input.max ?? 5)
    .map(({ title, detail, label, tier }) => ({ title, detail, label, tier }))
}
