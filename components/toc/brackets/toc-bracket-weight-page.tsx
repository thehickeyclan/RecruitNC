"use client"

import { useEffect, useState } from "react"
import { HardLink } from "@/components/hard-link"
import { TocBracketView } from "@/components/toc/brackets/toc-bracket-view"
import { TocPatrioticBar, tocDisplayClass, tocMobileCtaClass } from "@/components/toc/toc-theme"
import type { TocBracketDraw, TocBracketDrawSummary } from "@/lib/toc/bracket-types"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  weightClass: number
}

export function TocBracketWeightPage({ weightClass }: Props) {
  const [draw, setDraw] = useState<TocBracketDraw | null>(null)
  const [allWeights, setAllWeights] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [drawRes, listRes] = await Promise.all([
          fetch(`/api/toc/brackets/${weightClass}`),
          fetch("/api/toc/brackets"),
        ])
        const drawData = await drawRes.json()
        const listData = await listRes.json()

        if (cancelled) return

        if (!drawRes.ok) {
          setDraw(null)
          setError(drawData.error ?? "Bracket not available")
        } else {
          setDraw(drawData.draw as TocBracketDraw)
        }

        const weights = ((listData.brackets ?? []) as TocBracketDrawSummary[]).map((b) => b.weightClass)
        setAllWeights(weights.length > 0 ? weights : drawRes.ok ? [weightClass] : [])
      } catch {
        if (!cancelled) setError("Failed to load bracket")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [weightClass])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-[#060f1f] text-white/70">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading bracket…
      </div>
    )
  }

  if (!draw || error) {
    return (
      <section className="min-h-[50vh] bg-[#0B1D3A] text-white flex flex-col">
        <TocPatrioticBar />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className={cn("text-3xl mb-3", tocDisplayClass())}>{weightClass} lbs</p>
          <p className="text-white/70 max-w-md mb-8">{error ?? "This bracket has not been published yet."}</p>
          <HardLink href="/tournament-of-champions/brackets" className={tocMobileCtaClass("primary")}>
            All brackets
          </HardLink>
        </div>
        <TocPatrioticBar />
      </section>
    )
  }

  return <TocBracketView draw={draw} allWeights={allWeights} />
}
