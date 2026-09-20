"use client"

/**
 * The finished bracket, public and read-only.
 *
 * Same component the seeding room uses, so there is one bracket on the web rather than a second
 * one drawn for the results page. The draw comes from the locked record and the winners come from
 * the bouts the mat recorded — the same two sources the app's Live Brackets screen reads.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { TocBracketView } from "@/components/toc/brackets/toc-bracket-view"
import type { TocBracketDraw } from "@/lib/toc/bracket-types"
import { buildSimulatedTocDraw, type TocSimulationPicks } from "@/lib/toc/bracket-simulation"

type Props = { weightClass: number; allWeights: number[] }

export function TocPublicBracket({ weightClass, allWeights }: Props) {
  const [draw, setDraw] = useState<TocBracketDraw | null>(null)
  const [outcomes, setOutcomes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [drawRes, resultsRes] = await Promise.all([
        fetch("/api/toc/brackets/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weightClass }),
        }),
        fetch(`/api/toc/brackets/results?weightClass=${weightClass}`),
      ])
      const drawData = await drawRes.json()
      if (!drawRes.ok || !drawData?.draw) {
        setError(drawData?.error ?? "That bracket is not available yet.")
        return
      }
      const results = resultsRes.ok ? await resultsRes.json() : null
      const winners: Record<number, string> = results?.winners ?? {}
      const outcomeMap: Record<number, string> = {}
      for (const [bout, outcome] of Object.entries(results?.outcomes ?? {})) {
        const o = outcome as { method?: string | null; winnerScore?: number | null; loserScore?: number | null }
        const method = o.method ? ({ FALL: "F", TF: "TF", MAJ: "MD", DEC: "DEC" }[o.method] ?? o.method) : null
        const score = o.winnerScore != null && o.loserScore != null ? `${o.winnerScore}-${o.loserScore}` : null
        const label = [method, score].filter(Boolean).join(" ")
        if (label) outcomeMap[Number(bout)] = label
      }

      /*
       * Resolved through the same helper the simulation uses, with the real winners as the picks.
       *
       * Writing `winnerAthleteId` onto each bout is not enough: the later rounds are feeder slots
       * that read "Winner of bout 3" until something resolves them, so a finished tournament drew
       * an opening round and nine placeholders. `buildSimulatedTocDraw` already does that
       * resolution — it takes picks by bout number, which is exactly the shape of a results map.
       */
      const picks: TocSimulationPicks = {}
      for (const [bout, winner] of Object.entries(winners)) picks[Number(bout)] = String(winner)
      setDraw(buildSimulatedTocDraw(drawData.draw as TocBracketDraw, picks))
      setOutcomes(outcomeMap)
    } catch {
      setError("Could not load that bracket.")
    } finally {
      setLoading(false)
    }
  }, [weightClass])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#060f1f] text-white/70">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading bracket…
      </div>
    )
  }

  if (error || !draw) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-[#060f1f] px-6 text-center text-white/70">
        <p>{error}</p>
        <Link href="/tournament-of-champions/results" className="text-[#D3B574] hover:underline">
          Back to results
        </Link>
      </div>
    )
  }

  return <TocBracketView draw={draw} allWeights={allWeights} source="locked" readOnly outcomes={outcomes} />
}
