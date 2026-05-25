"use client"

import { useMemo, useState } from "react"
import { Shield, Star, Trophy } from "lucide-react"
import { NhscaDualSummaryCard } from "@/components/national-team/nhsca-duals-dual-detail-sheet"
import type { CommandCenterDayFilter, CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import {
  buildDualFeed,
  getWrestlersForScope,
} from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsResultsSnapshot, NhscaDualsWrestlerRecord } from "@/lib/nhsca-duals-live-results/types"
import { formatNetTeamPoints, wrestlerNetPoints } from "@/lib/nhsca-duals-live-results/scoring"
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

function DualResultsList({
  snapshot,
  scope,
  dayFilter,
}: {
  snapshot: NhscaDualsResultsSnapshot
  scope: CommandCenterScope
  dayFilter: CommandCenterDayFilter
}) {
  const [expandedDualId, setExpandedDualId] = useState<string | null>(null)
  const completed = useMemo(
    () => buildDualFeed(snapshot, scope, dayFilter).filter((f) => f.dual.status === "final" || f.dual.status === "in_progress"),
    [snapshot, scope, dayFilter]
  )

  if (completed.length === 0) {
    return (
      <p className="text-xs text-white/45 px-1 py-2">Team duals will show here — tap one to see every bout.</p>
    )
  }

  return (
    <ul className="space-y-2">
      {completed.map((item) => (
        <li key={item.dual.id}>
          <NhscaDualSummaryCard
            item={item}
            snapshot={snapshot}
            expanded={expandedDualId === item.dual.id}
            onToggle={() =>
              setExpandedDualId((id) => (id === item.dual.id ? null : item.dual.id))
            }
          />
        </li>
      ))}
    </ul>
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
  const rows = useMemo(
    () => enrichWrestlerRows(snapshot, getWrestlersForScope(snapshot, scope, dayFilter)),
    [snapshot, scope, dayFilter]
  )

  const topPointScorers = useMemo(() => rows.filter((r) => r.bouts > 0).slice(0, 12), [rows])
  const undefeatedRows = useMemo(
    () =>
      rows
        .filter((r) => r.wins > 0 && r.losses === 0)
        .sort(
          (a, b) => wrestlerNetPoints(b.pointsFor, b.pointsAgainst) - wrestlerNetPoints(a.pointsFor, a.pointsAgainst)
        ),
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
            Tap a dual to expand every bout · {scopeLabel} · {dayLabel}
          </p>
        </header>
        <div className="p-3">
          <DualResultsList snapshot={snapshot} scope={scope} dayFilter={dayFilter} />
        </div>
      </section>

      <div className="space-y-4 lg:grid lg:grid-cols-[1fr_min(280px,32%)] lg:gap-4 lg:space-y-0">
        <section className="rounded-xl border border-white/10 bg-[#0a2040]/60 overflow-hidden min-w-0">
          <header className="px-3 py-2.5 border-b border-white/10 bg-[#002147]/35">
            <h3 className="text-sm font-bold text-white">Athlete records</h3>
            <p className="text-[10px] text-white/40 mt-0.5">All bouts · sorted by net team points</p>
          </header>

          {/* Mobile: simple cards */}
          <ul className="md:hidden divide-y divide-white/5">
            {rows.length === 0 ? (
              <li className="py-8 text-center text-xs text-white/45">No bout results yet.</li>
            ) : (
              rows.map((r) => {
                const net = wrestlerNetPoints(r.pointsFor, r.pointsAgainst)
                return (
                  <li key={r.wrestlerId}>
                    <button
                      type="button"
                      onClick={() => onSelectAthlete?.(r.wrestlerId)}
                      className="w-full flex items-center gap-3 px-3 py-3 min-h-[52px] text-left active:bg-white/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                        <p className="text-[10px] text-white/45 mt-0.5">
                          {r.displayWeight} lbs
                          {scope === "all" ? ` · ${r.teamLabel}` : ""}
                          {undefeatedIds.has(r.wrestlerId) && r.bouts > 0 ? " · Undefeated" : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black tabular-nums text-white">{r.wins}–{r.losses}</p>
                        <p
                          className={cn(
                            "text-xs font-bold tabular-nums",
                            net >= 0 ? "text-[#CBAF5D]" : "text-red-300"
                          )}
                        >
                          {formatNetTeamPoints(net)} pts
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10 bg-[#002147]/25">
                  <th className="py-2 pl-3 pr-2 font-semibold">Athlete</th>
                  <th className="py-2 pr-2 font-semibold text-center">Wt</th>
                  {scope === "all" ? <th className="py-2 pr-2 font-semibold">Team</th> : null}
                  <th className="py-2 pr-2 font-semibold text-center">Record</th>
                  <th className="py-2 pr-2 font-semibold text-center">Bouts</th>
                  <th className="py-2 pr-3 font-semibold text-right">Net pts</th>
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
                    const net = wrestlerNetPoints(r.pointsFor, r.pointsAgainst)
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
                          {isTopScorer && r.bouts > 0 ? (
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
                        <td
                          className={cn(
                            "py-2.5 pr-3 align-middle text-right tabular-nums font-black",
                            net >= 0 ? "text-[#CBAF5D]" : "text-red-300"
                          )}
                        >
                          {formatNetTeamPoints(net)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-3 lg:space-y-3">
          <LeaderPanel title="Undefeated" icon={<Shield className="h-3.5 w-3.5" />} empty="No undefeated wrestlers yet.">
            {undefeatedRows.length > 0 ? (
              <ul className="space-y-1.5">
                {undefeatedRows.map((u) => {
                  const net = wrestlerNetPoints(u.pointsFor, u.pointsAgainst)
                  return (
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
                          {u.wins}–0 · {formatNetTeamPoints(net)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </LeaderPanel>

          <LeaderPanel
            title="Net team points"
            icon={<Star className="h-3.5 w-3.5" />}
            empty="Points appear as bouts are entered."
          >
            {topPointScorers.length > 0 ? (
              <ul className="space-y-1.5">
                {topPointScorers.map((s, i) => {
                  const net = wrestlerNetPoints(s.pointsFor, s.pointsAgainst)
                  return (
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
                        <span
                          className={cn(
                            "text-sm font-black tabular-nums shrink-0",
                            net >= 0 ? "text-[#CBAF5D]" : "text-red-300"
                          )}
                        >
                          {formatNetTeamPoints(net)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </LeaderPanel>
        </div>
      </div>
    </div>
  )
}
