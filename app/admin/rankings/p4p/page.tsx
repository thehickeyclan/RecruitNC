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
import { ArrowLeft, AlertTriangle, ArrowDown, ArrowUp, Save, Trophy, UploadCloud } from "lucide-react"
import { CLASS_OVERRIDE_ALERT, P4P_PUBLIC_CAP } from "@/lib/rankings/pound-for-pound"

type Entry = {
  id: string
  name: string
  graduationYear: number
  classRank: number | null
  rank: number
  score: number
  scoreRank: number
  classOverride: number
  lostTo?: string[]
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
  /*
   * The engine's order is a starting point, not the answer.
   *
   * It was read-only at first and that was wrong: the whole job here is a person looking at three
   * classes of wrestlers and deciding. The engine still enforces the class boards when it builds
   * the list, so the order that lands on screen never contradicts them — but once somebody starts
   * moving wrestlers, a move that puts a kid above a classmate ranked over him is theirs to make
   * and theirs to see, which is what the red is for.
   */
  const [entries, setEntries] = useState<Entry[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [gender, setGender] = useState("Male")
  const [depth, setDepth] = useState("all")
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
        setDirty(false)
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

  const move = useCallback((index: number, direction: -1 | 1) => {
    setEntries((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [lifted] = next.splice(index, 1)
      next.splice(target, 0, lifted!)
      // Rank is position; recomputing it here keeps the numbers on screen honest mid-edit.
      return next.map((entry, i) => ({ ...entry, rank: i + 1 }))
    })
    setDirty(true)
    setSaved(null)
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/rankings/p4p", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          order: entries.map((entry, i) => ({ id: entry.id, rank: i + 1 })),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Failed to save")
      setDirty(false)
      setSaved(new Date().toLocaleTimeString())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }, [entries, gender])

  const publish = useCallback(async () => {
    if (dirty) {
      setError("Save the order before publishing, so what goes out is what you are looking at.")
      return
    }
    setPublishing(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/rankings/p4p", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          action: "publish",
          order: entries.map((entry, i) => ({ id: entry.id, rank: i + 1 })),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Failed to publish")
      setPublishedAt(new Date().toLocaleTimeString())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to publish")
    } finally {
      setPublishing(false)
    }
  }, [dirty, entries, gender])

  const shown = useMemo(
    () => (depth === "all" ? entries : entries.slice(0, Number(depth))),
    [entries, depth],
  )

  /*
   * Wrestlers sitting above a classmate their own board ranks higher.
   *
   * Computed from what is on screen rather than from the engine, because after a hand edit the
   * engine's opinion is no longer what anybody is looking at. Both sides of a contradiction are
   * marked: seeing only the lifted wrestler leaves you hunting for who he passed.
   */
  const breaksClassOrder = useMemo(() => {
    const flagged = new Map<string, string>()
    const note = (id: string, message: string) => {
      const held = flagged.get(id)
      flagged.set(id, held ? `${held} ${message}` : message)
    }
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const above = entries[i]!
        const below = entries[j]!
        /*
         * A result outranks any argument, in any class. This was checked only between
         * classmates, so Jacob Perry could be dragged above Micah Howard - who beat him in the
         * TOC semi-final - and the page said nothing, because they graduate in different years.
         */
        if (above.lostTo?.includes(below.id)) {
          note(above.id, `Above ${below.name}, who beat them.`)
          note(below.id, `Below ${above.name}, who they beat.`)
        }
        if (above.graduationYear !== below.graduationYear) continue
        if (above.classRank == null || below.classRank == null) continue
        if (above.classRank > below.classRank) {
          note(above.id, `Above ${below.name}, who the ${above.graduationYear} board ranks #${below.classRank} to his #${above.classRank}.`)
          note(below.id, `Below ${above.name}, who the ${below.graduationYear} board ranks #${above.classRank} to his #${below.classRank}.`)
        }
      }
    }
    return flagged
  }, [entries])

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
                    <SelectItem value="50">Published 50</SelectItem>
                    <SelectItem value="all">Everyone</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => { void load(true) }}
                  variant="outline"
                  className="border-blue-700 bg-slate-900 text-white hover:bg-blue-950"
                  title="Rebuild from current data, discarding unsaved moves"
                >
                  Refresh
                </Button>
                <Button
                  onClick={() => { void save() }}
                  disabled={!dirty || saving}
                  className="bg-[#d6b75d] text-slate-950 hover:bg-[#c5a84d] disabled:opacity-40"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving…" : dirty ? "Save order" : saved ? `Saved ${saved}` : "Saved"}
                </Button>
                {/* Refused while a rule is broken: this is the one order that leaves the building. */}
                <Button
                  onClick={() => { void publish() }}
                  disabled={publishing || dirty || breaksClassOrder.size > 0}
                  title={
                    breaksClassOrder.size
                      ? "Fix the rows breaking their class board first"
                      : dirty
                        ? "Save the order first"
                        : `Publish the top ${P4P_PUBLIC_CAP}`
                  }
                  className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                >
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {publishing ? "Publishing…" : publishedAt ? `Published ${publishedAt}` : `Publish top ${P4P_PUBLIC_CAP}`}
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
              <div className={breaksClassOrder.size ? "bg-red-950/60 p-4" : "bg-slate-900 p-4"}>
                <p className={breaksClassOrder.size ? "text-xs uppercase tracking-wide text-red-200" : "text-xs uppercase tracking-wide text-blue-300"}>
                  Contradictions
                </p>
                <p className="text-2xl font-black">{breaksClassOrder.size}</p>
                <p className={breaksClassOrder.size ? "text-xs text-red-200/80" : "text-xs text-blue-300/80"}>
                  {breaksClassOrder.size ? "fix before publishing" : `${contested} disagree with the season`}
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
                <div key={`${entry.id}-wrap`}>
                {/*
                  * The cut, drawn rather than implied. Everyone is on this page because deciding
                  * who is inside fifty is most of the work, but a list where the published and
                  * the unpublished look identical is one an admin has to count down by hand.
                  */}
                {entry.rank === P4P_PUBLIC_CAP + 1 && (
                  <div className="flex items-center gap-3 border-y border-dashed border-[#d6b75d]/50 bg-slate-950 px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#d6b75d]">
                      Published top {P4P_PUBLIC_CAP} ends here
                    </span>
                    <span className="text-xs text-blue-300">
                      Everyone below stays private — visible to admins, never published.
                    </span>
                  </div>
                )}
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
                    breaksClassOrder.has(entry.id)
                      ? "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-red-700 bg-red-950/60 p-4 last:border-b-0"
                      : entry.rank > P4P_PUBLIC_CAP
                        ? "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-blue-900/70 bg-slate-900/50 p-4 opacity-60 last:border-b-0"
                        : "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-blue-900/70 bg-slate-900 p-4 last:border-b-0"
                  }
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(entries.indexOf(entry), -1)}
                      disabled={entry.rank === 1}
                      className="rounded p-0.5 text-blue-300 hover:bg-blue-900 hover:text-white disabled:opacity-25"
                      aria-label={`Move ${entry.name} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(entries.indexOf(entry), 1)}
                      disabled={entry.rank === entries.length}
                      className="rounded p-0.5 text-blue-300 hover:bg-blue-900 hover:text-white disabled:opacity-25"
                      aria-label={`Move ${entry.name} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
                    {/* The rule: never above a classmate their own board ranks higher. */}
                    {breaksClassOrder.has(entry.id) && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-300">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {breaksClassOrder.get(entry.id)}
                      </p>
                    )}
                    {/* Informational: the class board and this season disagree about them. */}
                    {!breaksClassOrder.has(entry.id) && Math.abs(entry.classOverride) >= CLASS_OVERRIDE_ALERT && (
                      <p className="mt-1 text-xs text-amber-300">
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
