"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type {
  NhscaDualsMatchRow,
  NhscaDualsMatchWinner,
  NhscaDualsResultType,
  NhscaDualsResultsSnapshot,
} from "@/lib/nhsca-duals-live-results/types"
import { notifyNhscaDualsResultsUpdated } from "@/lib/nhsca-duals-results-events"
import { NHSCA_DUALS_WEIGHTS, resultTypeLabel } from "@/lib/nhsca-duals-live-results/scoring"
import { HorizontalScrollRow } from "@/components/ui/horizontal-scroll-row"
import { cn } from "@/lib/utils"

type TeamView = "national" | "select"
type DayFilter = "all" | string

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

const NOTE_TAGS = ["Big win", "Ranked win", "Ranked loss"] as const

function notesFromTags(tags: readonly string[]): string | null {
  const parts = tags.map((t) => t.trim()).filter(Boolean)
  return parts.length ? parts.join(" · ") : null
}

function parseNoteTags(notes: string | null | undefined): string[] {
  if (!notes?.trim()) return []
  const parts = notes.split("·").map((s) => s.trim())
  return NOTE_TAGS.filter((tag) => parts.includes(tag))
}

function matchIsComplete(m: NhscaDualsMatchRow | undefined) {
  return !!(m?.winner && m?.result_type)
}

function isSnapshotBody(json: unknown): json is NhscaDualsResultsSnapshot {
  return !!json && typeof json === "object" && Array.isArray((json as NhscaDualsResultsSnapshot).teams)
}

function shortRound(round: string) {
  return round.replace(/^Round\s+/i, "R")
}

function poolLabel(snapshot: NhscaDualsResultsSnapshot, dual: { day_id: string; pool_id: string }) {
  const day = snapshot.days.find((d) => d.id === dual.day_id)?.name ?? "Day"
  const pool = snapshot.pools.find((p) => p.id === dual.pool_id)?.pool_number
  return pool != null ? `${day} · Pool ${pool}` : day
}

