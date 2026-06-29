"use client"

import { ChevronDown, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { HardLink } from "@/components/hard-link"
import { AAU_SCHOLASTIC_DUALS_2026_RESULTS_PATH } from "@/lib/aau-scholastic-duals-2026-results"
import type { AauScholasticWrestlerQualityWins } from "@/lib/aau-scholastic-duals-2026-quality-wins"
import { PROFILE_SECTION_HEADER, PROFILE_SECTION_TITLE } from "@/lib/unified-profile-section-styles"
import { cn } from "@/lib/utils"

function QualityWinRow({
  opponentName,
  state,
  credentials,
  resultLine,
  opponentTeam,
  isDark,
}: {
  opponentName: string
  state: string
  credentials: string
  resultLine?: string
  opponentTeam?: string
  isDark: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 sm:p-4",
        isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50/80",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("font-semibold", isDark ? "text-white" : "text-[#03154C]")}>{opponentName}</p>
          <p className={cn("text-sm mt-0.5", isDark ? "text-white/60" : "text-gray-600")}>
            {state} · {credentials}
          </p>
        </div>
        {resultLine ? (
          <div className="shrink-0 text-left sm:text-right">
            <p className={cn("font-bold tabular-nums", isDark ? "text-[#D3B574]" : "text-[#B31B1B]")}>{resultLine}</p>
            {opponentTeam ? (
              <p className={cn("text-xs mt-0.5 truncate max-w-[220px] sm:ml-auto", isDark ? "text-white/45" : "text-gray-500")}>
                {opponentTeam}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AauScholasticProfileQualityWinsSection({
  entry,
  theme = "dark",
  className,
}: {
  entry: AauScholasticWrestlerQualityWins
  theme?: "light" | "dark"
  className?: string
}) {
  const isDark = theme === "dark"
  const cardClass = isDark
    ? "profile-card border-t-4 border-t-[#D3B574] border-white/10 bg-[#0f1c2e] shadow-none"
    : "border-t-4 border-t-[#B31B1B] shadow-md"

  return (
    <Card id="quality-wins" className={cn(cardClass, className)} data-section="quality-wins">
      <CardHeader className={cn(PROFILE_SECTION_HEADER, "from-[#03154C] to-[#1e3a8a]")}>
        <CardTitle className={cn(PROFILE_SECTION_TITLE, "flex items-center gap-2")}>
          <Sparkles className="h-5 w-5 text-[#D3B574]" />
          Quality Wins
        </CardTitle>
        <p className={cn("text-sm mt-1", isDark ? "text-white/60" : "text-gray-600")}>
          AAU Scholastic Duals 2026 · {entry.weightLabel} · {entry.record} · {entry.wins.length} signature win
          {entry.wins.length === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <CardContent className={cn("p-4 md:p-6", isDark ? "bg-[#0f1c2e] text-white/85" : "")}>
        <div className="space-y-3 mb-5">
          {entry.wins.map((win) => (
            <QualityWinRow
              key={win.opponentName}
              opponentName={win.opponentName}
              state={win.state}
              credentials={win.credentials}
              resultLine={win.resultLine}
              opponentTeam={win.opponentTeam}
              isDark={isDark}
            />
          ))}
        </div>

        <Collapsible className="group mb-4">
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
              isDark
                ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                : "border-gray-200 bg-gray-50/80 hover:bg-gray-100",
            )}
          >
            <span className={cn("text-sm font-semibold", isDark ? "text-white/85" : "text-[#03154C]")}>
              Quality win recap
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/50 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div
              className={cn(
                "rounded-b-lg border border-t-0 px-4 py-4",
                isDark ? "border-white/10 bg-[#0a2040]/40" : "border-gray-200 bg-red-50/30",
              )}
            >
              <ul className="grid gap-2 sm:grid-cols-2 text-sm">
                {entry.summaryBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B31B1B]" aria-hidden />
                    {bullet}
                  </li>
                ))}
              </ul>
              <p className={cn("text-sm mt-4 leading-relaxed italic", isDark ? "text-white/65" : "text-gray-600")}>
                {entry.summaryNote}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <HardLink
          href={AAU_SCHOLASTIC_DUALS_2026_RESULTS_PATH}
          className={cn(
            "inline-flex min-h-[44px] items-center text-sm font-semibold hover:underline",
            isDark ? "text-[#D3B574] hover:text-[#e8d099]" : "text-[#B31B1B]",
          )}
        >
          Full AAU Scholastic Duals 2026 results →
        </HardLink>
      </CardContent>
    </Card>
  )
}
