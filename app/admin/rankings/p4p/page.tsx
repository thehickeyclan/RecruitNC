"use client"

/**
 * The pound-for-pound list: the best wrestlers in the state regardless of weight or class.
 *
 * Read this page next to a class board and the difference is the point. A class board answers
 * "who is the best junior" on a whole career; this answers "who is the best wrestler" on this
 * season alone, because sorting the three boards together produced a seniority list — fifteen of
 * the top twenty from one class, on nothing more than having been here longer.
 *
 * Within a class the board wins outright and this list never reorders it. The only question this
 * page is the authority on is how wrestlers in *different* classes compare, so the class column
 * is next to the rank: a reader should be able to see at a glance that the 2027 numbers still
 * run 1, 2, 3 down the page and that the movement is all cross-class.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, AlertTriangle, Trophy } from "lucide-react"
import { CLASS_OVERRIDE_ALERT } from "@/lib/rankings/pound-for-pound"

type Entry = {
  id: string
  name: string
  graduationYear: number
  classRank: number | null
  rank: number
  score: number
  scoreRank: number
  classOverride: number
  statePlace?: number | null
  nationalPlace?: number | null
  nationalDivision?: string | null
  tocPlace?: number | null
  wins?: number
  losses?: number
  beatenBy: string[]
}

type Meta = { season: number; pool: number; meetings: number; classes: number[]; scoredAt: string }

const CLASS_TONE: Record<number, string> = {
  2027: "bg-[#d6b75d] text-slate-950",
  2028: "bg-sky-500 text-slate-950",
  2029: "bg-emerald-500 text-slate-950",
}

function placeLabel(place: number | null | undefined): string | null {
  if (place == null || !Number.isFinite(place) || place < 1) return null
  if (place === 1) return "1st"
  if (place === 2) return "2nd"
  if (place === 3) return "3rd"
  return `${place}th`
}

export default function PoundForPoundPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [gender, setGender] = useState("Male")
  const [depth, setDepth] = useState("20")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/admin/rankings/p4p?gender=${encodeURIComponent(gender)}${refresh ? "&refresh=1" : ""}`,
        )
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || "Failed to load")
        setEntries(payload.entries ?? [])
        setMeta(payload.meta ?? null)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    },
    [gender],
  )

  useEffect(() => {
    void load()
  }, [load])

  const shown = useMemo(
    () => (depth === "all" ? entries : entries.slice(0, Number(depth))),
    [entries, depth],
  )

  /*
   * How many classes are actually represented in what is on screen. A list that is eighteen
   * wrestlers from one class is not a pound-for-pound list, and it is the failure this page is
   * most likely to have — so it is stated on the page rather than left for somebody to count.
   */
  const spread = useMemo(() => {
    const counts = new Map<number, number>()
    for (const entry of shown) counts.set(entry.graduationYear, (counts.get(entry.graduationYear) ?? 0) + 1)
    return [...counts].sort(([a], [b]) => a - b)
  }, [shown])

  /** Rows the class board has moved a long way from their season standing. */
  const contested = useMemo(
    () => shown.filter((entry) => Math.abs(entry.classOverride) >= CLASS_OVERRIDE_ALERT).length,
    [shown],
  )

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-2xl border border-blue-800/60 bg-gradient-to-br from-[#041532] via-[#071f4a] to-[#010817] p-5 shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Link
                  href="/admin/rankings/board"
                  className="mb-2 inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-100"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Class boards
                </Link>
                <h1 className="text-2xl font-black tracking-tight md:text-3xl">Pound for Pound</h1>
                <p className="mt-2 max-w-2xl text-sm text-blue-200">
                  This season only, across every class. Within a class the board decides the order;
                  this list only decides how classes compare to each other.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-32 border-blue-700 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={depth} onValueChange={setDepth}>
                  <SelectTrigger className="w-32 border-blue-700 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="15">Top 15</SelectItem>
                    <SelectItem value="20">Top 20</SelectItem>
                    <SelectItem value="all">Everyone</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => { void load(true) }}
                  variant="outline"
                  className="border-blue-700 bg-slate-900 text-white hover:bg-blue-950"
                  title="Rebuild from current data, skipping the ten-minute cache"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </section>

          {meta && (
            <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-blue-900 bg-blue-900 md:grid-cols-5">
              <div className="bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-300">Season scored</p>
                <p className="text-2xl font-black">{meta.season}</p>
              </div>
              <div className="bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-300">Pool</p>
                <p className="text-2xl font-black">{meta.pool}</p>
              </div>
              <div className="bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-300">Cross-class bouts</p>
                <p className="text-2xl font-black">{meta.meetings}</p>
              </div>
              <div className={contested ? "bg-red-950/50 p-4" : "bg-slate-900 p-4"}>
                <p className={contested ? "text-xs uppercase tracking-wide text-red-200" : "text-xs uppercase tracking-wide text-blue-300"}>
                  Board disagrees
                </p>
                <p className="text-2xl font-black">{contested}</p>
                <p className={contested ? "text-xs text-red-200/80" : "text-xs text-blue-300/80"}>
                  {CLASS_OVERRIDE_ALERT}+ places from their season
                </p>
              </div>
              <div className="bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-300">Classes shown</p>
                <p className="text-2xl font-black">{spread.length}</p>
                <p className="text-xs text-blue-300/80">{spread.map(([y, n]) => `${y}: ${n}`).join(" · ") || "—"}</p>
              </div>
            </section>
          )}

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-100">{error}</div>
          )}
          {loading && <div className="p-8 text-center text-blue-200">Scoring the season…</div>}

          {!loading && !error && (
            <div className="overflow-hidden rounded-xl border border-blue-900">
              {shown.map((entry) => (
                <div
                  key={entry.id}
                  /*
                   * Red when the class board has dragged somebody a long way from the season
                   * they actually had. The board still wins - it always wins inside a class -
                   * but doing that silently is what made this list look broken: Josh
                   * Stonebraker scoring 78 sat four rows below a wrestler scoring 45 with no
                   * indication that his own class board is what put him there.
                   */
                  className={
                    Math.abs(entry.classOverride) >= CLASS_OVERRIDE_ALERT
                      ? "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-red-900/70 bg-red-950/40 p-4 last:border-b-0"
                      : "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-blue-900/70 bg-slate-900 p-4 last:border-b-0"
                  }
                >
                  <span className="w-8 text-xl font-black text-[#d6b75d]">{entry.rank}</span>
                  <div className="min-w-[12rem] flex-1">
                    <Link href={`/athletes/${entry.id}`} className="font-semibold hover:text-blue-300">
                      {entry.name}
                    </Link>
                    <p className="text-xs text-blue-300">
                      {[
                        placeLabel(entry.statePlace) && `State ${placeLabel(entry.statePlace)}`,
                        placeLabel(entry.tocPlace) && `TOC ${placeLabel(entry.tocPlace)}`,
                        placeLabel(entry.nationalPlace) &&
                          `NHSCA ${placeLabel(entry.nationalPlace)}${entry.nationalDivision ? ` (${entry.nationalDivision})` : ""}`,
                        (entry.wins || entry.losses) && `${entry.wins}-${entry.losses}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No season results on file"}
                    </p>
                    {/*
                      * A wrestler who beat somebody placed above them, reported rather than acted
                      * on: within a class the board has already weighed it, and across classes
                      * the season can be far enough apart that one result should not move it.
                      */}
                    {Math.abs(entry.classOverride) >= CLASS_OVERRIDE_ALERT && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-300">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        On this season alone they are {entry.scoreRank}
                        {entry.classOverride > 0
                          ? ` — the Class of ${entry.graduationYear} board holds them ${entry.classOverride} places lower.`
                          : ` — the Class of ${entry.graduationYear} board lifts them ${Math.abs(entry.classOverride)} places.`}
                      </p>
                    )}
                    {entry.beatenBy.length > 0 && (
                      <p className="mt-1 text-xs text-amber-300">
                        Beaten by {entry.beatenBy.join(", ")}, ranked below them
                      </p>
                    )}
                  </div>
                  <Badge className={CLASS_TONE[entry.graduationYear] ?? "bg-slate-700 text-white"}>
                    {entry.graduationYear}
                  </Badge>
                  <span className="w-20 text-right text-xs text-blue-300">
                    class #{entry.classRank ?? "—"}
                  </span>
                  <span className="w-16 text-right font-mono text-sm text-blue-100">{entry.score}</span>
                </div>
              ))}
              {!shown.length && (
                <div className="bg-slate-900 p-8 text-center text-blue-300">
                  <Trophy className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No drafted class boards to score yet.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
