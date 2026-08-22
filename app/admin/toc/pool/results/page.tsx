"use client"

import { useCallback, useEffect, useState } from "react"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

/**
 * Recording bout winners during the tournament.
 *
 * Built for one person on a phone, standing at a mat, entering roughly 130 results across a day.
 * That shapes every decision here: one tap records a winner, tap targets are large enough to hit
 * without looking twice, and there is no save button, no dialog and no navigation between bouts.
 *
 * A mis-tap is corrected by tapping the other wrestler — the same single action, no undo to find.
 */

type Competitor = { athleteId: string; name: string; seed: number | null }
type Bout = {
  boutNumber: number
  roundLabel: string
  side: string
  winnerAthleteId: string | null
  competitors: Competitor[]
}

export default function TocPoolResultsPage() {
  const [weightClass, setWeightClass] = useState<number>(TOC_WEIGHT_CLASSES[0])
  const [bouts, setBouts] = useState<Bout[]>([])
  const [recorded, setRecorded] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (weight: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/toc/pool/result?weightClass=${weight}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Could not load bouts.")
      setBouts(data.bouts ?? [])
      setRecorded(data.recorded ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bouts.")
      setBouts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(weightClass)
  }, [weightClass, load])

  async function record(bout: Bout, athleteId: string) {
    setSaving(bout.boutNumber)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/pool/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightClass, boutNumber: bout.boutNumber, winnerAthleteId: athleteId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Could not save.")
      // Reload rather than patch state: a result changes who appears in every later bout.
      await load(weightClass)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <main className="min-h-screen bg-rnc-ink px-4 pb-24 pt-6 text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rnc-gold">Tournament of Champions</p>
          <h1 className="text-2xl font-bold">Record results</h1>
          <p className="text-sm text-slate-400">
            Tap the winner. Saved instantly — tap the other wrestler to correct it. {recorded} of{" "}
            {bouts.length} recorded.
          </p>
        </header>

        {/* Sticky so the weight is switchable without scrolling back up mid-session. */}
        <div className="sticky top-0 -mx-4 bg-rnc-ink/95 px-4 py-3 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TOC_WEIGHT_CLASSES.map((weight) => (
              <button
                key={weight}
                onClick={() => setWeightClass(weight)}
                className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-bold tabular-nums transition-colors ${
                  weight === weightClass
                    ? "bg-rnc-gold text-rnc-ink"
                    : "border border-rnc-line bg-rnc-surface text-slate-300"
                }`}
              >
                {weight}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rnc-red bg-rnc-surface p-4 text-sm text-red-300">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : bouts.length === 0 ? (
          <p className="text-sm text-slate-400">No bouts yet for this weight.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {bouts.map((bout) => {
              const done = Boolean(bout.winnerAthleteId)
              return (
                <li
                  key={bout.boutNumber}
                  className={`rounded-xl border p-3 ${
                    done ? "border-rnc-line bg-rnc-surface/60" : "border-rnc-line bg-rnc-raised"
                  }`}
                >
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Bout {bout.boutNumber}
                    </span>
                    <span className="text-xs text-slate-500">{bout.roundLabel}</span>
                  </div>

                  {bout.competitors.length < 2 ? (
                    <p className="py-2 text-sm text-slate-500">Waiting on an earlier bout.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {bout.competitors.map((c) => {
                        const isWinner = bout.winnerAthleteId === c.athleteId
                        return (
                          <button
                            key={c.athleteId}
                            disabled={saving === bout.boutNumber}
                            onClick={() => void record(bout, c.athleteId)}
                            className={`flex min-h-[52px] items-center gap-3 rounded-lg px-3 text-left transition-colors disabled:opacity-50 ${
                              isWinner
                                ? "bg-rnc-gold text-rnc-ink"
                                : "border border-rnc-line bg-rnc-ink text-white active:bg-rnc-surface"
                            }`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold ${
                                isWinner ? "bg-rnc-ink text-rnc-gold" : "bg-rnc-red text-white"
                              }`}
                            >
                              {c.seed ?? "–"}
                            </span>
                            <span className="font-semibold">{c.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </main>
  )
}
