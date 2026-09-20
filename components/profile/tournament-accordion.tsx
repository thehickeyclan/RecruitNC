"use client"

/**
 * Every tournament a wrestler has competed in, as one collapsed list.
 *
 * The profile used to stack a card per event family — National Team, NHSCA, Fargo, qualifiers,
 * Super 32 — each with its own header and mostly empty. Most wrestlers have one or two of them, so
 * a coach scrolled past five headings to read two lines, and adding TOC would have made it six.
 *
 * One row per event instead. The row carries the answer — "Tournament of Champions · 2026 · 117 ·
 * 3rd · 3-1" — so the list reads as a record of results without opening anything, and the bouts
 * sit behind a chevron for the coach who wants to see who they beat.
 *
 * States is deliberately NOT here: it is the credential North Carolina coaches anchor on, and it
 * keeps its own section above this one.
 */

import { useState } from "react"
import { ChevronDown, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn, scrollTableXClass } from "@/lib/utils"
import { PROFILE_SECTION_HEADER, PROFILE_SECTION_TITLE } from "@/lib/unified-profile-section-styles"
import { displayName, placementLabel, type OtherTournamentProfileBlock } from "@/lib/other-tournaments"

export type AccordionSummaryResult = {
  year: number
  placement: string
  record?: string
  weight?: string
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

function rowsFromBlocks(blocks: OtherTournamentProfileBlock[]): TournamentRow[] {
  return blocks.map((block) => ({
    id: `${block.result.eventKey}-${block.result.year}-${block.result.weight}`,
    event: block.result.eventName,
    year: block.result.year,
    sortKey: block.result.eventDate ?? `${block.result.year}-01-01`,
    weight: block.result.weight || null,
    placement: placementLabel(block.result.placement) || null,
    record: block.result.record || null,
    entrants: block.result.entrants,
    bouts: block.bouts,
  }))
}

function rowsFromSummaries(event: string, results: AccordionSummaryResult[]): TournamentRow[] {
  return results
    .filter((r) => !!r.year)
    .map((r, i) => ({
      id: `${event}-${r.year}-${i}`,
      event,
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
    ...rowsFromSummaries("Fargo Nationals", input.fargoResults ?? []),
    // A placeholder row is a team we expect them on, not a result — it has nothing to show.
    ...rowsFromSummaries(
      "NC United National Team",
      (input.nationalTeamResults ?? [])
        .filter((r) => !r.isPlaceholder)
        .map((r) => ({ year: r.year, placement: r.event, record: r.record })),
    ),
  ]
  // Most recent first: the result a coach is asking about is almost always the last one.
  return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey) || b.year - a.year)
}

function BoutTable({ bouts, isDark }: { bouts: TournamentRow["bouts"]; isDark: boolean }) {
  const headRow = isDark ? "bg-white/5 border-white/10" : "bg-gray-50"
  const headCell = isDark ? "font-semibold text-white/60" : "font-semibold"
  const bodyRow = isDark ? "border-white/10 text-white/80" : ""
  return (
    <div className={cn(scrollTableXClass, isDark ? "rounded-lg border border-white/10" : "rounded-lg border")}>
      <Table>
        <TableHeader>
          <TableRow className={headRow}>
            <TableHead className={headCell}>Round</TableHead>
            <TableHead className={headCell}>Result</TableHead>
            <TableHead className={headCell}>Opponent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bouts.map((bout, index) => (
            <TableRow key={`${bout.round}-${index}`} className={bodyRow}>
              <TableCell className="whitespace-nowrap">{bout.round || "—"}</TableCell>
              <TableCell className="whitespace-nowrap font-mono">
                <span className={bout.win ? "text-emerald-400 font-semibold" : isDark ? "text-white/50" : "text-gray-500"}>
                  {bout.win ? "W" : "L"}
                </span>{" "}
                {[bout.winType, bout.score].filter(Boolean).join(" ")}
              </TableCell>
              <TableCell>
                {displayName(bout.opponentName)}
                {bout.opponentClub ? (
                  <span className={isDark ? "ml-2 text-xs text-white/40" : "ml-2 text-xs text-gray-500"}>
                    {bout.opponentClub}
                  </span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function TournamentAccordion({
  rows,
  theme = "light",
}: {
  rows: TournamentRow[]
  theme?: "light" | "dark"
}) {
  const isDark = theme === "dark"
  const [open, setOpen] = useState<string | null>(null)

  const cardClass = isDark
    ? "profile-card border-t-4 border-t-[#D3B574] border-white/10 bg-[#0f1c2e] shadow-none"
    : "border-t-4 border-t-[#D3B574] shadow-md"

  return (
    <Card className={cardClass} id="tournaments">
      <CardHeader className={cn(PROFILE_SECTION_HEADER, "from-[#13294B] to-[#1e3a5f]")}>
        <CardTitle className={cn(PROFILE_SECTION_TITLE, "flex items-center gap-2")}>
          <Trophy className="h-5 w-5 text-[#D3B574]" />
          Tournaments
        </CardTitle>
        <p className={cn("text-xs mt-1", isDark ? "text-white/50" : "text-gray-500")}>
          Tournament of Champions, Super 32, Fargo, NHSCA, duals and open events
        </p>
      </CardHeader>
      <CardContent className={cn(isDark ? "p-3 md:p-4 bg-[#0f1c2e] text-white/80" : "p-3 md:p-4", "space-y-2")}>
        {rows.length === 0 ? (
          <p className={cn("py-6 text-center text-sm", isDark ? "text-white/40" : "text-gray-500")}>
            No tournament results recorded yet
          </p>
        ) : (
          rows.map((row) => {
            const expandable = row.bouts.length > 0
            const isOpen = open === row.id
            return (
              <div
                key={row.id}
                className={cn("rounded-lg border", isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200")}
              >
                <button
                  type="button"
                  disabled={!expandable}
                  onClick={() => setOpen(isOpen ? null : row.id)}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left",
                    expandable && (isDark ? "hover:bg-white/5" : "hover:bg-gray-50"),
                    !expandable && "cursor-default",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-[#03154C]")}>
                      {row.event}
                    </div>
                    <div className={cn("text-xs", isDark ? "text-white/50" : "text-gray-500")}>
                      {[row.year, row.weight ? `${row.weight} lbs` : null, row.entrants ? `${row.entrants} in bracket` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {/* The result, on the row itself: the list has to be readable closed. */}
                  <div className="flex shrink-0 items-center gap-2">
                    {row.placement ? (
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-bold",
                          row.placement === "Champion"
                            ? "bg-[#D3B574] text-[#0A1628]"
                            : isDark
                              ? "bg-white/10 text-white/80"
                              : "bg-gray-100 text-gray-700",
                        )}
                      >
                        {row.placement}
                      </span>
                    ) : null}
                    {row.record ? (
                      <span className={cn("font-mono text-xs", isDark ? "text-white/70" : "text-gray-600")}>
                        {row.record}
                      </span>
                    ) : null}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-180",
                        expandable ? (isDark ? "text-white/50" : "text-gray-400") : "opacity-0",
                      )}
                    />
                  </div>
                </button>
                {isOpen && expandable ? (
                  <div className="px-3 pb-3">
                    <BoutTable bouts={row.bouts} isDark={isDark} />
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
