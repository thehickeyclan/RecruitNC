"use client"

import { useEffect, useState } from "react"
import { HardLink } from "@/components/hard-link"
import { TocPatrioticBar, tocDisplayClass, tocMobileCtaClass } from "@/components/toc/toc-theme"
import type { TocBracketDrawSummary } from "@/lib/toc/bracket-types"
import { Loader2 } from "lucide-react"

export function TocBracketsHub() {
  const [brackets, setBrackets] = useState<TocBracketDrawSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch("/api/toc/brackets")
      .then((r) => r.json())
      .then((d) => setBrackets(d.brackets ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#060f1f] text-white">
      <section className="bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-14 sm:py-20 text-center">
          <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-3">Brackets</p>
          <h1 className={`text-4xl sm:text-5xl md:text-6xl text-white ${tocDisplayClass()}`}>Brackets</h1>
          <p className="mt-4 text-white/70 max-w-lg mx-auto text-sm sm:text-base">
            Weight-class draws for the NC United Tournament of Champions. Brackets appear as wrestlers confirm and
            seeds are assigned — open spots show as TBD.
          </p>
          <HardLink href="/tournament-of-champions" className={`${tocMobileCtaClass("ghost")} mt-8 inline-flex`}>
            Event page
          </HardLink>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="container mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        {loading ? (
          <p className="text-white/60 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </p>
        ) : brackets.length === 0 ? (
          <p className="text-center text-white/55 text-sm">
            No brackets yet. As wrestlers confirm and get seeds in admin, each weight will appear here with open TBD
            slots.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {brackets.map((b) => (
              <HardLink
                key={b.weightClass}
                href={`/tournament-of-champions/brackets/${b.weightClass}`}
                className="group rounded-sm border border-white/10 bg-white/5 p-6 text-center transition-all hover:border-[#CC0000]/50 hover:bg-[#CC0000]/10 hover:shadow-lg hover:shadow-[#CC0000]/10"
              >
                <p className={`text-3xl sm:text-4xl text-white group-hover:text-[#CC0000] transition-colors ${tocDisplayClass()}`}>
                  {b.weightClass}
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45 mt-2">
                  lbs · {b.isComplete ? "official draw" : `${b.confirmedCount ?? 0}/8 · building`}
                </p>
              </HardLink>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
