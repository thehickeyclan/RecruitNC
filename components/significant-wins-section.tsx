"use client"

import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"

type SignificantWin = {
  opponent: string
  opponentSchool: string | null
  event: string | null
  date: string | null
  result: string | null
  weight: number | null
  reason: "toc-field" | "ranked"
}

/**
 * The wins that mean something, above the full match list.
 *
 * A career match list is long and flat — 179 bouts where a state title and a first-round pin look
 * alike. This answers the question a college coach actually opens a profile with: who has he
 * beaten that I have heard of.
 *
 * Most recent season only, the same window seeding uses. A win from three seasons ago is a
 * different claim than one from this year and does not belong in the same list.
 *
 * Renders nothing at all when there are none. An empty "Significant wins" heading says something
 * about a wrestler that we do not mean to say.
 */
export function SignificantWinsSection({ athleteId }: { athleteId: string }) {
  const [wins, setWins] = useState<SignificantWin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/athletes/${athleteId}/significant-wins`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { wins: [] }))
      .then((data) => {
        if (!cancelled) setWins(data.wins ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [athleteId])

  if (loading || wins.length === 0) return null

  return (
    <section className="rounded-xl border border-rnc-gold/30 bg-rnc-surface p-5">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-rnc-gold" aria-hidden="true" />
        <h2 className="text-lg font-bold text-white">Significant wins</h2>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        This season, over wrestlers in the Tournament of Champions field or ranked North Carolina
        prospects.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {wins.map((win) => (
          <li
            key={`${win.opponent}-${win.date}-${win.event}`}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg border border-rnc-line bg-rnc-ink px-3 py-2"
          >
            <div className="min-w-0">
              <span className="font-semibold text-white">{win.opponent}</span>
              {win.opponentSchool ? (
                <span className="text-sm text-slate-400"> · {win.opponentSchool}</span>
              ) : null}
              {win.event ? <span className="block text-xs text-slate-500">{win.event}</span> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {win.result ? <span className="text-xs font-semibold text-slate-300">{win.result}</span> : null}
              {win.weight ? <span className="text-xs text-slate-500">{win.weight} lbs</span> : null}
              {win.date ? <span className="text-xs text-slate-500">{win.date}</span> : null}
              <span
                className={
                  win.reason === "toc-field"
                    ? "rounded-full bg-rnc-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rnc-gold"
                    : "rounded-full border border-rnc-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                }
              >
                {win.reason === "toc-field" ? "TOC field" : "Ranked"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
