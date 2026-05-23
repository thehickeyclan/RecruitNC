"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { Activity, Radio, Trophy, Zap } from "lucide-react"
import { HorizontalScrollRow } from "@/components/ui/horizontal-scroll-row"
import { NhscaDualsTeamDashboard } from "@/components/national-team/nhsca-duals-team-dashboard"
import type { CommandCenterDayFilter, CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import {
  buildDualFeed,
  getSummaryForScope,
  getWrestlersForScope,
} from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsMatchRow, NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { NHSCA_DUALS_WEIGHTS, resultTypeLabel } from "@/lib/nhsca-duals-live-results/scoring"
import { cn } from "@/lib/utils"

const STATUS: Record<string, { label: string; className: string }> = {
  not_started: { label: "Upcoming", className: "bg-white/10 text-white/70" },
  in_progress: { label: "Live", className: "bg-green-600 text-white animate-pulse" },
  final: { label: "Final", className: "bg-[#CBAF5D]/20 text-[#CBAF5D] border border-[#CBAF5D]/40" },
}

export function NhscaDualsResultsCommandCenter({ snapshot }: { snapshot: NhscaDualsResultsSnapshot }) {
  const [scope, setScope] = useState<CommandCenterScope>("all")
  const [dayFilter, setDayFilter] = useState<CommandCenterDayFilter>("all")
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [view, setView] = useState<"dashboard" | "duals">("dashboard")

  const sortedDays = useMemo(
    () => [...snapshot.days].sort((a, b) => a.sort_order - b.sort_order),
    [snapshot.days]
  )

  const summary = useMemo(() => getSummaryForScope(snapshot, scope, dayFilter), [snapshot, scope, dayFilter])
  const wrestlers = useMemo(() => getWrestlersForScope(snapshot, scope, dayFilter), [snapshot, scope, dayFilter])
  const feed = useMemo(() => buildDualFeed(snapshot, scope, dayFilter), [snapshot, scope, dayFilter])

  const filteredFeed = useMemo(() => {
    if (!athleteId) return feed
    return feed.filter((item) =>
      snapshot.matches.some(
        (m) => m.dual_id === item.dual.id && m.nc_wrestler_id === athleteId && m.winner && m.result_type
      )
    )
  }, [feed, athleteId, snapshot.matches])

  const liveDualCount = feed.filter((f) => f.dual.status === "in_progress").length
  const dayLabel =
    dayFilter === "all" ? "All days" : sortedDays.find((d) => d.id === dayFilter)?.name ?? "Day"

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-white/10 bg-[#0a2040]/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
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
            <h2 className="text-lg font-black text-white tracking-tight">NHSCA Duals Live</h2>
          </div>
          <Activity className="h-6 w-6 text-[#CBAF5D]/50 shrink-0" aria-hidden />
        </div>
      </header>

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

      <FilterBar
        sortedDays={sortedDays}
        dayFilter={dayFilter}
        onDayChange={(d) => {
          setDayFilter(d)
          setAthleteId(null)
        }}
        scope={scope}
        onScopeChange={(s) => {
          setScope(s)
          setAthleteId(null)
        }}
      />

      <KpiStrip summary={summary} dayLabel={dayLabel} scope={scope} />

      {view === "dashboard" ? (
        <NhscaDualsTeamDashboard
          snapshot={snapshot}
          scope={scope}
          dayFilter={dayFilter}
          dayLabel={dayLabel}
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
            Duals
            {athleteId ? <span className="text-white/40 font-normal text-xs">· filtered</span> : null}
          </p>
          <span className="text-[10px] text-white/35">Updates every 10s</span>
        </div>
        <div className="p-3 sm:p-3 space-y-2.5 sm:max-h-[min(65vh,640px)] sm:overflow-y-auto">
          {filteredFeed.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-8">
              {athleteId ? "No bouts for this athlete yet." : "Duals will appear here when the event starts."}
            </p>
          ) : (
            filteredFeed.map((item) => (
              <DualFeedCard key={item.dual.id} item={item} snapshot={snapshot} highlightAthleteId={athleteId} />
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
}: {
  sortedDays: { id: string; name: string }[]
  dayFilter: CommandCenterDayFilter
  onDayChange: (d: CommandCenterDayFilter) => void
  scope: CommandCenterScope
  onScopeChange: (s: CommandCenterScope) => void
}) {
  const teamOptions: { id: CommandCenterScope; label: string }[] = [
    { id: "all", label: "All" },
    { id: "national", label: "National" },
    { id: "select", label: "Select" },
  ]

  return (
    <div className="space-y-2">
      <HorizontalScrollRow hint="Swipe for more days" showHint={sortedDays.length > 2}>
        <FilterPill active={dayFilter === "all"} onClick={() => onDayChange("all")}>
          All
        </FilterPill>
        {sortedDays.map((d) => (
          <FilterPill key={d.id} active={dayFilter === d.id} onClick={() => onDayChange(d.id)}>
            {d.name}
          </FilterPill>
        ))}
      </HorizontalScrollRow>
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
}: {
  summary: ReturnType<typeof getSummaryForScope>
  dayLabel: string
  scope: CommandCenterScope
}) {
  const scopeLabel = scope === "all" ? "Both teams" : scope === "national" ? "National" : "Select"
  const tiles = [
    { label: "Duals", value: `${summary.dualWins}–${summary.dualLosses}`, icon: Trophy },
    { label: "Bouts", value: `${summary.matchWins}–${summary.matchLosses}`, icon: Activity },
    { label: "Team pts", value: String(summary.pointsFor), icon: Zap },
  ]

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1.5 px-0.5">
        {scopeLabel} · {dayLabel}
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

type DualMatchRow = {
  weight: string
  match: NhscaDualsMatchRow | undefined
  wrestlerName: string
}

function matchIsComplete(m: DualMatchRow["match"]) {
  return !!(m?.winner && m?.result_type)
}

function DualBoutRow({
  variant,
  weight,
  wrestlerName,
  opponentWrestler,
  resultLabel,
  highlight,
}: {
  variant: "live" | "next" | "upcoming" | "final"
  weight: string
  wrestlerName: string
  opponentWrestler?: string | null
  resultLabel?: string
  highlight?: boolean
}) {
  const isLive = variant === "live"
  const isFinal = variant === "final"

  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 flex items-center gap-2",
        isLive && "border-green-500/50 bg-green-950/30",
        (variant === "next" || variant === "upcoming") && "border-white/8 bg-white/[0.02] opacity-60",
        isFinal && "border-[#CBAF5D]/25 bg-[#CBAF5D]/5",
        highlight && isLive && "ring-1 ring-[#CBAF5D]/40"
      )}
    >
      <div className="min-w-0 flex-1">
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-green-400 mb-0.5">
            <Radio className="h-2.5 w-2.5" aria-hidden />
            On the mat
          </span>
        ) : isFinal ? (
          <span className="text-[9px] font-bold uppercase text-[#CBAF5D]/80">Last bout</span>
        ) : (
          <span className="text-[9px] font-bold uppercase text-white/35">Up next</span>
        )}
        <p className="text-sm font-mono font-bold text-white/90">{weight} lbs</p>
        <p className={cn("text-xs truncate", isLive ? "text-white font-medium" : "text-white/45")}>{wrestlerName}</p>
        {opponentWrestler ? <p className="text-[10px] text-white/40 truncate">vs {opponentWrestler}</p> : null}
      </div>
      {resultLabel ? <p className="text-xs font-bold text-[#CBAF5D] shrink-0">{resultLabel}</p> : null}
    </div>
  )
}

function DualBoutFocus({
  dual,
  dualMatches,
  highlightAthleteId,
}: {
  dual: ReturnType<typeof buildDualFeed>[number]["dual"]
  dualMatches: DualMatchRow[]
  highlightAthleteId: string | null
}) {
  const firstOpenIdx = dualMatches.findIndex(({ match }) => !matchIsComplete(match))

  if (dual.status === "final") {
    const lastDone = [...dualMatches].reverse().find(({ match }) => matchIsComplete(match))
    if (!lastDone?.match) return null
    const ncWon = lastDone.match!.winner === "nc"
    return (
      <DualBoutRow
        variant="final"
        weight={lastDone.weight}
        wrestlerName={lastDone.wrestlerName}
        opponentWrestler={lastDone.match!.opponent_wrestler_name?.trim() || null}
        resultLabel={ncWon ? resultTypeLabel(lastDone.match!.result_type) : undefined}
        highlight={!!(highlightAthleteId && lastDone.match?.nc_wrestler_id === highlightAthleteId)}
      />
    )
  }

  if (firstOpenIdx < 0) return null

  const onDeck = dualMatches[firstOpenIdx]
  const upNext =
    firstOpenIdx + 1 < dualMatches.length && !matchIsComplete(dualMatches[firstOpenIdx + 1].match)
      ? dualMatches[firstOpenIdx + 1]
      : null
  const isLive = dual.status === "in_progress"

  return (
    <div className="space-y-1.5">
      {isLive ? (
        <DualBoutRow
          variant="live"
          weight={onDeck.weight}
          wrestlerName={onDeck.wrestlerName}
          opponentWrestler={onDeck.match?.opponent_wrestler_name?.trim() || null}
          highlight={!!(highlightAthleteId && onDeck.match?.nc_wrestler_id === highlightAthleteId)}
        />
      ) : (
        <DualBoutRow variant="upcoming" weight={onDeck.weight} wrestlerName={onDeck.wrestlerName} />
      )}
      {upNext ? <DualBoutRow variant="next" weight={upNext.weight} wrestlerName={upNext.wrestlerName} /> : null}
    </div>
  )
}

function DualFeedCard({
  item,
  snapshot,
  highlightAthleteId,
}: {
  item: ReturnType<typeof buildDualFeed>[number]
  snapshot: NhscaDualsResultsSnapshot
  highlightAthleteId: string | null
}) {
  const { dual, teamName, dayName, poolNumber, weightsEntered, weightsTotal } = item
  const status = STATUS[dual.status] ?? STATUS.not_started
  const ncWinning = dual.nc_score > dual.opponent_score
  const progress = weightsTotal > 0 ? (weightsEntered / weightsTotal) * 100 : 0
  const isLiveDual = dual.status === "in_progress"

  const dualMatches: DualMatchRow[] = NHSCA_DUALS_WEIGHTS.map((weight) => {
    const m = snapshot.matches.find((x) => x.dual_id === dual.id && x.weight === weight)
    const wrestler = m?.nc_wrestler_id
      ? snapshot.wrestlers.find((w) => w.id === m.nc_wrestler_id)
      : snapshot.wrestlers.find((w) => w.team_id === dual.team_id && w.display_weight === weight && w.active)
    return { weight, match: m, wrestlerName: wrestler?.name ?? "—" }
  })

  return (
    <article
      className={cn(
        "rounded-lg border overflow-hidden",
        isLiveDual ? "border-green-500/40 bg-[#002147]/70" : "border-white/10 bg-[#002147]/35"
      )}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-white/45 truncate">
              {dayName}
              {poolNumber != null ? ` · Pool ${poolNumber}` : ""} · {dual.round_name}
            </p>
            <p className="text-sm font-bold text-white leading-snug line-clamp-2">
              {teamName} vs {dual.opponent_team_name}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase", status.className)}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className={cn("flex-1 text-center rounded-md py-1.5 border", ncWinning ? "border-[#CBAF5D]/35 bg-[#CBAF5D]/10" : "border-white/10")}>
            <p className="text-2xl font-black tabular-nums text-[#CBAF5D] leading-none">{dual.nc_score}</p>
            <p className="text-[9px] text-white/40 mt-0.5">NC</p>
          </div>
          <span className="text-white/25 text-xs font-bold">vs</span>
          <div className="flex-1 text-center rounded-md py-1.5 border border-white/10">
            <p className="text-2xl font-black tabular-nums text-white leading-none">{dual.opponent_score}</p>
            <p className="text-[9px] text-white/40 mt-0.5 line-clamp-2 leading-tight px-0.5">{dual.opponent_team_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500", isLiveDual ? "bg-green-500" : "bg-[#CBAF5D]")}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[9px] text-white/40 tabular-nums shrink-0">
            {weightsEntered}/{weightsTotal}
          </span>
        </div>

        <DualBoutFocus dual={dual} dualMatches={dualMatches} highlightAthleteId={highlightAthleteId} />
      </div>
    </article>
  )
}
