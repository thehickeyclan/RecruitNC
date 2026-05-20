"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { Activity, Radio, Shield, Star, Trophy, Users, Zap } from "lucide-react"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
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
  in_progress: { label: "Live", className: "bg-green-600 text-white animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.5)]" },
  final: { label: "Final", className: "bg-[#CBAF5D]/20 text-[#CBAF5D] border border-[#CBAF5D]/40" },
}

export function NhscaDualsResultsCommandCenter({ snapshot }: { snapshot: NhscaDualsResultsSnapshot }) {
  const [scope, setScope] = useState<CommandCenterScope>("all")
  const [athleteId, setAthleteId] = useState<string | null>(null)

  const summary = useMemo(() => getSummaryForScope(snapshot, scope), [snapshot, scope])
  const wrestlers = useMemo(() => getWrestlersForScope(snapshot, scope), [snapshot, scope])
  const feed = useMemo(() => buildDualFeed(snapshot, scope), [snapshot, scope])

  const selectedWrestler = wrestlers.find((w) => w.wrestlerId === athleteId) ?? null

  const filteredFeed = useMemo(() => {
    if (!athleteId) return feed
    return feed.filter((item) =>
      snapshot.matches.some(
        (m) => m.dual_id === item.dual.id && m.nc_wrestler_id === athleteId && m.winner && m.result_type
      )
    )
  }, [feed, athleteId, snapshot.matches])

  const liveDualCount = feed.filter((f) => f.dual.status === "in_progress").length

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-[#CBAF5D]/25 bg-gradient-to-br from-[#002147] via-[#0a2040] to-[#001a33] p-5 md:p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#CBAF5D]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
              {liveDualCount > 0 ? (
                <span className="text-[10px] text-white/50">{liveDualCount} dual{liveDualCount === 1 ? "" : "s"} in progress</span>
              ) : null}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">NHSCA Duals Command Center</h2>
            <p className="text-sm text-white/55 mt-1 max-w-md">
              Follow NC United National &amp; Select — team totals, athlete leaders, and every dual updating in real time.
            </p>
          </div>
          <Activity className="h-8 w-8 text-[#CBAF5D]/60 shrink-0 hidden sm:block" aria-hidden />
        </div>
      </header>

      <ScopePills scope={scope} onChange={(s) => { setScope(s); setAthleteId(null); setExpandedDualId(null) }} />

      <KpiGrid summary={summary} scope={scope} />

      <section className="rounded-2xl border border-white/10 bg-[#0a2040]/80 p-3 md:p-4">
        <div className="flex items-center justify-between gap-2 mb-3 px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[#CBAF5D] flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Athletes
          </p>
          {athleteId ? (
            <button
              type="button"
              className="text-xs text-white/50 underline"
              onClick={() => setAthleteId(null)}
            >
              Show all
            </button>
          ) : null}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {wrestlers.map((w) => {
            const active = athleteId === w.wrestlerId
            const undefeated = w.wins > 0 && w.losses === 0
            return (
              <button
                key={w.wrestlerId}
                type="button"
                onClick={() => setAthleteId(active ? null : w.wrestlerId)}
                className={cn(
                  "shrink-0 min-w-[120px] rounded-xl border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "bg-[#CBAF5D] text-[#002147] border-[#CBAF5D]"
                    : "bg-[#002147]/60 text-white/85 border-white/15 hover:border-[#CBAF5D]/40"
                )}
              >
                <p className="text-sm font-bold truncate">{w.name.split(" ")[0]}</p>
                <p className="text-[10px] opacity-80 tabular-nums">
                  {w.displayWeight} lbs · {w.wins}–{w.losses}
                  {w.pointsFor > 0 ? ` · +${w.pointsFor}tp` : ""}
                </p>
                {undefeated && w.wins > 0 ? (
                  <span className={cn("text-[9px] font-bold uppercase mt-0.5", active ? "text-[#002147]/70" : "text-green-400")}>
                    Undefeated
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      {selectedWrestler ? (
        <AthleteFocusPanel snapshot={snapshot} wrestler={selectedWrestler} scope={scope} />
      ) : null}

      <div className="grid lg:grid-cols-5 gap-4 md:gap-5">
        <aside className="lg:col-span-2 space-y-4">
          <LeaderPanel
            title="Undefeated"
            icon={<Shield className="h-4 w-4" />}
            empty="No undefeated wrestlers yet."
          >
            {summary.undefeated.length === 0 ? null : (
              <ul className="space-y-2">
                {summary.undefeated.map((u) => (
                  <li key={u.wrestlerId}>
                    <button
                      type="button"
                      onClick={() => setAthleteId(u.wrestlerId)}
                      className="w-full flex items-center justify-between gap-2 rounded-lg bg-[#002147]/50 border border-green-600/30 px-3 py-2 text-left hover:border-green-500/50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-white truncate">{u.name}</span>
                      <span className="text-xs text-green-400 font-bold tabular-nums shrink-0">
                        {u.wins}–0 · +{u.pointsFor}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </LeaderPanel>

          <LeaderPanel
            title="Most team points"
            icon={<Star className="h-4 w-4" />}
            empty="Points will appear as bouts are entered."
          >
            {summary.topScorers.length === 0 ? null : (
              <ul className="space-y-2">
                {summary.topScorers.map((s, i) => (
                  <li key={`${s.name}-${s.displayWeight}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const w = wrestlers.find((x) => x.name === s.name && x.displayWeight === s.displayWeight)
                        if (w) setAthleteId(w.wrestlerId)
                      }}
                      className="w-full flex items-center gap-3 rounded-lg bg-[#002147]/50 border border-white/10 px-3 py-2 text-left hover:border-[#CBAF5D]/35 transition-colors"
                    >
                      <span className="text-lg font-black text-[#CBAF5D]/80 w-6 tabular-nums">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                        <p className="text-[10px] text-white/45">{s.displayWeight} lbs</p>
                      </div>
                      <span className="text-sm font-bold text-[#CBAF5D] tabular-nums shrink-0">+{s.pointsFor}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </LeaderPanel>
        </aside>

        <section className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#0a2040]/60 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-[#002147]/40">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#CBAF5D]" />
              Live dual feed
              {athleteId ? <span className="text-white/45 font-normal">· filtered</span> : null}
            </p>
            <span className="text-[10px] text-white/40 uppercase tracking-wide">Auto-refresh</span>
          </div>
          <div className="p-3 md:p-4 space-y-3 max-h-[min(70vh,720px)] overflow-y-auto">
            {filteredFeed.length === 0 ? (
              <p className="text-sm text-white/50 text-center py-10">
                {athleteId ? "No bouts for this athlete yet." : "Duals will appear here when the event starts."}
              </p>
            ) : (
              filteredFeed.map((item) => (
                <DualFeedCard
                  key={item.dual.id}
                  item={item}
                  snapshot={snapshot}
                  highlightAthleteId={athleteId}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ScopePills({
  scope,
  onChange,
}: {
  scope: CommandCenterScope
  onChange: (s: CommandCenterScope) => void
}) {
  const options: { id: CommandCenterScope; label: string }[] = [
    { id: "all", label: "All NC United" },
    { id: "national", label: "National" },
    { id: "select", label: "Select" },
  ]
  return (
    <div className="flex rounded-xl bg-[#0a2040] border border-white/10 p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={cn(
            "flex-1 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-colors px-2",
            scope === o.id ? "bg-[#CBAF5D] text-[#002147]" : "text-white/70 hover:text-white"
          )}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function KpiGrid({ summary, scope }: { summary: ReturnType<typeof getSummaryForScope>; scope: CommandCenterScope }) {
  const scopeLabel = scope === "all" ? "NC United" : scope === "national" ? "National" : "Select"
  const tiles = [
    { label: "Dual record", value: `${summary.dualWins}–${summary.dualLosses}`, icon: Trophy },
    { label: "Match record", value: `${summary.matchWins}–${summary.matchLosses}`, icon: Activity },
    { label: "Team points", value: String(summary.pointsFor), sub: `vs ${summary.pointsAgainst} against`, icon: Zap },
    {
      label: "Undefeated",
      value: String(summary.undefeated.length),
      sub: summary.undefeated.length === 1 ? "wrestler" : "wrestlers",
      icon: Shield,
    },
  ]

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2 px-1">{scopeLabel} totals</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-[#CBAF5D]/20 bg-gradient-to-b from-[#002147] to-[#0a2040] p-3 md:p-4"
          >
            <t.icon className="h-4 w-4 text-[#CBAF5D]/70 mb-2" aria-hidden />
            <p className="text-[10px] uppercase tracking-wide text-white/45">{t.label}</p>
            <p className="text-2xl md:text-3xl font-black text-white tabular-nums mt-0.5">{t.value}</p>
            {t.sub ? <p className="text-[10px] text-white/40 mt-0.5">{t.sub}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function LeaderPanel({
  title,
  icon,
  empty,
  children,
}: {
  title: string
  icon: React.ReactNode
  empty: string
  children: ReactNode | null
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0a2040]/60 overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#002147]/30">
        <span className="text-[#CBAF5D]">{icon}</span>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </header>
      <div className="p-3 md:p-4">
        {children ?? <p className="text-xs text-white/45 text-center py-4">{empty}</p>}
      </div>
    </article>
  )
}

function AthleteFocusPanel({
  snapshot,
  wrestler,
  scope,
}: {
  snapshot: NhscaDualsResultsSnapshot
  wrestler: { wrestlerId: string; name: string; displayWeight: string; wins: number; losses: number; pointsFor: number }
  scope: CommandCenterScope
}) {
  const bouts = useMemo(() => {
    const teamTypes: ("national" | "select")[] =
      scope === "all" ? ["national", "select"] : [scope === "select" ? "select" : "national"]
    const rows: {
      round: string
      opponent: string
      day: string
      result: string
      pts: number
      win: boolean
    }[] = []

    for (const m of snapshot.matches) {
      if (m.nc_wrestler_id !== wrestler.wrestlerId || !m.winner || !m.result_type) continue
      const dual = snapshot.duals.find((d) => d.id === m.dual_id)
      if (!dual) continue
      const team = snapshot.teams.find((t) => t.id === dual.team_id)
      if (!team || !teamTypes.includes(team.team_type as "national" | "select")) continue
      const day = snapshot.days.find((d) => d.id === dual.day_id)
      const oppWrestler = m.opponent_wrestler_name?.trim()
      rows.push({
        round: dual.round_name,
        opponent: dual.opponent_team_name,
        opponentWrestler: oppWrestler || null,
        note: m.notes?.trim() || null,
        day: day?.name ?? "",
        result: resultTypeLabel(m.result_type),
        pts: m.nc_points,
        win: m.winner === "nc",
      })
    }
    return rows
  }, [snapshot, wrestler.wrestlerId, scope])

  return (
    <article className="rounded-2xl border border-[#CBAF5D]/35 bg-[#002147]/50 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#CBAF5D]">Focused athlete</p>
          <h3 className="text-xl font-black text-white">{wrestler.name}</h3>
          <p className="text-sm text-white/55">{wrestler.displayWeight} lbs</p>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-white tabular-nums">{wrestler.wins}–{wrestler.losses}</p>
            <p className="text-[10px] text-white/45">Record</p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#CBAF5D] tabular-nums">+{wrestler.pointsFor}</p>
            <p className="text-[10px] text-white/45">Team pts</p>
          </div>
        </div>
      </div>
      {bouts.length > 0 ? (
        <ul className="mt-4 grid sm:grid-cols-2 gap-2">
          {bouts.map((b, i) => (
            <li
              key={i}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                b.win ? "border-green-600/40 bg-green-950/30" : "border-red-500/30 bg-red-950/20"
              )}
            >
              <p className="font-semibold text-white/90">
                {b.round} vs {b.opponent}
              </p>
              <p className="text-xs text-white/50">
                {b.day} · {b.win ? "Win" : "Loss"} {b.result} · +{b.pts} tp
                {b.opponentWrestler ? ` · vs ${b.opponentWrestler}` : ""}
              </p>
              {b.note ? <p className="text-[11px] text-amber-200/75 mt-0.5">{b.note}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-white/45 mt-3">No bouts recorded yet.</p>
      )}
    </article>
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
  note,
  resultLabel,
  points,
  highlight,
}: {
  variant: "live" | "next" | "upcoming" | "final"
  weight: string
  wrestlerName: string
  opponentWrestler?: string | null
  note?: string | null
  resultLabel?: string
  points?: string
  highlight?: boolean
}) {
  const isLive = variant === "live"
  const isNext = variant === "next" || variant === "upcoming"
  const isFinal = variant === "final"

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 flex items-center gap-3 transition-colors",
        isLive && "border-green-500/60 bg-green-950/35 ring-1 ring-green-500/30",
        isNext && "border-white/10 bg-white/[0.03] opacity-55",
        isFinal && "border-[#CBAF5D]/30 bg-[#CBAF5D]/5",
        highlight && isLive && "ring-[#CBAF5D]/40"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[9px] font-bold uppercase text-white animate-pulse">
              <Radio className="h-2.5 w-2.5" aria-hidden />
              Live · updating
            </span>
          ) : isFinal ? (
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#CBAF5D]">Last bout</span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
              {variant === "upcoming" ? "Up next" : "On deck"}
            </span>
          )}
        </div>
        <p className={cn("font-mono font-bold", isLive ? "text-green-400" : "text-white/50")}>{weight} lbs</p>
        <p className={cn("text-sm truncate", isLive ? "text-white font-semibold" : "text-white/45")}>{wrestlerName}</p>
        {opponentWrestler ? (
          <p className={cn("text-[11px] truncate", isLive ? "text-white/55" : "text-white/35")}>vs {opponentWrestler}</p>
        ) : null}
        {note && (isFinal || isLive) ? (
          <p className="text-[11px] text-amber-200/80 truncate mt-0.5">{note}</p>
        ) : null}
      </div>
      {resultLabel ? (
        <div className="text-right shrink-0">
          <p className={cn("text-xs font-bold", isLive ? "text-green-400" : "text-white/50")}>{resultLabel}</p>
          {points ? <p className="text-[10px] text-[#CBAF5D]/80 tabular-nums">{points}</p> : null}
        </div>
      ) : null}
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
    if (!lastDone?.match) {
      return <p className="text-xs text-white/45 text-center py-1">Dual final</p>
    }
    const ncWon = lastDone.match!.winner === "nc"
    return (
      <DualBoutRow
        variant="final"
        weight={lastDone.weight}
        wrestlerName={lastDone.wrestlerName}
        opponentWrestler={lastDone.match!.opponent_wrestler_name?.trim() || null}
        note={lastDone.match!.notes?.trim() || null}
        resultLabel={resultTypeLabel(lastDone.match!.result_type)}
        points={ncWon ? `+${lastDone.match!.nc_points} tp` : undefined}
        highlight={!!(highlightAthleteId && lastDone.match?.nc_wrestler_id === highlightAthleteId)}
      />
    )
  }

  if (firstOpenIdx < 0) {
    return <p className="text-xs text-white/45 text-center py-1">All weights complete</p>
  }

  const onDeck = dualMatches[firstOpenIdx]
  const upNext =
    firstOpenIdx + 1 < dualMatches.length && !matchIsComplete(dualMatches[firstOpenIdx + 1].match)
      ? dualMatches[firstOpenIdx + 1]
      : null
  const isLive = dual.status === "in_progress"

  return (
    <div className="space-y-2">
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
      {upNext ? (
        <DualBoutRow variant="next" weight={upNext.weight} wrestlerName={upNext.wrestlerName} />
      ) : null}
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
      : snapshot.wrestlers.find(
          (w) => w.team_id === dual.team_id && w.display_weight === weight && w.active
        )
    return { weight, match: m, wrestlerName: wrestler?.name ?? "—" }
  })

  return (
    <article
      className={cn(
        "rounded-xl border overflow-hidden transition-colors",
        isLiveDual
          ? "border-green-500/45 bg-[#002147]/80 shadow-[0_0_20px_rgba(34,197,94,0.12)]"
          : "border-white/10 bg-[#002147]/40"
      )}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-[#CBAF5D]/90">
              {item.teamType === "national" ? "National" : "Select"} · {dayName}
              {poolNumber != null ? ` · Pool ${poolNumber}` : ""} · {dual.round_name}
            </p>
            <p className="text-base font-bold text-white mt-0.5 truncate">
              {teamName} <span className="text-white/40 font-normal">vs</span> {dual.opponent_team_name}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase", status.className)}>
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={cn("rounded-lg py-2 px-3 text-center border", ncWinning ? "border-[#CBAF5D]/40 bg-[#CBAF5D]/10" : "border-white/10")}>
            <p className="text-[10px] text-white/50 truncate">NC United</p>
            <p className="text-3xl font-black tabular-nums text-[#CBAF5D]">{dual.nc_score}</p>
          </div>
          <div className="rounded-lg py-2 px-3 text-center border border-white/10">
            <p className="text-[10px] text-white/50 truncate">{dual.opponent_team_name}</p>
            <p className="text-3xl font-black tabular-nums text-white">{dual.opponent_score}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500", isLiveDual ? "bg-green-500" : "bg-[#CBAF5D]")}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-white/45 tabular-nums shrink-0">
            {weightsEntered}/{weightsTotal} wt
          </span>
        </div>

        <DualBoutFocus dual={dual} dualMatches={dualMatches} highlightAthleteId={highlightAthleteId} />
      </div>
    </article>
  )
}
