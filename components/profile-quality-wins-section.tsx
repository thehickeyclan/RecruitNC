"use client"

import { ChevronDown, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { HardLink } from "@/components/hard-link"
import type {
  ProfileQualityWinRow,
  ProfileQualityWinsTournamentBlock,
} from "@/lib/profile-quality-wins"
import { profileQualityWinCount } from "@/lib/profile-quality-wins"
import { PROFILE_SECTION_HEADER, PROFILE_SECTION_TITLE } from "@/lib/unified-profile-section-styles"
import { cn } from "@/lib/utils"

function QualityWinRow({
  win,
  isDark,
}: {
  win: ProfileQualityWinRow
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
          <p className={cn("font-semibold", isDark ? "text-white" : "text-[#03154C]")}>{win.opponentName}</p>
          <p className={cn("text-sm mt-0.5", isDark ? "text-white/60" : "text-gray-600")}>
            {win.state} · {win.credentials}
          </p>
        </div>
        {win.resultLine ? (
          <div className="shrink-0 text-left sm:text-right">
            <p className={cn("font-bold tabular-nums", isDark ? "text-[#D3B574]" : "text-[#B31B1B]")}>
              {win.resultLine}
            </p>
            {win.opponentTeam ? (
              <p
                className={cn(
                  "text-xs mt-0.5 truncate max-w-[220px] sm:ml-auto",
                  isDark ? "text-white/45" : "text-gray-500",
                )}
              >
                {win.opponentTeam}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TournamentQualityWinsBlock({
  block,
  isDark,
  defaultOpen = false,
}: {
  block: ProfileQualityWinsTournamentBlock
  isDark: boolean
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/tournament rounded-xl border border-white/10 overflow-hidden">
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
          isDark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-gray-50/80 hover:bg-gray-100",
        )}
      >
        <div className="min-w-0">
          <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-[#03154C]")}>{block.eventLabel}</p>
          <p className={cn("text-xs mt-0.5", isDark ? "text-white/55" : "text-gray-600")}>
            {block.weightLabel} · {block.record} · {block.wins.length} quality win
            {block.wins.length === 1 ? "" : "s"}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-white/50 transition-transform group-data-[state=open]/tournament:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={cn("space-y-3 border-t px-4 py-4", isDark ? "border-white/10" : "border-gray-200")}>
          {block.wins.map((win) => (
            <QualityWinRow key={`${block.id}-${win.opponentName}-${win.resultLine ?? "na"}`} win={win} isDark={isDark} />
          ))}

          <Collapsible className="group/recap">
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
              <ChevronDown className="h-4 w-4 shrink-0 text-white/50 transition-transform group-data-[state=open]/recap:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div
                className={cn(
                  "rounded-b-lg border border-t-0 px-4 py-4",
                  isDark ? "border-white/10 bg-[#0a2040]/40" : "border-gray-200 bg-red-50/30",
                )}
              >
                <ul className="grid gap-2 sm:grid-cols-2 text-sm">
                  {block.summaryBullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B31B1B]" aria-hidden />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <p className={cn("text-sm mt-4 leading-relaxed italic", isDark ? "text-white/65" : "text-gray-600")}>
                  {block.summaryNote}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {block.resultsPath ? (
            <HardLink
              href={block.resultsPath}
              className={cn(
                "inline-flex min-h-[44px] items-center text-sm font-semibold hover:underline",
                isDark ? "text-[#D3B574] hover:text-[#e8d099]" : "text-[#B31B1B]",
              )}
            >
              {block.resultsLinkLabel ?? "Full results →"}
            </HardLink>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function ProfileQualityWinsSection({
  blocks,
  theme = "dark",
  className,
}: {
  blocks: ProfileQualityWinsTournamentBlock[]
  theme?: "light" | "dark"
  className?: string
}) {
  if (blocks.length === 0) return null

  const isDark = theme === "dark"
  const totalWins = profileQualityWinCount(blocks)
  const tournamentSummary =
    blocks.length === 1
      ? blocks[0]!.eventLabel
      : `${blocks.length} tournaments · ${blocks.map((b) => b.eventLabel).join(", ")}`

  const cardClass = isDark
    ? "profile-card border-t-4 border-t-[#D3B574] border-white/10 bg-[#0f1c2e] shadow-none"
    : "border-t-4 border-t-[#B31B1B] shadow-md"

  return (
    <Collapsible defaultOpen={false} className="group/section">
      <Card id="quality-wins" className={cn(cardClass, className)} data-section="quality-wins">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              PROFILE_SECTION_HEADER,
              "from-[#03154C] to-[#1e3a8a] w-full text-left cursor-pointer",
              isDark ? "" : "",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className={cn(PROFILE_SECTION_TITLE, "flex items-center gap-2")}>
                  <Sparkles className="h-5 w-5 text-[#D3B574]" />
                  Quality Wins
                </CardTitle>
                <p className={cn("text-sm mt-1", isDark ? "text-white/60" : "text-gray-600")}>
                  {totalWins} quality win{totalWins === 1 ? "" : "s"} · {tournamentSummary}
                </p>
              </div>
              <ChevronDown className="h-5 w-5 shrink-0 text-white/50 mt-1 transition-transform group-data-[state=open]/section:rotate-180" />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className={cn("p-4 md:p-6 space-y-3", isDark ? "bg-[#0f1c2e] text-white/85" : "")}>
            {blocks.map((block, index) => (
              <TournamentQualityWinsBlock
                key={block.id}
                block={block}
                isDark={isDark}
                defaultOpen={blocks.length === 1 && index === 0}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
