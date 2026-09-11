"use client"

import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"
import type { ProfileQualityWinsTournamentBlock } from "@/lib/profile-quality-wins"

type SignificantWin = {
  opponent: string
  opponentSchool: string | null
  event: string | null
  date: string | null
  result: string | null
  weight: number | null
  reason: "credentialed" | "toc-field" | "ranked" | "national-ranked"
  credential?: string | null
  scope?: "in-state" | "national"
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
export function SignificantWinsSection({ athleteId, qualityWinBlocks = [] }: {
  athleteId: string
  qualityWinBlocks?: ProfileQualityWinsTournamentBlock[]
}) {
  const [wins, setWins] = useState<SignificantWin[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "in-state" | "national">("all")

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

  const qualityWins: SignificantWin[] = qualityWinBlocks.flatMap((block) =>
    block.wins.map((win) => ({
      opponent: win.opponentName,
      opponentSchool: win.opponentTeam ?? null,
      event: block.eventLabel,
      date: null,
      result: win.resultLine ?? null,
      weight: Number.parseInt(block.weightLabel, 10) || null,
      reason: "credentialed",
      credential: `${win.state} · ${win.credentials}`,
      scope: win.state.trim().toUpperCase() === "NC" ? "in-state" : "national",
    })),
  )
  const allWins = [...wins, ...qualityWins]
  const visibleWins = filter === "all" ? allWins : allWins.filter((win) => win.scope === filter)

  if (loading || allWins.length === 0) return null

  return (
    <section id="quality-wins" className="rounded-xl border border-rnc-gold/30 bg-rnc-surface p-5" data-section="quality-wins">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-rnc-gold" aria-hidden="true" />
        <h2 className="text-lg font-bold text-white">Significant wins</h2>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Significant wins over strong opponents.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter significant wins">
        {(["all", "in-state", "national"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={filter === option
              ? "rounded-full bg-rnc-gold px-3 py-1 text-xs font-bold text-rnc-ink"
              : "rounded-full border border-rnc-line px-3 py-1 text-xs font-semibold text-slate-300 hover:border-rnc-gold/60"}
          >
            {option === "all" ? "All" : option === "in-state" ? "In-state" : "National"}
          </button>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {visibleWins.map((win, index) => (
          <li
            key={`${win.opponent}-${win.date}-${win.event}-${index}`}
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
                {win.credential
                  ? win.credential
                  : win.reason === "toc-field"
                    ? "TOC field"
                    : win.reason === "national-ranked"
                      ? "Nationally ranked"
                      : "Ranked"}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {visibleWins.length === 0 ? <p className="mt-4 text-sm text-slate-400">No wins in this category.</p> : null}
    </section>
  )
}
