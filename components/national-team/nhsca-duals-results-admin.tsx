"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { hubPanelClass, hubPanelTitleClass } from "@/components/national-team/nhsca-hub-theme"
import type {
  NhscaDualsMatchRow,
  NhscaDualsMatchWinner,
  NhscaDualsResultType,
  NhscaDualsResultsSnapshot,
} from "@/lib/nhsca-duals-live-results/types"
import { NHSCA_DUALS_WEIGHTS, RESULT_TYPE_OPTIONS, resultTypeLabel } from "@/lib/nhsca-duals-live-results/scoring"
import { cn } from "@/lib/utils"

type TeamView = "national" | "select"

const ROUND_PRESETS = ["Round 1", "Round 2", "Round 3", "Bracket Round", "Custom Round"]

/** One-tap combos for mat-side (most common first). */
const QUICK_NC: { result: NhscaDualsResultType; label: string }[] = [
  { result: "decision", label: "DEC" },
  { result: "major_decision", label: "MD" },
  { result: "tech_fall", label: "TF" },
  { result: "fall", label: "PIN" },
  { result: "forfeit", label: "FF" },
]

const QUICK_OPP: { result: NhscaDualsResultType; label: string }[] = [
  { result: "decision", label: "DEC" },
  { result: "major_decision", label: "MD" },
  { result: "tech_fall", label: "TF" },
  { result: "fall", label: "PIN" },
]

function matchIsComplete(m: NhscaDualsMatchRow | undefined) {
  return !!(m?.winner && m?.result_type)
}

