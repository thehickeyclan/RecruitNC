"use client"

import { useMemo } from "react"
import { Shield, Star, Trophy } from "lucide-react"
import type { CommandCenterDayFilter, CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import {
  buildDualFeed,
  getSummaryForScope,
  getWrestlersForScope,
} from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsResultsSnapshot, NhscaDualsWrestlerRecord } from "@/lib/nhsca-duals-live-results/types"
import { cn } from "@/lib/utils"

type WrestlerRow = NhscaDualsWrestlerRecord & {
  teamLabel: string
  teamType: "national" | "select"
  bouts: number
}

function enrichWrestlerRows(
  snapshot: NhscaDualsResultsSnapshot,
  records: NhscaDualsWrestlerRecord[]
): WrestlerRow[] {
  return records.map((r) => {
    const w = snapshot.wrestlers.find((x) => x.id === r.wrestlerId)
    const team = snapshot.teams.find((t) => t.id === w?.team_id)
    const teamType = team?.team_type === "select" ? "select" : "national"
    return {
      ...r,
      teamType,
      teamLabel: teamType === "select" ? "Select" : "National",
      bouts: r.wins + r.losses,
    }
  })
}

function DualResultsTable({
  snapshot,
  scope,
  dayFilter,
}: {
  snapshot: NhscaDualsResultsSnapshot
  scope: CommandCenterScope
  dayFilter: CommandCenterDayFilter
}) {
  const completed = useMemo(
    () => buildDualFeed(snapshot, scope, dayFilter).filter((f) => f.dual.status === "final"),
    [snapshot, scope, dayFilter]
  )

  if (completed.length === 0) {
    return (
      <p className="text-xs text-white/45 px-1 py-2">Completed team duals will show here after each match.</p>
    )
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[320px] text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
            <th className="py-2 pl-1 pr-2 font-semibold">Team</th>
            <th className="py-2 pr-2 font-semibold">Opponent</th>
            <th className="py-2 pr-2 font-semibold text-center">Score</th>
            <th className="py-2 pr-1 font-semibold text-right">Result</th>
          </tr>
        </thead>
        <tbody>
          {completed.map(({ dual, teamName, dayName, poolNumber }) => {
            const ncWin = dual.nc_score > dual.opponent_score
            const ncLoss = dual.opponent_score > dual.nc_score
            return (
              <tr key={dual.id} className="border-b border-white/5 last:border-0">
                <td className="py-2.5 pl-1 pr-2 align-top">
                  <p className="font-semibold text-white text-xs leading-tight">{teamName}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    {dayName}
                    {poolNumber != null ? ` · P${poolNumber}` : ""}
                  </p>
                </td>
                <td className="py-2.5 pr-2 align-top text-xs text-white/80 max-w-[120px]">
                  {dual.opponent_team_name}
                </td>
                <td className="py-2.5 pr-2 align-top text-center tabular-nums font-bold text-white whitespace-nowrap">
                  <span className="text-[#CBAF5D]">{dual.nc_score}</span>
                  <span className="text-white/30 mx-1">–</span>
                  <span>{dual.opponent_score}</span>
                </td>
                <td className="py-2.5 pr-1 align-top text-right">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      ncWin && "bg-emerald-600/25 text-emerald-300",
                      ncLoss && "bg-red-600/20 text-red-300",
                      !ncWin && !ncLoss && "bg-white/10 text-white/60"
                    )}
                  >
                    {ncWin ? "Win" : ncLoss ? "Loss" : "Tie"}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#002147]/40 overflow-hidden h-full">
      <div className="px-3 py-2.5 border-b border-white/10 bg-[#002147]/55 flex items-center gap-1.5">
        <span className="text-[#CBAF5D]">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h3>
      </div>
      <div className="p-2.5">{children ?? <p className="text-xs text-white/40 py-2">{empty}</p>}</div>
    </div>
  )
}

export function NhscaDualsTeamDashboard({
  snapshot,
  scope,
  dayFilter,
  dayLabel,
  onSelectAthlete,
}: {
  snapshot: NhscaDualsResultsSnapshot
  scope: CommandCenterScope
  dayFilter: CommandCenterDayFilter
  dayLabel: string
  onSelectAthlete?: (wrestlerId: string) => void
}) {
  const summary = useMemo(() => getSummaryForScope(snapshot, scope, dayFilter), [snapshot, scope, dayFilter])
  const rows = useMemo(
    () => enrichWrestlerRows(snapshot, getWrestlersForScope(snapshot, scope, dayFilter)),
    [snapshot, scope, dayFilter]
  )

  const topPointScorers = useMemo(() => rows.filter((r) => r.pointsFor > 0).slice(0, 12), [rows])
  const undefeatedRows = useMemo(
    () => rows.filter((r) => r.wins > 0 && r.losses === 0).sort((a, b) => b.pointsFor - a.pointsFor),
    [rows]
  )

  const scopeLabel = scope === "all" ? "Both teams" : scope === "national" ? "National" : "Select"
  const topScorerIds = new Set(topPointScorers.map((s) => s.wrestlerId))
  const undefeatedIds = new Set(undefeatedRows.map((u) => u.wrestlerId))

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-[#0a2040]/60 overflow-hidden">
        <header className="px-3 py-2.5 border-b border-white/10 bg-[#002147]/35">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-[#CBAF5D]" />
            Team dual results
          </h3>
          <p className="text-[10px] text-white/40 mt-0.5">
            {scopeLabel} · {dayLabel} · {summary.dualWins}–{summary.dualLosses} in completed duals
          </p>
        </header>
        <div className="p-3">
          <DualResultsTable snapshot={snapshot} scope={scope} dayFilter={dayFilter} />
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_min(280px,32%)] gap-4">
        <section className="rounded-xl border border-white/10 bg-[#0a2040]/60 overflow-hidden min-w-0">
          <header className="px-3 py-2.5 border-b border-white/10 bg-[#002147]/35">
            <h3 className="text-sm font-bold text-white">Athlete records</h3>
            <p className="text-[10px] text-white/40 mt-0.5">
              Every bout across all duals · sorted by team points
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10 bg-[#002147]/25">
                  <th className="py-2 pl-3 pr-2 font-semibold">Athlete</th>
                  <th className="py-2 pr-2 font-semibold text-center">Wt</th>
                  {scope === "all" ? <th className="py-2 pr-2 font-semibold">Team</th> : null}
                  <th className="py-2 pr-2 font-semibold text-center">Record</th>
                  <th className="py-2 pr-2 font-semibold text-center">Bouts</th>
                  <th className="py-2 pr-3 font-semibold text-right">Team pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={scope === "all" ? 6 : 5} className="py-8 text-center text-xs text-white/45">
                      No bout results yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const isUndefeated = undefeatedIds.has(r.wrestlerId) && r.bouts > 0
                    const isTopScorer = topScorerIds.has(r.wrestlerId)
                    return (
                      <tr
                        key={r.wrestlerId}
                        className={cn(
                          "border-b border-white/5 last:border-0 hover:bg-white/[0.03]",
                          isUndefeated && "bg-[#CBAF5D]/5"
                        )}
                      >
                        <td className="py-2.5 pl-3 pr-2 align-middle">
                          <button
                            type="button"
                            className="text-left font-semibold text-white text-sm hover:text-[#CBAF5D] transition-colors"
                            onClick={() => onSelectAthlete?.(r.wrestlerId)}
                          >
                            {r.name}
                          </button>
                          {isUndefeated ? (
                            <span className="ml-1.5 inline-block rounded px-1 py-0.5 text-[9px] font-bold uppercase bg-[#CBAF5D]/20 text-[#CBAF5D]">
                              Undefeated
                            </span>
                          ) : null}
                          {isTopScorer && r.pointsFor > 0 ? (
                            <span className="ml-1 inline-block rounded px-1 py-0.5 text-[9px] font-bold uppercase bg-white/10 text-white/55">
                              Top pts
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-2 align-middle text-center tabular-nums text-xs text-white/70">
                          {r.displayWeight}
                        </td>
                        {scope === "all" ? (
                          <td className="py-2.5 pr-2 align-middle">
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase rounded px-1.5 py-0.5",
                                r.teamType === "national"
                                  ? "bg-[#CBAF5D]/15 text-[#CBAF5D]"
                                  : "bg-white/10 text-white/65"
                              )}
                            >
                              {r.teamLabel}
                            </span>
                          </td>
                        ) : null}
                        <td className="py-2.5 pr-2 align-middle text-center tabular-nums font-bold text-white">
                          {r.wins}–{r.losses}
                        </td>
                        <td className="py-2.5 pr-2 align-middle text-center tabular-nums text-xs text-white/50">
                          {r.bouts}
                        </td>
                        <td className="py-2.5 pr-3 align-middle text-right tabular-nums font-black text-[#CBAF5D]">
                          {r.pointsFor}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-3">
          <LeaderPanel title="Undefeated" icon={<Shield className="h-3.5 w-3.5" />} empty="No undefeated wrestlers yet.">
            {undefeatedRows.length > 0 ? (
              <ul className="space-y-1.5">
                {undefeatedRows.map((u) => (
                  <li key={u.wrestlerId}>
                    <button
                      type="button"
                      onClick={() => onSelectAthlete?.(u.wrestlerId)}
                      className="w-full flex items-center justify-between gap-2 rounded-lg bg-[#002147]/45 border border-white/8 px-2.5 py-2 min-h-[44px] text-left hover:border-[#CBAF5D]/35 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white truncate">{u.name}</span>
                        <span className="text-[10px] text-white/45">
                          {u.displayWeight} lbs
                          {scope === "all" ? ` · ${u.teamLabel}` : ""}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-emerald-400 tabular-nums shrink-0">
                        {u.wins}–0 · +{u.pointsFor}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </LeaderPanel>

          <LeaderPanel
            title="Most team points"
            icon={<Star className="h-3.5 w-3.5" />}
            empty="Points appear as bouts are entered."
          >
            {topPointScorers.length > 0 ? (
              <ul className="space-y-1.5">
                {topPointScorers.map((s, i) => (
                  <li key={s.wrestlerId}>
                    <button
                      type="button"
                      onClick={() => onSelectAthlete?.(s.wrestlerId)}
                      className="w-full flex items-center gap-2 rounded-lg bg-[#002147]/45 border border-white/8 px-2.5 py-2 min-h-[44px] text-left hover:border-[#CBAF5D]/35 transition-colors"
                    >
                      <span className="text-sm font-black text-[#CBAF5D]/80 w-5 tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-white truncate">{s.name}</span>
                        <span className="text-[10px] text-white/45">
                          {s.displayWeight} lbs · {s.wins}–{s.losses}
                          {scope === "all" ? ` · ${s.teamLabel}` : ""}
                        </span>
                      </span>
                      <span className="text-sm font-black text-[#CBAF5D] tabular-nums shrink-0">+{s.pointsFor}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </LeaderPanel>
        </div>
      </div>
    </div>
  )
}
