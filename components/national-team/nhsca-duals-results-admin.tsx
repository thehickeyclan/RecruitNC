"use client"

import type { ReactNode } from "react"
import { useCallback, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
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
import { hubPanelClass, hubPanelHeaderClass, hubPanelTitleClass } from "@/components/national-team/nhsca-hub-theme"
import type { NhscaDualsMatchWinner, NhscaDualsResultType, NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { NHSCA_DUALS_WEIGHTS, RESULT_TYPE_OPTIONS } from "@/lib/nhsca-duals-live-results/scoring"
import { cn } from "@/lib/utils"

type TeamView = "national" | "select"

const ROUND_PRESETS = ["Round 1", "Round 2", "Round 3", "Bracket Round", "Custom Round"]

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
  const [roundName, setRoundName] = useState("Round 1")
  const [opponent, setOpponent] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [activeWeight, setActiveWeight] = useState<string | null>(null)
  const [showManage, setShowManage] = useState(false)

  const ncTeam = snapshot.teams.find((t) => t.team_type === teamView)

  const teamPools = useMemo(() => {
    if (!ncTeam || !dayId) return []
    return snapshot.pools.filter((p) => p.team_id === ncTeam.id && p.day_id === dayId)
  }, [snapshot.pools, ncTeam, dayId])

  const teamDuals = useMemo(() => {
    if (!ncTeam) return []
    return snapshot.duals.filter((d) => d.team_id === ncTeam.id).sort((a, b) => a.sort_order - b.sort_order)
  }, [snapshot.duals, ncTeam])

  const selectedDual = teamDuals.find((d) => d.id === dualId) ?? teamDuals[0]

  const effectivePoolId = poolId || selectedDual?.pool_id || teamPools[0]?.id || ""
  const effectiveDualId = dualId || selectedDual?.id || ""

  const dual = teamDuals.find((d) => d.id === effectiveDualId)

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

  const saveMatch = async (
    matchId: string,
    fields: {
      nc_wrestler_id?: string | null
      opponent_wrestler_name?: string
      winner?: NhscaDualsMatchWinner | null
      result_type?: NhscaDualsResultType | null
    }
  ) => {
    setSaving(matchId)
    try {
      await post({ action: "save_match", matchId, ...fields })
    } finally {
      setSaving(null)
    }
  }

  const markFinal = () => {
    if (!dual) return
    void post({ action: "set_dual_status", dualId: dual.id, status: "final" })
  }

  if (!ncTeam) return null

  return (
    <div className="space-y-3 pb-24">
      {dual && (
        <div className="sticky top-0 z-20 rounded-xl bg-[#002147] border border-[#CBAF5D]/40 p-4 shadow-lg">
          <p className="text-xs text-white/60 text-center mb-1">Running dual score</p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-[#CBAF5D] tabular-nums">{dual.nc_score}</p>
              <p className="text-[10px] text-white/50 truncate">NC</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">{dual.opponent_score}</p>
              <p className="text-[10px] text-white/50 truncate">{dual.opponent_team_name}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              size="sm"
              className="flex-1 min-h-[40px] bg-[#CBAF5D] text-[#002147] hover:bg-[#D3B574]"
              disabled={busy || dual.status === "final"}
              onClick={markFinal}
            >
              Mark dual final
            </Button>
          </div>
        </div>
      )}

      <article className={hubPanelClass}>
        <header className={hubPanelHeaderClass}>
          <h3 className={hubPanelTitleClass}>Mat-side entry</h3>
        </header>
        <div className="p-4 space-y-4">
          <div className="flex gap-1 rounded-lg bg-[#0a2040] p-1">
            {(["national", "select"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={cn(
                  "flex-1 min-h-[44px] rounded-md text-sm font-semibold",
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

          <Field label="Day">
            <Select value={dayId} onValueChange={setDayId}>
              <SelectTrigger className="min-h-[48px] bg-[#0a2040] border-white/20 text-white">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {snapshot.days.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Pool">
            <Select value={effectivePoolId} onValueChange={setPoolId}>
              <SelectTrigger className="min-h-[48px] bg-[#0a2040] border-white/20 text-white">
                <SelectValue placeholder="Pool" />
              </SelectTrigger>
              <SelectContent>
                {teamPools.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Pool {p.pool_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Dual">
            <Select
              value={effectiveDualId}
              onValueChange={(id) => {
                setDualId(id)
                const d = teamDuals.find((x) => x.id === id)
                if (d) {
                  setOpponent(d.opponent_team_name)
                  setRoundName(d.round_name)
                }
              }}
            >
              <SelectTrigger className="min-h-[48px] bg-[#0a2040] border-white/20 text-white">
                <SelectValue placeholder="Select dual" />
              </SelectTrigger>
              <SelectContent>
                {teamDuals.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.round_name} vs {d.opponent_team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Round">
            <Select value={roundName} onValueChange={setRoundName}>
              <SelectTrigger className="min-h-[48px] bg-[#0a2040] border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROUND_PRESETS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Opponent team">
            <Input
              className="min-h-[48px] bg-[#0a2040] border-white/20 text-white"
              value={opponent || dual?.opponent_team_name || ""}
              onChange={(e) => setOpponent(e.target.value)}
              onBlur={() => {
                if (dual && opponent && opponent !== dual.opponent_team_name) {
                  void post({
                    action: "update_dual",
                    dualId: dual.id,
                    opponentTeamName: opponent,
                    roundName,
                  })
                }
              }}
            />
          </Field>
        </div>
      </article>

      {dual && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#CBAF5D] uppercase px-1">Tap weight to enter result</p>
          {NHSCA_DUALS_WEIGHTS.map((weight) => {
            const match = snapshot.matches.find((m) => m.dual_id === dual.id && m.weight === weight)
            if (!match) return null
            const open = activeWeight === weight
            const options = wrestlersForWeight(weight)
            return (
              <WeightCard
                key={weight}
                weight={weight}
                open={open}
                onToggle={() => setActiveWeight(open ? null : weight)}
                match={match}
                wrestlerOptions={options}
                saving={saving === match.id}
                onSave={(fields) => saveMatch(match.id, fields)}
              />
            )
          })}
        </div>
      )}

      <button
        type="button"
        className="text-sm text-white/50 underline px-1"
        onClick={() => setShowManage((s) => !s)}
      >
        {showManage ? "Hide" : "Add"} day / pool / dual
      </button>

      {showManage && (
        <article className={hubPanelClass}>
          <div className="p-4 space-y-3">
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
                if (n && ncTeam) void post({ action: "add_pool", dayId, teamId: ncTeam.id, poolNumber: parseInt(n, 10) })
              }}
            >
              + Add pool
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[44px] border-white/25 text-white"
              disabled={busy || !dayId || !effectivePoolId}
              onClick={() => {
                const opp = prompt("Opponent team name")
                const rnd = prompt("Round name", "Round 1")
                if (opp && ncTeam)
                  void post({
                    action: "add_dual",
                    teamId: ncTeam.id,
                    dayId,
                    poolId: effectivePoolId,
                    opponentTeamName: opp,
                    roundName: rnd || "Round 1",
                  })
              }}
            >
              + Add dual
            </Button>
            <Button
              type="button"
              className="w-full min-h-[44px] bg-[#0a2040] text-[#CBAF5D] border border-[#CBAF5D]/30"
              disabled={busy}
              onClick={() => void post({ action: "seed" })}
            >
              Re-run seed (empty DB only)
            </Button>
          </div>
        </article>
      )}

      {busy && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin text-[#CBAF5D]" />
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-white/60">{label}</Label>
      {children}
    </div>
  )
}

function WeightCard({
  weight,
  open,
  onToggle,
  match,
  wrestlerOptions,
  saving,
  onSave,
}: {
  weight: string
  open: boolean
  onToggle: () => void
  match: {
    id: string
    nc_wrestler_id: string | null
    opponent_wrestler_name: string
    winner: string | null
    result_type: string | null
    nc_points: number
  }
  wrestlerOptions: { id: string; name: string }[]
  saving: boolean
  onSave: (f: {
    nc_wrestler_id?: string | null
    opponent_wrestler_name?: string
    winner?: NhscaDualsMatchWinner | null
    result_type?: NhscaDualsResultType | null
  }) => void
}) {
  const [ncId, setNcId] = useState(match.nc_wrestler_id ?? "")
  const [oppName, setOppName] = useState(match.opponent_wrestler_name)
  const [resultType, setResultType] = useState(match.result_type ?? "")
  const [winner, setWinner] = useState(match.winner ?? "")

  const hasResult = !!match.winner && !!match.result_type

  return (
    <div className={cn("rounded-xl border overflow-hidden", open ? "border-[#CBAF5D]" : "border-white/10 bg-[#0a2040]")}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 min-h-[52px] text-left"
        onClick={onToggle}
      >
        <span className="font-mono font-bold text-[#CBAF5D]">{weight}</span>
        <span className="text-sm text-white/70 truncate flex-1 mx-3">
          {hasResult ? `${match.nc_points} pts` : "Tap to enter"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 bg-[#002147]/50">
          <Field label="NC wrestler">
            <Select value={ncId || undefined} onValueChange={setNcId}>
              <SelectTrigger className="min-h-[48px] bg-[#0a2040] border-white/20 text-white">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {wrestlerOptions.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Opponent wrestler">
            <Input
              className="min-h-[48px] bg-[#0a2040] border-white/20"
              value={oppName}
              onChange={(e) => setOppName(e.target.value)}
            />
          </Field>
          <Field label="Result">
            <Select value={resultType || undefined} onValueChange={setResultType}>
              <SelectTrigger className="min-h-[48px] bg-[#0a2040] border-white/20 text-white">
                <SelectValue placeholder="Result type" />
              </SelectTrigger>
              <SelectContent>
                {RESULT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label} ({o.points} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Winner">
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ["nc", "NC"],
                  ["opponent", "Opp"],
                  ["draw", "Draw"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={cn(
                    "min-h-[44px] rounded-lg text-sm font-semibold border",
                    winner === val
                      ? "bg-[#CBAF5D] text-[#002147] border-[#CBAF5D]"
                      : "border-white/20 text-white/80"
                  )}
                  onClick={() => setWinner(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Button
            type="button"
            className="w-full min-h-[48px] bg-[#B31B1B] hover:bg-[#9a1616] text-white font-bold"
            disabled={saving || !winner || !resultType}
            onClick={() =>
              onSave({
                nc_wrestler_id: ncId || null,
                opponent_wrestler_name: oppName,
                winner: winner as NhscaDualsMatchWinner,
                result_type: resultType as NhscaDualsResultType,
              })
            }
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Save result"}
          </Button>
        </div>
      )}
    </div>
  )
}
