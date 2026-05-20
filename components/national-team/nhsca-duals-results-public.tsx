"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import {
  hubPanelClass,
  hubPanelHeaderClass,
  hubPanelTitleClass,
} from "@/components/national-team/nhsca-hub-theme"
import type { NhscaDualsDualRow, NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { NHSCA_DUALS_WEIGHTS, resultTypeLabel } from "@/lib/nhsca-duals-live-results/scoring"
import { cn } from "@/lib/utils"

type TeamView = "national" | "select"

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  final: "Final",
}

export function NhscaDualsResultsPublic({ snapshot }: { snapshot: NhscaDualsResultsSnapshot }) {
  const [teamView, setTeamView] = useState<TeamView>("national")
  const [dualId, setDualId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const ncTeam = snapshot.teams.find((t) => t.team_type === teamView)
  const summary = snapshot.summaries[teamView]

  const teamDuals = useMemo(() => {
    if (!ncTeam) return []
    return snapshot.duals
      .filter((d) => d.team_id === ncTeam.id && d.published)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [snapshot.duals, ncTeam])

  const selectedDual: NhscaDualsDualRow | null =
    teamDuals.find((d) => d.id === dualId) ?? teamDuals[0] ?? null

  const day = selectedDual ? snapshot.days.find((d) => d.id === selectedDual.day_id) : null
  const pool = selectedDual ? snapshot.pools.find((p) => p.id === selectedDual.pool_id) : null

  const dualMatches = useMemo(() => {
    if (!selectedDual) return []
    return NHSCA_DUALS_WEIGHTS.map((weight) => {
      const m = snapshot.matches.find((x) => x.dual_id === selectedDual.id && x.weight === weight)
      const wrestler = m?.nc_wrestler_id
        ? snapshot.wrestlers.find((w) => w.id === m.nc_wrestler_id)
        : snapshot.wrestlers.find(
            (w) => w.team_id === ncTeam?.id && w.display_weight === weight && w.active
          )
      return { weight, match: m, wrestlerName: wrestler?.name ?? "—" }
    })
  }, [selectedDual, snapshot.matches, snapshot.wrestlers, ncTeam?.id])

  const upcoming = teamDuals.filter((d) => d.status !== "final")
  const completed = teamDuals.filter((d) => d.status === "final")

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl bg-[#0a2040] border border-white/10 p-1 gap-1">
        {(["national", "select"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={cn(
              "flex-1 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold transition-colors px-1",
              teamView === t ? "bg-[#CBAF5D] text-[#002147]" : "text-white/70 hover:text-white"
            )}
            onClick={() => {
              setTeamView(t)
              setDualId(null)
            }}
          >
            {t === "national" ? "National Team" : "Select Team"}
          </button>
        ))}
      </div>

      {ncTeam && selectedDual && (
        <article className={hubPanelClass}>
          <header className={hubPanelHeaderClass}>
            <p className="text-xs text-[#CBAF5D] font-semibold uppercase tracking-wide">
              {day?.name ?? "Day"} · Pool {pool?.pool_number ?? "—"} · {selectedDual.round_name}
            </p>
            <h3 className={hubPanelTitleClass}>
              {ncTeam.name} vs {selectedDual.opponent_team_name}
            </h3>
            <p className="text-sm text-white/60 mt-1">{STATUS_LABEL[selectedDual.status] ?? selectedDual.status}</p>
          </header>
          <div className="px-5 pb-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-[#002147] border border-[#CBAF5D]/30 py-4 px-2">
                <p className="text-xs text-white/60 truncate">{ncTeam.name}</p>
                <p className="text-3xl font-bold text-[#CBAF5D] tabular-nums">{selectedDual.nc_score}</p>
              </div>
              <div className="rounded-xl bg-[#002147] border border-white/10 py-4 px-2">
                <p className="text-xs text-white/60 truncate">{selectedDual.opponent_team_name}</p>
                <p className="text-3xl font-bold text-white tabular-nums">{selectedDual.opponent_score}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1 py-2 text-sm text-white/60 border-t border-white/10"
            onClick={() => setExpanded((e) => !e)}
          >
            Match-by-match {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/50 border-b border-white/10">
                    <th className="py-2 pl-4 pr-2">Wt</th>
                    <th className="py-2 pr-2">NC</th>
                    <th className="py-2 pr-2 hidden sm:table-cell">Opp</th>
                    <th className="py-2 pr-2">Result</th>
                    <th className="py-2 pr-4 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {dualMatches.map(({ weight, match, wrestlerName }) => {
                    const hasResult = match?.winner && match.result_type
                    const ncWon = match?.winner === "nc"
                    const pts = ncWon ? match?.nc_points : match?.opponent_points
                    return (
                      <tr key={weight} className="border-b border-white/5">
                        <td className="py-2.5 pl-4 font-mono text-[#CBAF5D]">{weight}</td>
                        <td className="py-2.5 pr-2 max-w-[100px] truncate">{wrestlerName}</td>
                        <td className="py-2.5 pr-2 hidden sm:table-cell max-w-[100px] truncate text-white/70">
                          {match?.opponent_wrestler_name || "—"}
                        </td>
                        <td className="py-2.5 pr-2 text-white/80">
                          {hasResult ? resultTypeLabel(match.result_type) : "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {hasResult && ncWon ? (
                            <span className="text-[#CBAF5D]">+{match.nc_points}</span>
                          ) : hasResult && match?.winner === "opponent" ? (
                            <span className="text-white/50">—</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}

      <div className="flex flex-wrap gap-2">
        {teamDuals.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDualId(d.id)}
            className={cn(
              "min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold border transition-colors",
              (dualId ?? teamDuals[0]?.id) === d.id
                ? "bg-[#CBAF5D] text-[#002147] border-[#CBAF5D]"
                : "bg-[#0a2040] text-white/80 border-white/15 hover:border-white/30"
            )}
          >
            {d.round_name} vs {d.opponent_team_name.split(" ")[0]}
            {d.status === "final" ? " ✓" : ""}
          </button>
        ))}
      </div>

      <article className={hubPanelClass}>
        <header className={hubPanelHeaderClass}>
          <h3 className={hubPanelTitleClass}>Team summary</h3>
        </header>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Stat label="Dual record" value={`${summary.dualWins}-${summary.dualLosses}`} />
          <Stat label="Match W-L" value={`${summary.matchWins}-${summary.matchLosses}`} />
          <Stat label="Points for" value={String(summary.pointsFor)} />
          <Stat label="Points against" value={String(summary.pointsAgainst)} />
        </div>
        {summary.undefeated.length > 0 && (
          <div className="px-5 pb-3 text-sm text-white/80">
            <p className="text-xs font-semibold text-[#CBAF5D] uppercase mb-1">Undefeated</p>
            {summary.undefeated.map((u) => (
              <span key={u.wrestlerId} className="inline-block mr-2">
                {u.name} ({u.displayWeight})
              </span>
            ))}
          </div>
        )}
        {summary.topScorers.length > 0 && (
          <div className="px-5 pb-5 text-sm text-white/80">
            <p className="text-xs font-semibold text-[#CBAF5D] uppercase mb-1">Top scorers</p>
            {summary.topScorers.map((s, i) => (
              <div key={i}>
                {s.name} — {s.pointsFor} team pts
              </div>
            ))}
          </div>
        )}
      </article>

      {(upcoming.length > 0 || completed.length > 0) && (
        <article className={hubPanelClass}>
          <header className={hubPanelHeaderClass}>
            <h3 className={hubPanelTitleClass}>Schedule</h3>
          </header>
          <ul className="divide-y divide-white/10 text-sm">
            {upcoming.map((d) => (
              <li key={d.id} className="px-5 py-3 flex justify-between gap-2">
                <span>
                  {d.round_name} vs {d.opponent_team_name}
                </span>
                <span className="text-[#CBAF5D] shrink-0">{STATUS_LABEL[d.status]}</span>
              </li>
            ))}
            {completed.map((d) => (
              <li key={d.id} className="px-5 py-3 flex justify-between gap-2 text-white/60">
                <span>
                  {d.round_name} vs {d.opponent_team_name}
                </span>
                <span className="tabular-nums shrink-0">
                  {d.nc_score}-{d.opponent_score} Final
                </span>
              </li>
            ))}
          </ul>
        </article>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-lg font-bold text-white tabular-nums">{value}</p>
    </div>
  )
}
