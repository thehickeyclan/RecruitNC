"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * Every TOC Madness entry, by person.
 *
 * The game shipped with no way to see who was playing: the announce page counted entrants and
 * nothing else, and the public leaderboard stays empty until results are recorded. On a tournament
 * weekend the questions are "who is in", "who is a weight short before picks lock", and "what did
 * this person actually pick" when somebody says their bracket is wrong.
 *
 * Picks stay out of the list on purpose — the app promises entrants that nobody sees their bracket
 * — so a person's picks load only when their row is opened here, by staff, one at a time.
 */

type Entrant = {
  userId: string
  leaderboardName: string | null
  accountName: string | null
  email: string | null
  submittedWeights: number[]
  submittedCount: number
  missingWeights: number[]
  complete: boolean
  firstAt: string | null
  lastAt: string | null
  points: number
  correct: number
}

type Summary = {
  entrants: number
  complete: number
  incomplete: number
  submissions: number
  possible: number
  lockedWeights: number[]
  perWeight: Record<string, number>
  perHour: Record<string, number>
  lastActivity: string | null
  resultsRecorded: number
}

type Detail = {
  userId: string
  weights: {
    weightClass: number
    submitted: boolean
    submittedAt: string | null
    bouts: { boutNumber: number; roundLabel: string; pick: string | null; actual: string | null }[]
  }[]
}

function when(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  })
}

export default function TocPoolEntriesPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [entrants, setEntrants] = useState<Entrant[]>([])
  const [detail, setDetail] = useState<Detail | null>(null)
  const [openUser, setOpenUser] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/toc/pool/entries", { cache: "no-store" })
      const body = await res.json()
      if (!res.ok) return setError(body.error ?? "Could not load entries.")
      setError(null)
      setSummary(body.summary as Summary)
      setEntrants(body.entrants as Entrant[])
    } catch {
      setError("Could not load entries.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openPicks = useCallback(
    async (userId: string) => {
      if (openUser === userId) {
        setOpenUser(null)
        setDetail(null)
        return
      }
      setOpenUser(userId)
      setDetail(null)
      const res = await fetch(`/api/admin/toc/pool/entries?user=${encodeURIComponent(userId)}`, { cache: "no-store" })
      const body = await res.json()
      if (res.ok) setDetail(body.detail as Detail)
    },
    [openUser],
  )

  const name = (e: Entrant) => e.leaderboardName || e.accountName || e.email || e.userId.slice(0, 8)

  // The dark background is the page's own job: /admin/toc has no layout, so a page that only sets
  // white text renders white-on-white. The sibling results page paints the same shell.
  return (
    <main className="admin-dark-page min-h-screen bg-rnc-ink px-4 pb-24 pt-6 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CC0000]">Tournament of Champions</p>
        <h1 className="text-2xl font-black text-white">TOC Madness entries</h1>
        <p className="mt-1 text-sm text-white/60">
          Everyone who has entered, how many weights they have in, and what they picked. Entrants are told their picks
          are private — open one only when you need to answer a question about it.
        </p>
      </div>

      {error ? <p className="rounded border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
      {loading ? <p className="text-sm text-white/50">Loading…</p> : null}

      {summary ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["Entrants", String(summary.entrants)],
              ["All 10 weights", String(summary.complete)],
              ["Unfinished", String(summary.incomplete)],
              ["Brackets submitted", `${summary.submissions}${summary.possible ? ` of ${summary.possible}` : ""}`],
              ["Last entry", when(summary.lastActivity)],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">{label}</p>
                <p className="mt-1 text-sm font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Brackets submitted per weight</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.lockedWeights.map((w) => (
                <span key={w} className="rounded bg-white/5 px-2 py-1 text-xs text-white/80">
                  <strong className="text-white">{w}</strong> · {summary.perWeight[String(w)] ?? 0}
                </span>
              ))}
            </div>
            {summary.resultsRecorded === 0 ? (
              <p className="mt-2 text-xs text-white/45">
                Points stay at zero until bout results are recorded on the Live results page.
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {entrants.length > 0 ? (
        <div className="overflow-x-auto rounded border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.04] text-[10px] uppercase tracking-[0.14em] text-white/45">
              <tr>
                <th className="px-3 py-2">Entrant</th>
                <th className="px-3 py-2">Weights in</th>
                <th className="px-3 py-2">Missing</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">Last entry</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {entrants.map((e) => (
                <tr key={e.userId} className="border-t border-white/10 align-top">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-white">{name(e)}</p>
                    {e.email ? <p className="text-xs text-white/45">{e.email}</p> : null}
                  </td>
                  <td className="px-3 py-2">
                    <span className={e.complete ? "font-bold text-emerald-300" : "text-white/80"}>
                      {e.submittedCount} of {summary?.lockedWeights.length ?? 10}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-white/60">
                    {e.missingWeights.length ? e.missingWeights.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-2 text-white/80">{e.points}</td>
                  <td className="px-3 py-2 text-xs text-white/60">{when(e.lastAt)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void openPicks(e.userId)}
                      className="rounded border border-white/20 px-2 py-1 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      {openUser === e.userId ? "Hide picks" : "View picks"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading ? (
        <p className="rounded border border-white/15 bg-white/[0.03] p-3 text-sm text-white/70">
          Nobody has entered yet.
        </p>
      ) : null}

      {openUser ? (
        <div className="rounded border border-[#D7B95A]/40 bg-[#D7B95A]/[0.06] p-4">
          <h2 className="text-base font-bold text-white">
            {name(entrants.find((e) => e.userId === openUser) ?? ({ userId: openUser } as Entrant))}’s picks
          </h2>
          {!detail ? (
            <p className="mt-2 text-sm text-white/60">Loading picks…</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {detail.weights.map((weight) => (
                <div key={weight.weightClass} className="rounded border border-white/10 bg-[#0B1D3A]/60 p-3">
                  <p className="text-sm font-bold text-white">
                    {weight.weightClass} lbs{" "}
                    <span className="text-xs font-normal text-white/45">
                      {weight.submitted ? `submitted ${when(weight.submittedAt)}` : "not submitted"}
                    </span>
                  </p>
                  <ul className="mt-2 space-y-1">
                    {weight.bouts.map((bout) => (
                      <li key={bout.boutNumber} className="flex justify-between gap-3 text-xs">
                        <span className="text-white/45">
                          {bout.boutNumber}. {bout.roundLabel}
                        </span>
                        <span className={bout.actual && bout.pick === bout.actual ? "text-emerald-300" : "text-white/80"}>
                          {bout.pick ?? "—"}
                          {bout.actual && bout.pick !== bout.actual ? (
                            <span className="text-white/40"> (won: {bout.actual})</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      </div>
    </main>
  )
}