export function NhscaDualsResultsAdmin({
  snapshot,
  onSaved,
}: {
  snapshot: NhscaDualsResultsSnapshot
  onSaved: (updated?: NhscaDualsResultsSnapshot) => Promise<unknown>
}) {
  const [teamView, setTeamView] = useState<TeamView>("national")
  const [dualId, setDualId] = useState("")
  const [saving, setSaving] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [activeWeight, setActiveWeight] = useState<string>(NHSCA_DUALS_WEIGHTS[0])
  const [flash, setFlash] = useState<string | null>(null)
  const [showTesting, setShowTesting] = useState(false)
  const [opponentName, setOpponentName] = useState("")
  const [selectedNoteTags, setSelectedNoteTags] = useState<string[]>([])

  const sortedDays = useMemo(
    () => [...snapshot.days].sort((a, b) => a.sort_order - b.sort_order),
    [snapshot.days]
  )
  const [activeDayId, setActiveDayId] = useState<DayFilter>("all")

  const ncTeam = snapshot.teams.find((t) => t.team_type === teamView)

  const teamDuals = useMemo(() => {
    if (!ncTeam) return []
    return snapshot.duals
      .filter((d) => d.team_id === ncTeam.id && (activeDayId === "all" || d.day_id === activeDayId))
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [snapshot.duals, ncTeam, activeDayId])

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

  const applySnapshot = useCallback(
    async (json: unknown) => {
      if (isSnapshotBody(json)) await onSaved(json)
      else await onSaved()
      notifyNhscaDualsResultsUpdated()
    },
    [onSaved]
  )

  const post = useCallback(
    async (body: Record<string, unknown>, opts?: { fullScreenBusy?: boolean }) => {
      if (opts?.fullScreenBusy) setResetBusy(true)
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
        const json = await r.json()
        await applySnapshot(json)
        return json as { id?: string }
      } finally {
        if (opts?.fullScreenBusy) setResetBusy(false)
      }
    },
    [applySnapshot]
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

  const boutExtras = useCallback(
    () => ({
      opponent_wrestler_name: opponentName.trim(),
      notes: notesFromTags(selectedNoteTags),
    }),
    [opponentName, selectedNoteTags]
  )

  const saveMatch = useCallback(
    async (
      matchId: string,
      fields: {
        nc_wrestler_id?: string | null
        winner?: NhscaDualsMatchWinner
        result_type?: NhscaDualsResultType
        opponent_wrestler_name?: string
        notes?: string | null
      }
    ) => {
      setSaving(true)
      try {
        await post({ action: "save_match", matchId, ...fields })
        if (fields.winner != null) {
          setFlash(`${activeWeight} ✓`)
          window.setTimeout(() => setFlash(null), 900)
          setOpponentName("")
          setSelectedNoteTags([])
          goToNextWeight(activeWeight)
        } else {
          setFlash(`${activeWeight} details saved`)
          window.setTimeout(() => setFlash(null), 900)
        }
      } finally {
        setSaving(false)
      }
    },
    [post, activeWeight, goToNextWeight]
  )

  useEffect(() => {
    if (!sortedDays.length) return
    if (activeDayId !== "all" && !sortedDays.some((d) => d.id === activeDayId)) {
      setActiveDayId("all")
    }
  }, [sortedDays, activeDayId])

  useEffect(() => {
    if (!ncTeam) return
    const first = teamDuals[0]?.id ?? ""
    if (!dualId || !teamDuals.some((d) => d.id === dualId)) setDualId(first)
  }, [ncTeam?.id, teamDuals, dualId])

  useEffect(() => {
    if (!dual) return
    const firstOpen = NHSCA_DUALS_WEIGHTS.find((w) => !matchIsComplete(dualMatches.get(w)))
    setActiveWeight(firstOpen ?? NHSCA_DUALS_WEIGHTS[0])
  }, [dual?.id])

  const activeMatch = dual ? dualMatches.get(activeWeight) : undefined

  useEffect(() => {
    setOpponentName(activeMatch?.opponent_wrestler_name?.trim() ?? "")
    setSelectedNoteTags(parseNoteTags(activeMatch?.notes))
  }, [dual?.id, activeWeight, activeMatch?.winner, activeMatch?.notes, activeMatch?.opponent_wrestler_name])

  if (!ncTeam) return null

  const activeWrestlers = wrestlersForWeight(activeWeight)
  const ncWrestlerId = activeMatch?.nc_wrestler_id ?? activeWrestlers[0]?.id ?? null
  const ncName = activeWrestlers.find((w) => w.id === ncWrestlerId)?.name ?? activeWrestlers[0]?.name ?? "NC"

  const tap = (winner: NhscaDualsMatchWinner, result_type: NhscaDualsResultType, wrestlerId?: string | null) => {
    if (!activeMatch) return
    if (winner === "nc" && !(wrestlerId ?? ncWrestlerId)) return
    void saveMatch(activeMatch.id, {
      winner,
      result_type,
      nc_wrestler_id: winner === "nc" ? (wrestlerId ?? ncWrestlerId) : ncWrestlerId,
      ...boutExtras(),
    })
  }

  const saveBoutDetailsOnly = () => {
    if (!activeMatch) return
    void saveMatch(activeMatch.id, boutExtras())
  }

  const toggleNoteTag = (tag: string) => {
    setSelectedNoteTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  return (
    <div className="pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <p className="text-center text-[11px] text-white/45 mb-2">
        Tap a result — live score updates for fans on View live
      </p>

      <div className="flex gap-1 rounded-lg bg-[#0a2040] p-0.5 mb-3">
        {(["national", "select"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={cn(
              "flex-1 min-h-[48px] rounded-md text-sm font-bold",
              teamView === t ? "bg-[#CBAF5D] text-[#002147]" : "text-white/70"
            )}
            onClick={() => {
              setTeamView(t)
              setDualId("")
            }}
          >
            {t === "national" ? "National" : "Select"}
          </button>
        ))}
      </div>

      {sortedDays.length > 0 && (
        <HorizontalScrollRow hint="Swipe for more days" className="mb-2" showHint={sortedDays.length > 2}>
          <button
            type="button"
            onClick={() => {
              setActiveDayId("all")
              setDualId("")
            }}
            className={cn(
              "shrink-0 snap-start min-h-[44px] px-3.5 rounded-lg text-sm font-semibold border",
              activeDayId === "all"
                ? "bg-[#CBAF5D] text-[#002147] border-[#CBAF5D]"
                : "bg-[#0a2040] text-white/75 border-white/15"
            )}
          >
            All
          </button>
          {sortedDays.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setActiveDayId(d.id)
                setDualId("")
              }}
              className={cn(
                "shrink-0 snap-start min-h-[44px] px-3.5 rounded-lg text-sm font-semibold border",
                d.id === activeDayId
                  ? "bg-[#CBAF5D] text-[#002147] border-[#CBAF5D]"
                  : "bg-[#0a2040] text-white/75 border-white/15"
              )}
            >
              {d.name}
            </button>
          ))}
        </HorizontalScrollRow>
      )}

      {teamDuals.length > 0 ? (
        <HorizontalScrollRow hint="Swipe for more opponents" className="pb-2" edgeClassName="from-[#001a33]">
          {teamDuals.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDualId(d.id)}
              className={cn(
                "shrink-0 snap-start min-h-[48px] px-3 rounded-xl text-left border min-w-[130px] max-w-[180px]",
                d.id === effectiveDualId
                  ? "bg-[#CBAF5D] text-[#002147] border-[#CBAF5D]"
                  : "bg-[#0a2040] text-white/85 border-white/15"
              )}
            >
              <span className="block text-[10px] font-semibold opacity-80">
                {sortedDays.find((day) => day.id === d.day_id)?.name ?? "Day"}
              </span>
              <span className="block text-xs font-semibold">{shortRound(d.round_name)}</span>
              <span className="block text-sm font-bold line-clamp-2 leading-tight">vs {d.opponent_team_name}</span>
              <span className="block text-[10px] tabular-nums mt-0.5 opacity-80">
                {d.nc_score}–{d.opponent_score}
                {d.status === "final" ? " · Final" : ""}
              </span>
            </button>
          ))}
        </HorizontalScrollRow>
      ) : (
        <p className="text-sm text-amber-200/90 text-center py-4">
          No duals for this day yet. Day 1 schedule is loaded from code — use Initialize if empty, or ask dev to add
          Day 2 in rosters.
        </p>
      )}

      {dual && activeMatch && (
        <>
          <div className="sticky top-0 z-30 -mx-1 px-1 pt-[max(0.25rem,env(safe-area-inset-top))] pb-2 bg-[#001a33]/95 backdrop-blur-sm border-b border-[#CBAF5D]/25">
            <div className="rounded-xl bg-[#002147] border border-[#CBAF5D]/40 p-3 shadow-lg">
              <p className="text-[10px] uppercase tracking-wider text-[#CBAF5D]/90 text-center mb-1">
                {poolLabel(snapshot, dual)} · {dual.round_name}
              </p>
              <h2 className="text-center text-sm sm:text-base font-black text-white leading-snug mb-2 px-1">
                NC {teamView === "national" ? "National" : "Select"}{" "}
                <span className="text-white/50 font-semibold">vs</span>{" "}
                <span className="text-[#CBAF5D]">{dual.opponent_team_name}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-4xl font-black text-[#CBAF5D] tabular-nums leading-none">{dual.nc_score}</p>
                  <p className="text-[10px] text-white/50 mt-1">NC United</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-white tabular-nums leading-none">{dual.opponent_score}</p>
                  <p className="text-[10px] text-white/50 mt-1 truncate px-1">{dual.opponent_team_name}</p>
                </div>
              </div>
              <p className="text-center text-xs text-white/55 mt-2">
                {completedCount}/{NHSCA_DUALS_WEIGHTS.length} weights
                {flash ? <span className="text-[#CBAF5D] font-bold ml-2">{flash}</span> : null}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mb-3">
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
                    "min-h-[48px] rounded-lg font-mono font-bold text-sm border-2",
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

          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0a2040] border border-white/15 flex items-center justify-center text-white"
              onClick={() => {
                const i = NHSCA_DUALS_WEIGHTS.indexOf(activeWeight as (typeof NHSCA_DUALS_WEIGHTS)[number])
                if (i > 0) setActiveWeight(NHSCA_DUALS_WEIGHTS[i - 1])
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center flex-1 px-2">
              <p className="text-2xl font-mono font-bold text-[#CBAF5D]">{activeWeight} lbs</p>
              <p className="text-sm font-semibold text-white truncate">{ncName}</p>
              {matchIsComplete(activeMatch) ? (
                <p className="text-xs text-white/55">
                  {resultTypeLabel(activeMatch.result_type!)} —{" "}
                  {activeMatch.winner === "nc" ? "NC" : dual.opponent_team_name}
                  {activeMatch.opponent_wrestler_name?.trim() ? (
                    <span className="block text-white/40">vs {activeMatch.opponent_wrestler_name.trim()}</span>
                  ) : null}
                  {activeMatch.notes?.trim() ? (
                    <span className="block text-amber-200/80">{activeMatch.notes.trim()}</span>
                  ) : null}
                </p>
              ) : (
                <p className="text-xs text-[#CBAF5D]/80">Tap NC or Opp to save</p>
              )}
            </div>
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0a2040] border border-white/15 flex items-center justify-center text-white"
              onClick={() => {
                const i = NHSCA_DUALS_WEIGHTS.indexOf(activeWeight as (typeof NHSCA_DUALS_WEIGHTS)[number])
                if (i < NHSCA_DUALS_WEIGHTS.length - 1) setActiveWeight(NHSCA_DUALS_WEIGHTS[i + 1])
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0a2040]/80 p-3 mb-3 space-y-2">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-white/45">Opponent wrestler (optional)</span>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="Last name or full name"
                className="mt-1 w-full min-h-[44px] rounded-lg border border-white/15 bg-[#001a33] px-3 text-sm text-white placeholder:text-white/30"
                autoComplete="off"
              />
            </label>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45 mb-1.5">Note (optional)</p>
              <div className="flex flex-wrap gap-1.5">
                {NOTE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleNoteTag(tag)}
                    className={cn(
                      "min-h-[44px] px-2.5 rounded-lg text-xs font-semibold border",
                      selectedNoteTags.includes(tag)
                        ? "border-amber-400/70 bg-amber-500/20 text-amber-100"
                        : "border-white/15 bg-[#001a33] text-white/55"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            {matchIsComplete(activeMatch) &&
            (opponentName.trim() !== (activeMatch.opponent_wrestler_name?.trim() ?? "") ||
              notesFromTags(selectedNoteTags) !== (activeMatch.notes?.trim() ? activeMatch.notes.trim() : null)) ? (
              <button
                type="button"
                disabled={saving}
                onClick={saveBoutDetailsOnly}
                className="w-full min-h-[40px] rounded-lg border border-amber-500/40 text-amber-100 text-xs font-semibold"
              >
                Save opponent / note
              </button>
            ) : null}
          </div>

          {activeWeight === "120" && activeWrestlers.length > 1 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {activeWrestlers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  disabled={saving}
                  onClick={() => tap("nc", "decision", w.id)}
                  className="min-h-[52px] rounded-xl border-2 border-[#B31B1B] bg-[#B31B1B]/90 text-white font-bold text-sm active:scale-95 disabled:opacity-50"
                >
                  {w.name.split(" ")[0]}
                  <span className="block text-[10px] font-normal opacity-80">NC DEC</span>
                </button>
              ))}
            </div>
          )}

          <div className="mb-2">
            <p className="text-[10px] font-bold text-[#CBAF5D] uppercase tracking-wide mb-1.5 text-center">NC wins</p>
            <div className="grid grid-cols-3 min-[400px]:grid-cols-5 gap-1.5">
              {QUICK_NC.map(({ result, label }) => (
                <button
                  key={result}
                  type="button"
                  disabled={saving || !ncWrestlerId}
                  onClick={() => tap("nc", result)}
                  className="min-h-[52px] sm:min-h-[56px] rounded-xl bg-[#B31B1B] hover:bg-[#9a1616] active:scale-95 text-white font-bold text-xs sm:text-sm disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-[10px] font-bold text-white/45 uppercase tracking-wide mb-1.5 text-center truncate px-2">
              {dual.opponent_team_name} wins
            </p>
            <div className="grid grid-cols-2 min-[400px]:grid-cols-4 gap-1.5">
              {QUICK_OPP.map(({ result, label }) => (
                <button
                  key={result}
                  type="button"
                  disabled={saving}
                  onClick={() => tap("opponent", result)}
                  className="min-h-[52px] sm:min-h-[56px] rounded-xl bg-[#0a2040] border-2 border-white/25 active:scale-95 text-white font-bold text-xs sm:text-sm disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {matchIsComplete(activeMatch) && (
            <button
              type="button"
              className="w-full text-xs text-amber-300/90 underline mb-2"
              disabled={saving}
              onClick={() => void post({ action: "clear_match", matchId: activeMatch.id })}
            >
              Undo {activeWeight} lbs
            </button>
          )}

          <div className="fixed bottom-0 left-0 right-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#001a33]/95 border-t border-white/10 backdrop-blur-sm">
            <Button
              type="button"
              className="w-full min-h-[52px] bg-[#CBAF5D] text-[#002147] font-bold text-base"
              disabled={saving || resetBusy || dual.status === "final"}
              onClick={() => void post({ action: "set_dual_status", dualId: dual.id, status: "final" })}
            >
              Mark dual final
            </Button>
          </div>
        </>
      )}

      <div className="mt-6 border-t border-white/10 pt-3">
        <button
          type="button"
          className="text-xs text-white/40 underline w-full text-center"
          onClick={() => setShowTesting((s) => !s)}
        >
          {showTesting ? "Hide testing tools" : "Testing only"}
        </button>
        {showTesting && dual && (
          <div className="mt-3 space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[44px] border-amber-500/40 text-amber-100 text-sm"
              disabled={resetBusy}
              onClick={() => void post({ action: "clear_dual", dualId: dual.id }, { fullScreenBusy: true })}
            >
              Clear this dual (all weights)
            </Button>
            <ConfirmButton
              label="Clear all Day 1 scores (both teams)"
              description="Wipes match results; keeps schedule."
              disabled={resetBusy}
              onConfirm={() => void post({ action: "reset_all_results" }, { fullScreenBusy: true })}
            />
          </div>
        )}
      </div>

      {resetBusy && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin text-[#CBAF5D]" />
        </div>
      )}
    </div>
  )
}

function ConfirmButton({
  label,
  description,
  onConfirm,
  disabled,
}: {
  label: string
  description: string
  onConfirm: () => void
  disabled?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full min-h-[44px] text-sm border-white/25 text-white"
          disabled={disabled}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[#002147] border-white/20 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/20 bg-transparent text-white">Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-[#CBAF5D] text-[#002147]" onClick={onConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
