"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { Activity, Trophy, Zap } from "lucide-react"
import { HorizontalScrollRow } from "@/components/ui/horizontal-scroll-row"
import { NhscaDualsTeamDashboard } from "@/components/national-team/nhsca-duals-team-dashboard"
import { NhscaDualSummaryCard } from "@/components/national-team/nhsca-duals-dual-detail-sheet"
import type { CommandCenterDayFilter, CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import {
  buildDualFeed,
  dualShouldAppearInArchiveFeed,
  getSummaryForScope,
  getWrestlersForScope,
} from "@/lib/nhsca-duals-command-center"
import { resolveNcWrestlerIdForMatch } from "@/lib/nhsca-duals-resolve-nc-wrestler"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { formatNetTeamPoints, wrestlerNetPoints } from "@/lib/nhsca-duals-live-results/scoring"
import { cn } from "@/lib/utils"

export function NhscaDualsResultsCommandCenter({
  snapshot,
  initialScope = "national",
  onScopeChange,
  archiveMode = false,
}: {
  snapshot: NhscaDualsResultsSnapshot
  initialScope?: CommandCenterScope
  onScopeChange?: (scope: CommandCenterScope) => void
  /** Public archive — hide live badge noise, sync scope with page hero toggle */
  archiveMode?: boolean
}) {
  const [scope, setScope] = useState<CommandCenterScope>(initialScope)
  const [dayFilter, setDayFilter] = useState<CommandCenterDayFilter>("all")
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [view, setView] = useState<"dashboard" | "duals">("dashboard")
  const [expandedDualId, setExpandedDualId] = useState<string | null>(null)

  useEffect(() => {
    setScope(initialScope)
  }, [initialScope])

  const setScopeBoth = (next: CommandCenterScope) => {
    setScope(next)
    onScopeChange?.(next)
  }

  const sortedDays = useMemo(
    () => [...snapshot.days].sort((a, b) => a.sort_order - b.sort_order),
    [snapshot.days]
  )

  const summary = useMemo(() => getSummaryForScope(snapshot, scope, dayFilter), [snapshot, scope, dayFilter])
  const wrestlers = useMemo(() => getWrestlersForScope(snapshot, scope, dayFilter), [snapshot, scope, dayFilter])
  const feed = useMemo(
    () => buildDualFeed(snapshot, scope, dayFilter, { includeUnpublishedFinals: archiveMode }),
    [snapshot, scope, dayFilter, archiveMode]
  )

  const filteredFeed = useMemo(() => {
    const visible = archiveMode
      ? feed.filter((item) => dualShouldAppearInArchiveFeed(snapshot, item.dual))
      : feed.filter((f) => f.dual.status === "final" || f.dual.status === "in_progress")
    if (!athleteId) return visible
    return visible.filter((item) =>
      snapshot.matches.some((m) => {
        if (m.dual_id !== item.dual.id || !m.winner || !m.result_type) return false
        const dual = snapshot.duals.find((d) => d.id === m.dual_id)
        return resolveNcWrestlerIdForMatch(m, dual, snapshot.wrestlers) === athleteId
      })
    )
  }, [feed, athleteId, snapshot, archiveMode])

  const liveDualCount = feed.filter((f) => f.dual.status === "in_progress").length
  const dayLabel =
    dayFilter === "all" ? "All days" : sortedDays.find((d) => d.id === dayFilter)?.name ?? "Day"

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-white/10 bg-[#0a2040]/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {!archiveMode ? (
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
                {liveDualCount > 0 ? (
                  <span className="text-[10px] text-white/45 truncate">
                    {liveDualCount} dual{liveDualCount === 1 ? "" : "s"} now
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-0.5">Results</p>
            )}
            <h2 className="text-lg font-black text-white tracking-tight">
              {archiveMode ? "Team & individual results" : "NHSCA Duals Live"}
            </h2>
          </div>
          {!archiveMode ? <Activity className="h-6 w-6 text-[#CBAF5D]/50 shrink-0" aria-hidden /> : null}
        </div>
      </header>

      {!archiveMode ? (
      <div className="flex rounded-lg bg-[#0a2040] border border-white/10 p-0.5 gap-0.5">
        <button
          type="button"
          className={cn(
            "flex-1 min-h-[44px] rounded-md text-xs sm:text-sm font-bold transition-colors",
            view === "dashboard" ? "bg-[#CBAF5D] text-[#002147]" : "text-white/65 hover:text-white"
          )}
          onClick={() => setView("dashboard")}
        >
          Team dashboard
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 min-h-[44px] rounded-md text-xs sm:text-sm font-bold transition-colors",
            view === "duals" ? "bg-[#CBAF5D] text-[#002147]" : "text-white/65 hover:text-white"
          )}
          onClick={() => setView("duals")}
        >
          Live duals
        </button>
      </div>
      ) : null}

      {!archiveMode ? (
      <FilterBar
        sortedDays={sortedDays}
        dayFilter={dayFilter}
        onDayChange={(d) => {
          setDayFilter(d)
          setAthleteId(null)
        }}
        scope={scope}
        onScopeChange={(s) => {
          setScopeBoth(s)
          setAthleteId(null)
        }}
      />
      ) : (
        <FilterBar
          sortedDays={sortedDays}
          dayFilter={dayFilter}
          onDayChange={(d) => {
            setDayFilter(d)
            setAthleteId(null)
          }}
          scope={scope}
          onScopeChange={(s) => {
            setScopeBoth(s)
            setAthleteId(null)
          }}
          hideDayFilter
          teamFilterLabel="Filter results by team"
        />
      )}

      <KpiStrip summary={summary} dayLabel={dayLabel} scope={scope} hideDayLabel={archiveMode} />

      {view === "dashboard" ? (
        <NhscaDualsTeamDashboard
          snapshot={snapshot}
          scope={scope}
          dayFilter={dayFilter}
          dayLabel={archiveMode ? "" : dayLabel}
          archiveMode={archiveMode}
          onSelectAthlete={(id) => {
            setAthleteId(id)
            setView("duals")
          }}
        />
      ) : (
        <>
      {wrestlers.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-[#0a2040]/60 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Filter by athlete</p>
            {athleteId ? (
              <button type="button" className="text-[10px] text-[#CBAF5D] underline" onClick={() => setAthleteId(null)}>
                Clear
              </button>
            ) : null}
          </div>
          <p className="text-[10px] text-white/40 mb-2">Records exclude forfeits; dual scores still include them.</p>
          <HorizontalScrollRow hint="Swipe for more athletes" edgeClassName="from-[#0a2040]/95">
            {wrestlers.map((w) => {
              const active = athleteId === w.wrestlerId
              return (
                <button
                  key={w.wrestlerId}
                  type="button"
                  onClick={() => setAthleteId(active ? null : w.wrestlerId)}
                  className={cn(
                    "shrink-0 snap-start min-w-[100px] min-h-[44px] rounded-lg border px-2.5 py-2 text-left transition-colors",
                    active
                      ? "bg-[#CBAF5D] text-[#002147] border-[#CBAF5D]"
                      : "bg-[#002147]/50 text-white/85 border-white/12 hover:border-[#CBAF5D]/35"
                  )}
                >
                  <p className="text-sm font-bold truncate">{w.name.split(" ")[0]}</p>
                  <p className="text-[10px] opacity-75 tabular-nums">
                    {w.displayWeight} · {w.wins}–{w.losses}
                  </p>
                </button>
              )
            })}
          </HorizontalScrollRow>
        </section>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-[#0a2040]/60 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 bg-[#002147]/35">
          <p className="text-sm font-bold text-white flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[#CBAF5D]" />
            All duals
            {athleteId ? <span className="text-white/40 font-normal text-xs">· filtered</span> : null}
          </p>
          <span className="text-[10px] text-white/35">Tap to expand bouts</span>
        </div>
        <div className="p-3 sm:p-3 space-y-2.5 sm:max-h-[min(65vh,640px)] sm:overflow-y-auto">
          {filteredFeed.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-8">
              {athleteId ? "No bouts for this athlete yet." : archiveMode ? "No dual results yet." : "Duals will appear here when the event starts."}
            </p>
          ) : (
            filteredFeed.map((item) => (
              <NhscaDualSummaryCard
                key={item.dual.id}
                item={item}
                snapshot={snapshot}
                expanded={expandedDualId === item.dual.id}
                onToggle={() =>
                  setExpandedDualId((id) => (id === item.dual.id ? null : item.dual.id))
                }
              />
            ))
          )}
        </div>
      </section>
        </>
      )}
    </div>
  )
}

function FilterBar({
  sortedDays,
  dayFilter,
  onDayChange,
  scope,
  onScopeChange,
  hideTeamScope = false,
  hideDayFilter = false,
  teamFilterLabel = "Team",
}: {
  sortedDays: { id: string; name: string }[]
  dayFilter: CommandCenterDayFilter
  onDayChange: (d: CommandCenterDayFilter) => void
  scope: CommandCenterScope
  onScopeChange: (s: CommandCenterScope) => void
  hideTeamScope?: boolean
  hideDayFilter?: boolean
  teamFilterLabel?: string
}) {
  const teamOptions: { id: CommandCenterScope; label: string }[] = [
    { id: "national", label: "National" },
    { id: "select", label: "Select" },
    { id: "all", label: "Both teams" },
  ]

  return (
    <div className="space-y-2">
      {!hideDayFilter ? (
        <HorizontalScrollRow hint="Swipe for more days" showHint={sortedDays.length > 2}>
          <FilterPill active={dayFilter === "all"} onClick={() => onDayChange("all")}>
            All days
          </FilterPill>
          {sortedDays.map((d) => (
            <FilterPill key={d.id} active={dayFilter === d.id} onClick={() => onDayChange(d.id)}>
              {d.name}
            </FilterPill>
          ))}
        </HorizontalScrollRow>
      ) : null}
      {!hideTeamScope ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5 px-0.5">
            {teamFilterLabel}
          </p>
          <div className="flex rounded-lg bg-[#0a2040] border border-white/10 p-0.5 gap-0.5">
            {teamOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                className={cn(
                  "flex-1 min-h-[44px] rounded-md text-xs sm:text-sm font-bold transition-colors px-1",
                  scope === o.id ? "bg-[#CBAF5D] text-[#002147]" : "text-white/65 hover:text-white"
                )}
                onClick={() => onScopeChange(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 snap-start min-h-[44px] px-3.5 rounded-lg text-sm font-semibold border transition-colors",
        active
          ? "bg-[#CBAF5D] text-[#002147] border-[#CBAF5D]"
          : "bg-[#0a2040] text-white/75 border-white/12 hover:border-white/25"
      )}
    >
      {children}
    </button>
  )
}

function KpiStrip({
  summary,
  dayLabel,
  scope,
  hideDayLabel = false,
}: {
  summary: ReturnType<typeof getSummaryForScope>
  dayLabel: string
  scope: CommandCenterScope
  hideDayLabel?: boolean
}) {
  const scopeLabel = scope === "all" ? "Both teams" : scope === "national" ? "National" : "Select"
  const tiles = [
    { label: "Duals", value: `${summary.dualWins}–${summary.dualLosses}`, icon: Trophy },
    { label: "Bouts", value: `${summary.matchWins}–${summary.matchLosses}`, icon: Activity },
    { label: "Net pts", value: formatNetTeamPoints(wrestlerNetPoints(summary.pointsFor, summary.pointsAgainst)), icon: Zap },
  ]

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1.5 px-0.5">
        {scopeLabel}
        {!hideDayLabel && dayLabel ? ` · ${dayLabel}` : ""}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-white/10 bg-[#002147]/50 px-2.5 py-2.5">
            <t.icon className="h-3.5 w-3.5 text-[#CBAF5D]/60 mb-1" aria-hidden />
            <p className="text-[9px] uppercase tracking-wide text-white/40">{t.label}</p>
            <p className="text-xl font-black text-white tabular-nums leading-tight">{t.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
