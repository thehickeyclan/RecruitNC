"use client"

import { Fragment, useEffect, useState } from "react"
import { Trophy } from "lucide-react"
import type { ProfileQualityWinsTournamentBlock } from "@/lib/profile-quality-wins"
import { SignificantWinSubmissionDialog } from "@/components/significant-win-submission-dialog"
import { TournamentResultSubmissionDialog } from "@/components/tournament-result-submission-dialog"

type SignificantWin = {
  opponent: string
  opponentSchool: string | null
  event: string | null
  date: string | null
  result: string | null
  weight: number | null
  reason: "credentialed" | "toc-field" | "ranked" | "national-ranked" | "state-champion" | "national-placer" | "state-placer"
  credential?: string | null
  /** "athlete-reported" for a win published from the submission form, unverified. */
  source?: string | null
  scope?: "in-state" | "national"
  /** Folkstyle, freestyle or Greco-Roman, from the event (lib/wrestling-style.ts). */
  style?: "folkstyle" | "freestyle" | "greco"
}

/**
 * The wins that mean something, above the full match list.
 *
 * A career match list is long and flat — 179 bouts where a state title and a first-round pin look
 * alike. This answers the question a college coach actually opens a profile with: who has he
 * beaten that I have heard of.
 *
 * Most recent season, the same window seeding uses - except wins over North Carolina state
 * champions and placers, which count from any season on file: every known win over one belongs
 * here.
 *
 * When there are no documented wins yet, the section still provides the community submission
 * path so missing results can be sent to NC United for review.
 */
export function SignificantWinsSection({ athleteId, qualityWinBlocks = [], styles = "folkstyle" }: {
  athleteId: string
  qualityWinBlocks?: ProfileQualityWinsTournamentBlock[]
  /**
   * Which record this list belongs to. Folkstyle sits with the folkstyle sections; freestyle and
   * Greco-Roman wins get their own list inside the Olympic Styles section, last on the page.
   */
  styles?: "folkstyle" | "olympic"
}) {
  const [wins, setWins] = useState<SignificantWin[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "in-state" | "national">("all")
  const [expanded, setExpanded] = useState(false)

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
      style: "folkstyle",
    })),
  )
  /*
   * AAU wins arrive twice: the hand-built quality-win list, with its fuller credentials
   * ("2× Michigan State Placer"), and the bout import. Keep the hand-built one.
   */
  const handBuilt = new Set(qualityWins.map((w) => w.opponent.trim().toLowerCase()))
  const isOlympic = (w: SignificantWin) => w.style === "freestyle" || w.style === "greco"
  const allWins = [
    ...wins.filter((w) => !(/aau scholastic/i.test(w.event ?? "") && handBuilt.has(w.opponent.trim().toLowerCase()))),
    ...qualityWins,
  ].filter((w) => (styles === "olympic" ? isOlympic(w) : !isOlympic(w)))
  const visibleWins = filter === "all" ? allWins : allWins.filter((win) => win.scope === filter)
  const displayedWins = expanded ? visibleWins : visibleWins.slice(0, 3)

  if (loading) return null
  // The Olympic-styles list is only shown when there is something in it; the folkstyle one always
  // shows, because it carries the submit-a-win path.
  if (styles === "olympic" && allWins.length === 0) return null

  return (
    <section id={styles === "olympic" ? "olympic-wins" : "quality-wins"} className="rounded-xl border border-rnc-gold/30 bg-rnc-surface p-5" data-section="quality-wins">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-rnc-gold" aria-hidden="true" />
          <h2 className="text-lg font-bold text-white">
            {styles === "olympic" ? "Significant wins — Freestyle & Greco-Roman" : "Significant wins — Folkstyle"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SignificantWinSubmissionDialog athleteId={athleteId} />
          {/*
           * Beside the win, because the gaps they fill are different: a win is one bout, a
           * result is a whole tournament we may not carry at all — Ironman, Beast, Powerade,
           * or duals wrestled with another team.
           */}
          <TournamentResultSubmissionDialog athleteId={athleteId} />
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Significant wins over strong opponents.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter significant wins">
        {(["all", "in-state", "national"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setFilter(option)
              if (option !== "all") setExpanded(true)
            }}
            className={filter === option
              ? "rounded-full bg-rnc-gold px-3 py-1 text-xs font-bold text-rnc-ink"
              : "rounded-full border border-rnc-line px-3 py-1 text-xs font-semibold text-slate-300 hover:border-rnc-gold/60"}
          >
            {option === "all" ? "All" : option === "in-state" ? "In-state" : "National"}
          </button>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {displayedWins.map((win, index) => (
          <Fragment key={`${win.opponent}-${win.date}-${win.event}-${index}`}>
          <li
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
                  win.reason === "toc-field" || win.reason === "state-champion"
                    ? "rounded-full bg-rnc-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rnc-gold"
                    : "rounded-full border border-rnc-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                }
              >
                {/*
                  Never a bare "Ranked". Two different standings are in play — the national lists
                  and RecruitNC's own class rankings — and a college coach reading "Ranked" beside a
                  win has no way to tell which one it means. Same rule the scouting report follows.
                */}
                {win.credential
                  ? win.credential
                  : win.reason === "toc-field"
                    ? "TOC field"
                    : win.reason === "national-ranked"
                      ? "Nationally ranked"
                      : win.reason === "state-champion"
                        ? "State champion"
                        : win.reason === "state-placer"
                          ? "State placer"
                          : win.reason === "national-placer"
                            ? "National placer"
                          : "NC ranked"}
              </span>

            </div>
          </li>
          </Fragment>
        ))}
      </ul>
      {visibleWins.length > 3 ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 w-full rounded-lg border border-rnc-gold/40 bg-rnc-gold/5 px-4 py-2.5 text-sm font-semibold text-rnc-gold transition hover:border-rnc-gold/70 hover:bg-rnc-gold/10"
        >
          {expanded ? "Show less" : `View all ${visibleWins.length} significant wins`}
        </button>
      ) : null}
      {visibleWins.length === 0 ? (
        <p className="mt-4 rounded-lg border border-rnc-line bg-rnc-ink px-3 py-4 text-sm text-slate-400">
          {filter === "all" ? "No significant wins have been documented yet." : "No wins in this category."}
        </p>
      ) : null}
    </section>
  )
}
