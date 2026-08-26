"use client"

import { useEffect, useState } from "react"
import { FINAL_METHODS, FINAL_METHOD_LABELS, methodNeedsScore, type FinalMethod } from "@/lib/toc/final-prediction"

/**
 * How the championship ended, recorded at the mat.
 *
 * This is the only bout that asks for anything beyond a winner, because it is the only one that
 * decides the pool's tiebreaker. A pin or a tech fall records on the first tap; a major or a
 * decision asks for the score and waits, because a method with no score cannot break a tie.
 */
export function FinalOutcome({
  bout,
  disabled,
  onRecord,
}: {
  bout: { method: string | null; winnerScore: number | null; loserScore: number | null }
  disabled: boolean
  onRecord: (method: string, winnerScore?: number, loserScore?: number) => void
}) {
  const [method, setMethod] = useState<FinalMethod | null>((bout.method as FinalMethod) ?? null)
  const [winnerScore, setWinnerScore] = useState(bout.winnerScore?.toString() ?? "")
  const [loserScore, setLoserScore] = useState(bout.loserScore?.toString() ?? "")

  // A reload after saving brings the stored outcome back; the inputs should follow it rather than
  // keep whatever was typed before.
  useEffect(() => {
    setMethod((bout.method as FinalMethod) ?? null)
    setWinnerScore(bout.winnerScore?.toString() ?? "")
    setLoserScore(bout.loserScore?.toString() ?? "")
  }, [bout.method, bout.winnerScore, bout.loserScore])

  const needsScore = method != null && methodNeedsScore(method)
  const scoresReady =
    winnerScore.trim() !== "" && loserScore.trim() !== "" && Number(winnerScore) > Number(loserScore)

  function pick(next: FinalMethod) {
    setMethod(next)
    // A pin or a tech fall is complete the moment it is tapped — no second action at the mat.
    if (!methodNeedsScore(next)) onRecord(next)
  }

  return (
    <div className="mt-3 border-t border-rnc-line pt-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rnc-gold">How it ended</p>

      <div className="flex flex-wrap gap-2">
        {FINAL_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => pick(m)}
            className={`min-h-[44px] rounded-lg px-4 text-sm font-bold transition-colors disabled:opacity-50 ${
              method === m
                ? "bg-rnc-gold text-rnc-ink"
                : "border border-rnc-line bg-rnc-ink text-white active:bg-rnc-surface"
            }`}
          >
            {FINAL_METHOD_LABELS[m]}
          </button>
        ))}
      </div>

      {needsScore ? (
        <div className="mt-3 flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Winner</span>
            <input
              inputMode="numeric"
              value={winnerScore}
              onChange={(e) => setWinnerScore(e.target.value.replace(/[^0-9]/g, ""))}
              className="h-[44px] w-20 rounded-lg border border-rnc-line bg-rnc-ink px-3 text-center text-lg font-bold text-white"
            />
          </label>
          <span className="pb-3 text-slate-500">–</span>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Loser</span>
            <input
              inputMode="numeric"
              value={loserScore}
              onChange={(e) => setLoserScore(e.target.value.replace(/[^0-9]/g, ""))}
              className="h-[44px] w-20 rounded-lg border border-rnc-line bg-rnc-ink px-3 text-center text-lg font-bold text-white"
            />
          </label>
          <button
            type="button"
            disabled={disabled || !scoresReady}
            onClick={() => onRecord(method, Number(winnerScore), Number(loserScore))}
            className="ml-auto min-h-[44px] rounded-lg bg-rnc-gold px-5 text-sm font-bold text-rnc-ink disabled:opacity-40"
          >
            Save score
          </button>
        </div>
      ) : null}

      {bout.method ? (
        <p className="mt-2 text-xs text-slate-400">
          Recorded: {FINAL_METHOD_LABELS[bout.method as FinalMethod] ?? bout.method}
          {bout.winnerScore != null && bout.loserScore != null ? ` ${bout.winnerScore}-${bout.loserScore}` : ""}
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-400">Not recorded — the tiebreaker needs this.</p>
      )}
    </div>
  )
}
