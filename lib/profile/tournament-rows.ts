/**
 * The rows behind a wrestler's tournament list, built once for every surface that shows them.
 *
 * Lifted out of the accordion component so the phone can have the same list. The component is
 * "use client"; a route handler that imported the builder through it would be reaching across a
 * client boundary for a pure function, and the alternative — a second implementation for the app —
 * is how the Fargo style labels and the duals grouping end up disagreeing between web and phone.
 *
 * Nothing here touches React or the DOM: same input, same rows, on a server or in a browser.
 */
import { displayName, placementLabel, type OtherTournamentProfileBlock } from "@/lib/other-tournaments"
import { parseFargoDivisionString } from "@/lib/fargo-division"

export type AccordionSummaryResult = {
  year: number
  placement: string
  record?: string
  weight?: string
  /** Fargo's "Junior Boys Greco-Roman" and the like. Two separate tournaments in one week. */
  division?: string
}

export type NationalTeamEntry = {
  event: string
  year: number
  record: string
  isPlaceholder?: boolean
}

export type TournamentRow = {
  id: string
  event: string
  /** The team a wrestler competed for, on duals rows. Duals have a team and no placement. */
  team: string | null
  /** Duals are grouped apart: a record against whoever your team drew is not a finish in a field. */
  isDuals: boolean
  year: number
  /** Sorts the list; events without a date fall back to the year. */
  sortKey: string
  weight: string | null
  /** "Champion", "3rd", "5-0" — whatever the event actually produced. */
  placement: string | null
  record: string | null
  entrants: number | null
  bouts: OtherTournamentProfileBlock["bouts"]
}

/** Duals name themselves: no export we take carries a flag for it. */
function looksLikeDuals(eventName: string): boolean {
  return /\bduals?\b/i.test(eventName)
}

function rowsFromBlocks(blocks: OtherTournamentProfileBlock[]): TournamentRow[] {
  return blocks.map((block) => ({
    id: `${block.result.eventKey}-${block.result.year}-${block.result.weight}`,
    event: block.result.eventName,
    team: null,
    isDuals: looksLikeDuals(block.result.eventName),
    year: block.result.year,
    sortKey: block.result.eventDate ?? `${block.result.year}-01-01`,
    weight: block.result.weight || null,
    placement: placementLabel(block.result.placement) || null,
    record: block.result.record || null,
    entrants: block.result.entrants,
    bouts: block.bouts,
  }))
}

function rowsFromSummaries(
  event: string,
  results: AccordionSummaryResult[],
  options: { team?: string; isDuals?: boolean } = {},
): TournamentRow[] {
  return results
    .filter((r) => !!r.year)
    .map((r, i) => ({
      id: `${event}-${r.year}-${i}`,
      event,
      team: options.team ?? null,
      isDuals: options.isDuals ?? looksLikeDuals(event),
      year: r.year,
      sortKey: `${r.year}-06-01`,
      weight: r.weight ?? null,
      placement: r.placement || null,
      record: r.record ?? null,
      entrants: null,
      bouts: [],
    }))
}

export function buildTournamentRows(input: {
  otherTournamentBlocks?: OtherTournamentProfileBlock[]
  nhscaResults?: AccordionSummaryResult[]
  super32Results?: AccordionSummaryResult[]
  fargoResults?: AccordionSummaryResult[]
  nationalTeamResults?: NationalTeamEntry[]
}): TournamentRow[] {
  const rows = [
    ...rowsFromBlocks(input.otherTournamentBlocks ?? []),
    ...rowsFromSummaries("NHSCA Nationals", input.nhscaResults ?? []),
    ...rowsFromSummaries("Super 32", input.super32Results ?? []),
    /*
     * Freestyle and Greco are different tournaments, wrestled on different days, and a wrestler
     * can be an All-American in one and go 0-2 in the other. Labelled "Fargo" alone, a
     * profile printed two rows at the same weight and year with no way to tell which was which.
     */
    ...(input.fargoResults ?? []).flatMap((result, i) => {
      const parsed = result.division ? parseFargoDivisionString(result.division) : null
      const style = parsed ? (parsed.style === "GR" ? "Greco-Roman" : "Freestyle") : null
      const age = parsed && parsed.age_division !== "Unknown" ? parsed.age_division : null
      return rowsFromSummaries(style ? `Fargo · ${style}` : "Fargo", [result]).map((row) => ({
        ...row,
        id: `fargo-${result.year}-${i}`,
        team: age,
      }))
    }),
    /*
     * The event is the duals; NC United is who they wrestled for.
     *
     * These rows used to print the team as the event and the event where a placement belongs, so a
     * profile read "NC United National Team · 2025 · Ultimate Club Duals · 6-3" — the team where
     * the finish goes. A placeholder row is a team we expect them on, not a result, so it is left out.
     */
    ...(input.nationalTeamResults ?? [])
      .filter((r) => !r.isPlaceholder)
      .flatMap((r, i) => [
        {
          id: `national-team-${r.year}-${i}`,
          event: r.event,
          team: "NC United National Team",
          isDuals: true,
          year: r.year,
          sortKey: `${r.year}-06-01`,
          weight: null,
          placement: null,
          record: r.record || null,
          entrants: null,
          bouts: [],
        } satisfies TournamentRow,
      ]),
  ]
  // Most recent first: the result a coach is asking about is almost always the last one.
  return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey) || b.year - a.year)
}

/** TOC sits with the state title, not with the national events: both are North Carolina finishes. */
export function isTocRow(row: TournamentRow): boolean {
  return /tournament of champions/i.test(row.event)
}