export function NhscaDualsResultsAdmin({
  snapshot,
  onSaved,
}: {
  snapshot: NhscaDualsResultsSnapshot
  onSaved: () => Promise<unknown>
}) {
  const [teamView, setTeamView] = useState<TeamView>("national")
  const [dayId, setDayId] = useState(snapshot.days[0]?.id ?? "")
  const [poolId, setPoolId] = useState("")
  const [dualId, setDualId] = useState("")
  const [showSetup, setShowSetup] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [activeWeight, setActiveWeight] = useState<string>(NHSCA_DUALS_WEIGHTS[0])
  const [flash, setFlash] = useState<string | null>(null)

  const ncTeam = snapshot.teams.find((t) => t.team_type === teamView)

  const teamPools = useMemo(() => {
    if (!ncTeam || !dayId) return []
    return snapshot.pools.filter((p) => p.team_id === ncTeam.id && p.day_id === dayId)
  }, [snapshot.pools, ncTeam, dayId])

  const teamDuals = useMemo(() => {
    if (!ncTeam) return []
    return snapshot.duals.filter((d) => d.team_id === ncTeam.id).sort((a, b) => a.sort_order - b.sort_order)
  }, [snapshot.duals, ncTeam])

  const effectiveDualId = dualId || teamDuals[0]?.id || ""
  const dual = teamDuals.find((d) => d.id === effectiveDualId)

  const dualMatches = useMemo(() => {
    if (!dual) return new Map<string, NhscaDualsMatchRow>()
    const map = new Map<string, NhscaDualsMatchRow>()
    for (const m of snapshot.matches) {
      if (m.dual_id === dual.id) map.set(m.weight, m)
    }
    return map
  }, [dual, snapshot.matches])

  const completedCount = useMemo(() => {
    return NHSCA_DUALS_WEIGHTS.filter((w) => matchIsComplete(dualMatches.get(w))).length
  }, [dualMatches])

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true)
      try {
        const r = await fetch("/api/national-team/duals-results", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error((d as { error?: string }).error ?? "Save failed")
        }
        await onSaved()
      } finally {
        setBusy(false)
      }
    },
    [onSaved]
  )

  const wrestlersForWeight = useCallback(
    (weight: string) => {
      if (!ncTeam) return []
      return snapshot.wrestlers.filter((w) => w.team_id === ncTeam.id && w.display_weight === weight && w.active)
    },
    [snapshot.wrestlers, ncTeam]
  )

  const goToNextWeight = useCallback(
    (afterWeight: string) => {
      const idx = NHSCA_DUALS_WEIGHTS.indexOf(afterWeight as (typeof NHSCA_DUALS_WEIGHTS)[number])
      for (let i = 1; i <= NHSCA_DUALS_WEIGHTS.length; i++) {
        const w = NHSCA_DUALS_WEIGHTS[(idx + i) % NHSCA_DUALS_WEIGHTS.length]
        if (!matchIsComplete(dualMatches.get(w))) {
          setActiveWeight(w)
          return
        }
      }
      if (idx < NHSCA_DUALS_WEIGHTS.length - 1) setActiveWeight(NHSCA_DUALS_WEIGHTS[idx + 1])
    },
    [dualMatches]
  )

  const saveMatch = useCallback(
    async (
      matchId: string,
      fields: {
        nc_wrestler_id?: string | null
        opponent_wrestler_name?: string
        winner: NhscaDualsMatchWinner
        result_type: NhscaDualsResultType
      },
      advanceAfter = true
    ) => {
      setSaving(true)
      try {
        await post({ action: "save_match", matchId, ...fields })
        setFlash(`${activeWeight} saved`)
        window.setTimeout(() => setFlash(null), 1200)
        if (advanceAfter) goToNextWeight(activeWeight)
      } finally {
        setSaving(false)
      }
    },
    [post, activeWeight, goToNextWeight]
  )

  useEffect(() => {
    if (!dual) return
    const firstOpen = NHSCA_DUALS_WEIGHTS.find((w) => !matchIsComplete(dualMatches.get(w)))
    setActiveWeight(firstOpen ?? NHSCA_DUALS_WEIGHTS[0])
  }, [dual?.id])

  const markFinal = () => {
    if (!dual) return
    void post({ action: "set_dual_status", dualId: dual.id, status: "final" })
  }

  if (!ncTeam) return null

  const activeMatch = dual ? dualMatches.get(activeWeight) : undefined
  const activeWrestlers = wrestlersForWeight(activeWeight)

  return (
    <div className="pb-32">
      {dual && (
        <div className="sticky top-0 z-30 -mx-1 px-1 pt-1 pb-2 bg-[#001a33]/95 backdrop-blur-sm border-b border-[#CBAF5D]/25">
          <div className="rounded-xl bg-[#002147] border border-[#CBAF5D]/40 p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex gap-1 rounded-lg bg-[#0a2040] p-0.5 flex-1">
                {(["national", "select"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cn(
                      "flex-1 min-h-[40px] rounded-md text-xs font-bold",
                      teamView === t ? "bg-[#CBAF5D] text-[#002147]" : "text-white/70"
                    )}
                    onClick={() => {
                      setTeamView(t)
                      setDualId("")
                      setPoolId("")
                    }}
                  >
                    {t === "national" ? "National" : "Select"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Dual settings"
                className="min-h-[40px] min-w-[40px] rounded-lg border border-white/20 text-white/80 flex items-center justify-center"
                onClick={() => setShowSetup((s) => !s)}
              >
                <Settings2 className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-3xl font-bold text-[#CBAF5D] tabular-nums leading-none">{dual.nc_score}</p>
                <p className="text-[10px] text-white/50 mt-1">NC</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white tabular-nums leading-none">{dual.opponent_score}</p>
                <p className="text-[10px] text-white/50 mt-1 truncate px-1">{dual.opponent_team_name}</p>
              </div>
            </div>
            <p className="text-center text-xs text-white/55 mt-2">
              {dual.round_name} · {completedCount}/{NHSCA_DUALS_WEIGHTS.length} weights
            </p>
            {flash ? (
              <p className="text-center text-xs font-bold text-[#CBAF5D] mt-1 animate-pulse">{flash}</p>
            ) : null}
          </div>
        </div>
      )}

      {dual && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {teamDuals.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDualId(d.id)}
              className={cn(
                "shrink-0 min-h-[44px] px-4 rounded-full text-sm font-semibold border",
                d.id === effectiveDualId
                  ? "bg-[#CBAF5D] text-[#002147] border-[#CBAF5D]"
                  : "bg-[#0a2040] text-white/80 border-white/15"
              )}
            >
              {d.round_name}
              {d.status === "final" ? " ✓" : ""}
            </button>
          ))}
        </div>
      )}

      {showSetup && dual && (
        <article className={cn(hubPanelClass, "mb-3")}>
          <div className="p-4 space-y-3">
            <p className={hubPanelTitleClass}>Dual setup</p>
            <MobileSelect label="Day" value={dayId} onChange={setDayId}>
              {snapshot.days.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </MobileSelect>
            <MobileSelect
              label="Pool"
              value={poolId || dual.pool_id}
              onChange={setPoolId}
            >
              {teamPools.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  Pool {p.pool_number}
                </SelectItem>
              ))}
            </MobileSelect>
            <button
              type="button"
              className="text-xs text-white/50 underline"
              onClick={() => setShowManage((s) => !s)}
            >
              {showManage ? "Hide" : "Add"} day / pool / dual
            </button>
            {showManage && (
              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-[44px] border-white/25 text-white"
                  disabled={busy}
                  onClick={() => {
                    const name = prompt("Day name (e.g. Day 2)")
                    if (name) void post({ action: "add_day", name })
                  }}
                >
                  + Add day
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-[44px] border-white/25 text-white"
                  disabled={busy || !dayId}
                  onClick={() => {
                    const n = prompt("Pool number")
                    if (n && ncTeam)
                      void post({ action: "add_pool", dayId, teamId: ncTeam.id, poolNumber: parseInt(n, 10) })
                  }}
                >
                  + Add pool
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-[44px] border-white/25 text-white"
                  disabled={busy}
                  onClick={() => {
                    const opp = prompt("Opponent team name")
                    const rnd = prompt("Round name", "Round 1")
                    if (opp && ncTeam)
                      void post({
                        action: "add_dual",
                        teamId: ncTeam.id,
                        dayId,
                        poolId: poolId || dual.pool_id,
                        opponentTeamName: opp,
                        roundName: rnd || "Round 1",
                      })
                  }}
                >
                  + Add dual
                </Button>
              </div>
            )}
          </div>
        </article>
      )}

      {dual && activeMatch && (
        <>
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {NHSCA_DUALS_WEIGHTS.map((w) => {
              const m = dualMatches.get(w)
              const done = matchIsComplete(m)
              const active = w === activeWeight
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setActiveWeight(w)}
                  className={cn(
                    "min-h-[52px] rounded-lg font-mono font-bold text-base border-2 transition-colors",
                    active
                      ? "border-[#CBAF5D] bg-[#CBAF5D]/20 text-[#CBAF5D]"
                      : done
                        ? "border-green-600/50 bg-green-950/40 text-green-400"
                        : "border-white/15 bg-[#0a2040] text-white/70"
                  )}
                >
                  {w}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-[#0a2040] border border-white/15 flex items-center justify-center text-white"
              onClick={() => {
                const i = NHSCA_DUALS_WEIGHTS.indexOf(activeWeight as (typeof NHSCA_DUALS_WEIGHTS)[number])
                if (i > 0) setActiveWeight(NHSCA_DUALS_WEIGHTS[i - 1])
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="text-center flex-1 px-2">
              <p className="text-2xl font-mono font-bold text-[#CBAF5D]">{activeWeight} lbs</p>
              {matchIsComplete(activeMatch) ? (
                <p className="text-xs text-white/60 mt-0.5">
                  Saved — tap a button below to change
                </p>
              ) : (
                <p className="text-xs text-white/60 mt-0.5">Tap NC or Opp result to save</p>
              )}
            </div>
            <button
              type="button"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-[#0a2040] border border-white/15 flex items-center justify-center text-white"
              onClick={() => {
                const i = NHSCA_DUALS_WEIGHTS.indexOf(activeWeight as (typeof NHSCA_DUALS_WEIGHTS)[number])
                if (i < NHSCA_DUALS_WEIGHTS.length - 1) setActiveWeight(NHSCA_DUALS_WEIGHTS[i + 1])
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <MobileMatchEntry
            key={`${activeMatch.id}-${activeMatch.updated_at}`}
            match={activeMatch}
            wrestlers={activeWrestlers}
            saving={saving}
            onQuickSave={(winner, result_type, nc_wrestler_id, opponent_wrestler_name) =>
              saveMatch(activeMatch.id, { winner, result_type, nc_wrestler_id, opponent_wrestler_name })
            }
          />

          <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-[#001a33]/95 border-t border-white/10 backdrop-blur-sm safe-area-pb">
            <Button
              type="button"
              className="w-full min-h-[52px] bg-[#CBAF5D] text-[#002147] font-bold text-base"
              disabled={busy || dual.status === "final"}
              onClick={markFinal}
            >
              Mark dual final
            </Button>
          </div>
        </>
      )}

      {!dual && (
        <p className="text-center text-sm text-white/60 py-8">Select a team and dual to enter results.</p>
      )}

      {busy && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Loader2 className="h-12 w-12 animate-spin text-[#CBAF5D]" />
        </div>
      )}
    </div>
  )
}

function MobileSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-white/60">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="min-h-[48px] bg-[#0a2040] border-white/20 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}

function MobileMatchEntry({
  match,
  wrestlers,
  saving,
  onQuickSave,
}: {
  match: NhscaDualsMatchRow
  wrestlers: { id: string; name: string }[]
  saving: boolean
  onQuickSave: (
    winner: NhscaDualsMatchWinner,
    result_type: NhscaDualsResultType,
    nc_wrestler_id: string | null,
    opponent_wrestler_name: string
  ) => void | Promise<void>
}) {
  const defaultNcId = match.nc_wrestler_id ?? wrestlers[0]?.id ?? ""
  const [ncId, setNcId] = useState(defaultNcId)
  const [oppName, setOppName] = useState(match.opponent_wrestler_name ?? "")
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    setNcId(match.nc_wrestler_id ?? wrestlers[0]?.id ?? "")
    setOppName(match.opponent_wrestler_name ?? "")
  }, [match.id, match.updated_at, match.nc_wrestler_id, match.opponent_wrestler_name, wrestlers])

  const ncName = wrestlers.find((w) => w.id === ncId)?.name ?? "NC wrestler"

  const tap = (winner: NhscaDualsMatchWinner, result_type: NhscaDualsResultType) => {
    if (!ncId && winner === "nc") return
    void onQuickSave(winner, result_type, ncId || null, oppName)
  }

  return (
    <div className="space-y-4">
      {wrestlers.length > 1 ? (
        <div className="grid grid-cols-2 gap-2">
          {wrestlers.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={saving}
              onClick={() => setNcId(w.id)}
              className={cn(
                "min-h-[52px] rounded-xl px-2 text-sm font-bold border-2",
                ncId === w.id
                  ? "border-[#CBAF5D] bg-[#CBAF5D]/15 text-[#CBAF5D]"
                  : "border-white/15 bg-[#0a2040] text-white/80"
              )}
            >
              {w.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-lg font-bold text-white">{ncName}</p>
      )}

      <div>
        <p className="text-xs font-bold text-[#CBAF5D] uppercase tracking-wide mb-2">NC wins — tap to save</p>
        <div className="grid grid-cols-5 gap-1.5">
          {QUICK_NC.map(({ result, label }) => (
            <button
              key={result}
              type="button"
              disabled={saving || !ncId}
              onClick={() => tap("nc", result)}
              className="min-h-[56px] rounded-xl bg-[#B31B1B] hover:bg-[#9a1616] active:scale-95 text-white font-bold text-sm disabled:opacity-40 transition-transform"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-2">Opponent wins — tap to save</p>
        <div className="grid grid-cols-4 gap-1.5">
          {QUICK_OPP.map(({ result, label }) => (
            <button
              key={result}
              type="button"
              disabled={saving}
              onClick={() => tap("opponent", result)}
              className="min-h-[56px] rounded-xl bg-[#0a2040] border-2 border-white/25 hover:border-white/40 active:scale-95 text-white font-bold text-sm disabled:opacity-40 transition-transform"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="w-full min-h-[44px] flex items-center justify-center gap-1 text-sm text-white/55"
        onClick={() => setShowMore((s) => !s)}
      >
        {showMore ? "Less" : "More"}
        <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} />
      </button>

      {showMore && (
        <div className="space-y-3 rounded-xl bg-[#0a2040] border border-white/10 p-4">
          <div className="space-y-1">
            <Label className="text-xs text-white/60">Opponent name (optional)</Label>
            <Input
              className="min-h-[48px] bg-[#002147] border-white/20 text-white text-base"
              placeholder="Last name"
              value={oppName}
              onChange={(e) => setOppName(e.target.value)}
            />
          </div>
          <p className="text-xs text-white/45">Other results</p>
          <div className="grid grid-cols-3 gap-1.5">
            {RESULT_TYPE_OPTIONS.filter((o) => !QUICK_NC.some((q) => q.result === o.value)).map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={saving}
                onClick={() => tap("nc", o.value)}
                className="min-h-[44px] rounded-lg bg-[#0a2040] border border-white/15 text-xs text-white/80 font-semibold"
              >
                NC {o.short}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => tap("draw", "draw")}
              className="min-h-[48px] rounded-xl border border-white/20 text-white font-semibold"
            >
              Draw
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => tap("no_match", "no_match")}
              className="min-h-[48px] rounded-xl border border-white/20 text-white font-semibold"
            >
              No match
            </button>
          </div>
          {match.winner && match.result_type ? (
            <p className="text-xs text-center text-white/50">
              Current: {resultTypeLabel(match.result_type)} —{" "}
              {match.winner === "nc" ? "NC" : match.winner === "opponent" ? "Opp" : match.winner}
            </p>
          ) : null}
        </div>
      )}

      {saving && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#CBAF5D]" />
        </div>
      )}
    </div>
  )
}
