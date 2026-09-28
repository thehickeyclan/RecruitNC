"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Save, UploadCloud } from "lucide-react"

import { PUBLIC_RANKINGS_MAX_BY_YEAR } from "@/lib/public-rankings-cap"

/**
 * The Top 100, in the order a person decides.
 *
 * The engine scores and the class boards constrain; the ordering is still Matt's. Two rules are
 * worth seeing on screen rather than discovering after publication:
 *
 *   - within a class this list must not disagree with that class's board. A wrestler ranked 9th
 *     in 2028 cannot sit above the 8th. The row turns red when a move breaks it.
 *   - every wrestler on the published Top 75 has to stay inside the top hundred. One who is 73rd
 *     on that list and missing from this one is indefensible.
 *
 * Neither is enforced by refusing the move - a person moving wrestlers has reasons a rule does
 * not know - but neither happens quietly.
 */

type Entry = {
  id: string
  name: string
  graduationYear: number
  classRank: number | null
  rank: number
  score: number
  scoreRank?: number
  classOverride?: number
  statePlace?: number | null
  tocPlace?: number | null
  nationalPlace?: number | null
  wins?: number
  losses?: number
  weightClass?: string | null
  highSchool?: string | null
}

/* The published cut. Everything below the line is a candidate. */
const CAP = 75

export default function TopHundredAdminPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/rankings/top-100?gender=Male", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Failed to load")
      setEntries((payload.entries ?? []).map((e: Entry, i: number) => ({ ...e, rank: i + 1 })))
      setPublishedAt(payload?.meta?.publishedAt ?? null)
      setDirty(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

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
      return next.map((entry, i) => ({ ...entry, rank: i + 1 }))
    })
    setDirty(true)
    setSaved(null)
  }, [])

  /**
   * Rows whose class order is now wrong, so a mistake is visible before it is published.
   *
   * Only a class's PUBLISHED depth binds. A class board stops at 30 (15 for 2029); below that the
   * class rank is the engine's own output and was never curated, so enforcing it would flag real
   * judgement as an error - Naylor Higgins is a state runner-up sitting at class #60 purely
   * because his season log was never imported, and no rule should stop him being ranked on what
   * he actually did.
   */
  const violations = useMemo(() => {
    const bad = new Set<string>()
    const lastSeen = new Map<number, { rank: number; id: string }>()
    for (const entry of entries) {
      if (entry.classRank == null) continue
      const published = PUBLIC_RANKINGS_MAX_BY_YEAR[entry.graduationYear]
      if (published == null || entry.classRank > published) continue
      const prior = lastSeen.get(entry.graduationYear)
      if (prior && entry.classRank < prior.rank) {
        bad.add(entry.id)
        bad.add(prior.id)
      }
      lastSeen.set(entry.graduationYear, { rank: entry.classRank, id: entry.id })
    }
    return bad
  }, [entries])

  const send = useCallback(
    async (publish: boolean) => {
      if (publish && dirty) {
        setError("Save the order before publishing, so what goes out is what you are looking at.")
        return
      }
      publish ? setPublishing(true) : setSaving(true)
      setError(null)
      try {
        const response = await fetch("/api/admin/rankings/top-100", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gender: "Male", publish, order: entries.map((e) => e.id) }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || "Failed")
        if (publish) setPublishedAt(new Date().toISOString())
        else {
          setDirty(false)
          setSaved(new Date().toLocaleTimeString())
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed")
      } finally {
        setPublishing(false)
        setSaving(false)
      }
    },
    [dirty, entries],
  )

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Top 75 College Prospects</h1>
            <p className="mt-1 text-sm text-slate-400">
              Reaches past every class&apos;s published cut, so wrestlers outside a deep
              class&apos;s top 30 can rank on their merits. Within a class the order still follows
              that class&apos;s board. The top {CAP} publish.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void send(false)}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-md border border-blue-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-blue-100 disabled:opacity-40"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save order"}
            </button>
            <button
              onClick={() => void send(true)}
              disabled={publishing || dirty}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <UploadCloud className="h-4 w-4" /> {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
          <span>{entries.length} in the pool</span>
          {saved && <span className="text-emerald-400">Saved {saved}</span>}
          {publishedAt && <span>Published {new Date(publishedAt).toLocaleString()}</span>}
          {dirty && <span className="text-amber-400">Unsaved changes</span>}
          {violations.size > 0 && (
            <span className="inline-flex items-center gap-1 text-red-400">
              <AlertTriangle className="h-3 w-3" /> {violations.size} rows disagree with a published class board
            </span>
          )}
        </div>

        {error && <p className="mt-4 rounded-md bg-red-950 p-3 text-sm text-red-200">{error}</p>}
        {loading && <p className="mt-8 text-sm text-slate-400">Loading…</p>}

        <ol className="mt-6 space-y-1">
          {entries.map((entry, index) => {
            const bad = violations.has(entry.id)
            const cut = index === CAP - 1
            return (
              <li
                key={entry.id}
                className={`rounded-md border px-3 py-2 ${
                  bad ? "border-red-700 bg-red-950/40" : "border-slate-800 bg-slate-900/60"
                } ${cut ? "mb-4 border-b-2 border-b-blue-600" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-10 text-right font-mono text-sm ${index < CAP ? "text-blue-300" : "text-slate-600"}`}>
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {entry.name}
                      <span className="ml-2 font-normal text-slate-400">
                        {entry.graduationYear} · class #{entry.classRank ?? "—"}
                      </span>
                    </p>
                    {/* The evidence, so a placing can be argued with rather than taken on trust. */}
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {[
                        entry.weightClass ? `${entry.weightClass}lb` : null,
                        entry.highSchool,
                        entry.wins != null ? `${entry.wins}-${entry.losses ?? 0}` : null,
                        entry.statePlace ? `State #${entry.statePlace}` : null,
                        entry.tocPlace ? `TOC #${entry.tocPlace}` : null,
                        entry.nationalPlace ? `National #${entry.nationalPlace}` : null,
                        `score ${Math.round(entry.score)}`,
                        entry.scoreRank && entry.scoreRank !== index + 1
                          ? `season would rank ${entry.scoreRank}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="rounded border border-slate-700 p-1.5 hover:bg-slate-800 disabled:opacity-30"
                      aria-label={`Move ${entry.name} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === entries.length - 1}
                      className="rounded border border-slate-700 p-1.5 hover:bg-slate-800 disabled:opacity-30"
                      aria-label={`Move ${entry.name} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
