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

export type Credential = { label: string; tier: "national" | "toc" | "state" | "olympic-state" }

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

  for (const row of input.tournamentRows) {
    if (row.isDuals || /\(OF\)|overflow/i.test(row.event)) continue
    const place = placeNumber(row.placement)
    if (place == null || place > 8) continue
    if (isNationalEvent(row.event)) {
      const aa = /fargo|nhsca/i.test(row.event) ? " · All-American" : ""
      out.push({ label: `${nationalName(row)} ${placeWord(place)}${place === 1 ? "" : aa} ${shortYear(row.year)}`, tier: "national", place, year: row.year })
    } else if (place === 1 && /nc freestyle|freestyle & greco/i.test(row.event)) {
      const style = styleOfEvent(row.event, row.team) === "greco" ? "Greco" : "Freestyle"
      out.push({ label: `NC ${style} State Champion ${shortYear(row.year)}`, tier: "olympic-state", place, year: row.year })
    }
  }
  for (const row of input.tocRows) {
    const place = placeNumber(row.placement)
    if (place == null || place > 8) continue
    out.push({ label: `TOC ${placeWord(place)} ${shortYear(row.year)}`, tier: "toc", place, year: row.year })
  }
  for (const row of input.stateRows) {
    const place = placeNumber(row.placement)
    if (place == null || place > 6) continue
    const cls = row.event.match(/\b(\d+A|NCISA[^ ]*)\b/i)?.[1]
    out.push({ label: `NCHSAA${cls ? ` ${cls}` : ""} State ${placeWord(place)} ${shortYear(row.year)}`, tier: "state", place, year: row.year })
  }

  const tierRank = { national: 0, toc: 1, state: 2, "olympic-state": 3 } as const
  return out
    .sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || a.place - b.place || b.year - a.year)
    .slice(0, input.max ?? 5)
    .map(({ label, tier }) => ({ label, tier }))
}
