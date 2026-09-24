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
import { ChevronDown, Globe, Trophy, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn, scrollTableXClass } from "@/lib/utils"
import { PROFILE_SECTION_HEADER, PROFILE_SECTION_TITLE } from "@/lib/unified-profile-section-styles"
import { displayName, type OtherTournamentProfileBlock } from "@/lib/other-tournaments"
import {
  buildNchsaaStateRows,
  buildTournamentRows,
  isTocRow,
  type AccordionSummaryResult,
  type NationalTeamEntry,
  type TournamentRow,
} from "@/lib/profile/tournament-rows"

export { buildNchsaaStateRows, buildTournamentRows, isTocRow }
export type { AccordionSummaryResult, NationalTeamEntry, TournamentRow }

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
                <span
                  className={cn(
                    "inline-flex min-w-6 justify-center rounded px-1.5 py-0.5 text-[11px] font-bold text-white",
                    bout.win ? "bg-emerald-600" : "bg-red-700",
                  )}
                >
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
  title = "National Tournaments",
  subtitle = "Super 32, Fargo, NHSCA, Journeymen, duals and open events",
  sectionId = "tournaments",
  emptyText = "No tournament results recorded yet",
  hideWhenEmpty = false,
  icon: Icon = Globe,
}: {
  rows: TournamentRow[]
  theme?: "light" | "dark"
  title?: string
  subtitle?: string
  sectionId?: string
  emptyText?: string
  /** A section for an event most wrestlers have never entered should not print an empty card. */
  hideWhenEmpty?: boolean
  /** One icon per section: ten identical trophies give a reader nothing to navigate by. */
  icon?: LucideIcon
}) {
  const isDark = theme === "dark"
  const [open, setOpen] = useState<string | null>(null)

  /*
   * Individual results and duals read differently: a placement says where a wrestler finished in a
   * field, a duals record says how he did against whoever his team drew. Printing "1st of 8" beside
   * "5-0" as if they were the same claim is what the split avoids.
   */
  const groups = [
    { label: "Individual", rows: rows.filter((r) => !r.isDuals) },
    { label: "Duals & team events", rows: rows.filter((r) => r.isDuals) },
  ].filter((group) => group.rows.length > 0)

  const cardClass = isDark
    ? "profile-card border-t-4 border-t-[#D3B574] border-white/10 bg-[#0f1c2e] shadow-none"
    : "border-t-4 border-t-[#D3B574] shadow-md"

  if (hideWhenEmpty && rows.length === 0) return null

  return (
    <Card className={cardClass} id={sectionId}>
      <CardHeader className={cn(PROFILE_SECTION_HEADER, "from-[#13294B] to-[#1e3a5f]")}>
        <CardTitle className={cn(PROFILE_SECTION_TITLE, "flex items-center gap-2")}>
          <Icon className="h-5 w-5 text-[#D3B574]" />
          {title}
        </CardTitle>
        <p className={cn("text-xs mt-1", isDark ? "text-white/50" : "text-gray-500")}>
          {subtitle}
        </p>
      </CardHeader>
      <CardContent className={cn(isDark ? "p-3 md:p-4 bg-[#0f1c2e] text-white/80" : "p-3 md:p-4", "space-y-2")}>
        {rows.length === 0 ? (
          <p className={cn("py-6 text-center text-sm", isDark ? "text-white/40" : "text-gray-500")}>
            {emptyText}
          </p>
        ) : (
          groups.map(({ label, rows: groupRows }) => (
            <div key={label} className="space-y-2">
              {/* Only labelled when both kinds are present: a heading over the only group is noise. */}
              {groups.length > 1 ? (
                <p
                  className={cn(
                    "px-1 pt-1 text-[11px] font-bold uppercase tracking-[0.14em]",
                    isDark ? "text-white/40" : "text-gray-500",
                  )}
                >
                  {label}
                </p>
              ) : null}
              {groupRows.map((row) => {
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
                      {[
                        row.year,
                        row.team,
                        row.weight ? `${row.weight} lbs` : null,
                        row.entrants ? `${row.entrants} in bracket` : null,
                      ]
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
              })}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
