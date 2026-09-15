"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  isClearedEntry,
  madeWeight,
  parseScaleReading,
  weighInState,
  WEIGH_IN_STATIONS,
  type RosterAthlete,
  type SkinCheck,
  type WeighInRecord,
  type WeighInState,
  type WeighInSummary,
} from "@/lib/toc/weigh-in"

/**
 * Friday weigh-in check-in, run from the phones at two scale stations and the head table.
 *
 * Every confirmed wrestler by weight. The scale person records the weight, the skin check and the
 * lanyard; the counter and the "not weighed" filter tell the table who is still missing at 4:45.
 * A printed roster is the official record if the building's Wi-Fi drops.
 */

type Payload = {
  roster: RosterAthlete[]
  records: Record<string, WeighInRecord>
  summary: WeighInSummary
  serverTime: string
}

const STATE_LABEL: Record<WeighInState, string> = {
  "not-weighed": "Not weighed",
  incomplete: "In progress",
  cleared: "Cleared",
  "over-weight": "Over weight",
  "skin-fail": "Skin check failed",
}

const STATE_CLASS: Record<WeighInState, string> = {
  "not-weighed": "bg-white/10 text-white/70",
  incomplete: "bg-amber-400/15 text-amber-300",
  cleared: "bg-emerald-400/15 text-emerald-300",
  "over-weight": "bg-rose-500/20 text-rose-300",
  "skin-fail": "bg-rose-500/20 text-rose-300",
}

type Filter = "all" | "not-weighed" | "problems"

export default function WeighInsPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState("")
  const [station, setStation] = useState<0 | 1 | 2>(0)
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/toc/weigh-ins", { cache: "no-store", credentials: "include" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Could not load weigh-ins.")
      setData(payload)
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load weigh-ins.")
    }
  }, [])

  // Both stations and the table see each other's entries within a few seconds.
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 10_000)
    return () => window.clearInterval(timer)
  }, [load])

  const onSaved = useCallback((record: WeighInRecord) => {
    setData((current) => (current ? { ...current, records: { ...current.records, [record.athleteId]: record } } : current))
  }, [])

  const onCleared = useCallback((athleteId: string) => {
    setData((current) => {
      if (!current) return current
      const records = { ...current.records }
      delete records[athleteId]
      return { ...current, records }
    })
  }, [])

  const weights = useMemo(() => {
    if (!data) return []
    const allowed = station === 0 ? null : new Set(WEIGH_IN_STATIONS.find((s) => s.id === station)?.weights ?? [])
    const needle = query.trim().toLowerCase()
    const byWeight = new Map<number, RosterAthlete[]>()
    for (const athlete of data.roster) {
      if (allowed && !allowed.has(athlete.weightClass)) continue
      if (needle && !`${athlete.name} ${athlete.club ?? ""} ${athlete.weightClass}`.toLowerCase().includes(needle)) continue
      const state = weighInState(data.records[athlete.athleteId])
      if (filter === "not-weighed" && state !== "not-weighed") continue
      if (filter === "problems" && state !== "over-weight" && state !== "skin-fail") continue
      byWeight.set(athlete.weightClass, [...(byWeight.get(athlete.weightClass) ?? []), athlete])
    }
    return [...byWeight.entries()].sort((a, b) => a[0] - b[0])
  }, [data, station, filter, query])

  // Cleared out of total per weight, over the whole field — filters and search never change it.
  const perWeight = useMemo(() => {
    const counts = new Map<number, { cleared: number; total: number }>()
    for (const athlete of data?.roster ?? []) {
      const entry = counts.get(athlete.weightClass) ?? { cleared: 0, total: 0 }
      entry.total++
      if (weighInState(data?.records[athlete.athleteId]) === "cleared") entry.cleared++
      counts.set(athlete.weightClass, entry)
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0])
  }, [data])

  function jumpToWeight(weight: number) {
    setStation(0)
    setFilter("all")
    setQuery("")
    window.setTimeout(() => document.getElementById(`w-${weight}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  const summary = data?.summary

  return (
    <main className="admin-dark-page min-h-screen bg-rnc-ink px-3 pb-16 pt-4 text-white sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 print:hidden">
        <header className="sticky top-0 z-10 -mx-3 border-b border-white/10 bg-rnc-ink/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D3B574]">TOC · Friday 4:00–5:00 PM</p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-extrabold">Weigh-ins</h1>
            {summary ? (
              <p className="text-lg font-bold tabular-nums">
                <span className="text-emerald-300">{summary.cleared}</span>
                <span className="text-white/50"> of {summary.total} cleared</span>
              </p>
            ) : null}
          </div>
          {summary ? (
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-white/10 px-3 py-1 tabular-nums">Not weighed: {summary.notWeighed}</span>
              <span className="rounded-full bg-amber-400/15 px-3 py-1 tabular-nums text-amber-300">In progress: {summary.incomplete}</span>
              <span className="rounded-full bg-rose-500/20 px-3 py-1 tabular-nums text-rose-300">Problems: {summary.problems}</span>
            </div>
          ) : null}
        </header>

        {error ? <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

        {perWeight.length > 0 ? (
          <div className="grid grid-cols-5 gap-2">
            {perWeight.map(([weight, count]) => {
              const done = count.total > 0 && count.cleared === count.total
              return (
                <button
                  key={weight}
                  type="button"
                  onClick={() => jumpToWeight(weight)}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-lg border text-center ${
                    done ? "border-emerald-400 bg-emerald-400/15 text-emerald-300" : "border-white/15 text-white/80"
                  }`}
                >
                  <span className="text-sm font-extrabold leading-none">{weight}</span>
                  <span className="mt-0.5 text-xs tabular-nums leading-none">
                    {count.cleared}/{count.total}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wrestler, club or weight"
          autoComplete="off"
          className="min-h-12 w-full rounded-lg border border-white/15 bg-black/30 px-4 text-lg text-white placeholder:text-white/40"
        />

        <div className="flex flex-wrap gap-2">
          {([0, 1, 2] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setStation(id)}
              className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${station === id ? "border-[#D3B574] bg-[#D3B574]/15 text-[#D3B574]" : "border-white/15 text-white/70"}`}
            >
              {id === 0 ? "All weights" : WEIGH_IN_STATIONS.find((s) => s.id === id)?.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "not-weighed", "problems"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${filter === f ? "border-white bg-white/10 text-white" : "border-white/15 text-white/60"}`}
            >
              {f === "all" ? "Everyone" : f === "not-weighed" ? "Not weighed yet" : "Problems"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto min-h-11 rounded-lg border border-white/15 px-3 text-sm text-white/70"
          >
            Print paper roster
          </button>
        </div>

        {!data && !error ? <p className="text-white/60">Loading the roster…</p> : null}
        {data && weights.length === 0 ? <p className="text-white/60">Nobody matches this filter.</p> : null}

        {weights.map(([weight, athletes]) => (
          <section key={weight} id={`w-${weight}`} className="flex scroll-mt-40 flex-col gap-2">
            {(() => {
              const count = perWeight.find(([w]) => w === weight)?.[1]
              const done = count != null && count.total > 0 && count.cleared === count.total
              return (
                <h2 className="mt-2 flex items-center gap-2 text-lg font-extrabold">
                  {weight} lbs
                  {count ? (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-sm tabular-nums ${
                        done ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/70"
                      }`}
                    >
                      {count.cleared}/{count.total}
                      {done ? " ✓" : ""}
                    </span>
                  ) : null}
                </h2>
              )
            })()}
            {athletes.map((athlete) => (
              <AthleteRow
                key={athlete.athleteId}
                athlete={athlete}
                record={data?.records[athlete.athleteId]}
                onSaved={onSaved}
                onCleared={onCleared}
              />
            ))}
          </section>
        ))}
      </div>

      {data ? <PrintRoster roster={data.roster} /> : null}
    </main>
  )
}

function AthleteRow({
  athlete,
  record,
  onSaved,
  onCleared,
}: {
  athlete: RosterAthlete
  record: WeighInRecord | undefined
  onSaved: (record: WeighInRecord) => void
  onCleared: (athleteId: string) => void
}) {
  const [weight, setWeight] = useState(record?.recordedWeight != null ? String(record.recordedWeight) : "")
  const [skin, setSkin] = useState<SkinCheck | null>(record?.skinCheck ?? null)
  const [lanyard, setLanyard] = useState(record?.lanyardGiven ?? false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const state = weighInState(record)
  const parsed = weight.trim() ? parseScaleReading(weight) : null
  const onWeight = madeWeight(parsed, athlete.weightClass)

  async function save() {
    if (weight.trim() && parsed == null) {
      setMessage("Enter the scale reading, e.g. 132.6")
      return
    }
    setSaving(true)
    setMessage("")
    try {
      const response = await fetch("/api/admin/toc/weigh-ins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: athlete.athleteId, recordedWeight: parsed, skinCheck: skin, lanyardGiven: lanyard }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Could not save.")
      onSaved(payload.record)
      setMessage("Saved")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save.")
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    if (!window.confirm(`Clear the weigh-in for ${athlete.name}? This removes the weight, skin check and lanyard.`)) return
    setSaving(true)
    setMessage("")
    try {
      const response = await fetch(`/api/admin/toc/weigh-ins?athleteId=${encodeURIComponent(athlete.athleteId)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Could not reset.")
      setWeight("")
      setSkin(null)
      setLanyard(false)
      onCleared(athlete.athleteId)
      setMessage("Reset")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not reset.")
    } finally {
      setSaving(false)
    }
  }

  // Green as soon as what is typed qualifies — on or under weight and skin check ticked — or once saved as cleared.
  const clearedNow = isClearedEntry(parsed, athlete.weightClass, skin === "pass") || state === "cleared"

  return (
    <div
      className={`rounded-xl border-2 p-3 transition-colors ${
        clearedNow ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{athlete.name}</p>
          <p className="text-sm text-white/55">
            {athlete.seed ? `Seed ${athlete.seed} · ` : ""}
            {athlete.club ?? "Unaffiliated"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATE_CLASS[state]}`}>{STATE_LABEL[state]}</span>
      </div>

      {athlete.phones && athlete.phones.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {athlete.phones.map((phone) => (
            <a
              key={phone.e164}
              href={`tel:${phone.e164}`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-sm font-semibold text-white/80"
            >
              📞 {phone.label}: {phone.display}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-white/40">No family phone on file</p>
      )}

      <p className="mt-2 text-sm text-white/70">
        <span className="text-white/45">Coaches: </span>
        {athlete.coaches && athlete.coaches.length > 0 ? (
          athlete.coaches.map((coach, index) => (
            <span key={coach.name}>
              {index > 0 ? ", " : ""}
              {coach.e164 ? (
                <a href={`tel:${coach.e164}`} className="font-semibold text-[#D3B574] underline underline-offset-2">
                  {coach.name}
                </a>
              ) : (
                <span className="font-semibold text-white">{coach.name}</span>
              )}
            </span>
          ))
        ) : (
          <span className="italic text-white/40">none named</span>
        )}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="flex flex-col gap-1 text-xs text-white/55">
          Scale weight (must be ≤ {athlete.weightClass})
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={`${athlete.weightClass}.0`}
            className={`min-h-11 rounded-lg border-2 px-3 text-lg tabular-nums text-white ${
              onWeight === false
                ? "border-rose-400 bg-rose-500/15"
                : onWeight === true
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/15 bg-black/30"
            }`}
          />
          {onWeight === false ? <span className="font-bold text-rose-300">Over {athlete.weightClass} — did not make weight</span> : null}
          {onWeight === true ? <span className="font-bold text-emerald-300">Made weight</span> : null}
        </label>
        <label
          className={`flex min-h-11 items-center gap-2 self-end rounded-lg border-2 px-3 text-sm font-bold ${
            skin === "pass" ? "border-emerald-400 bg-emerald-400/15 text-emerald-300" : "border-white/15 text-white/80"
          }`}
        >
          <input
            type="checkbox"
            checked={skin === "pass"}
            onChange={(e) => setSkin(e.target.checked ? "pass" : null)}
            className="h-6 w-6 accent-emerald-400"
          />
          Skin check passed
        </label>
        <label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-white/15 px-3 text-sm font-semibold">
          <input type="checkbox" checked={lanyard} onChange={(e) => setLanyard(e.target.checked)} className="h-5 w-5 accent-emerald-400" />
          Lanyard given
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="min-h-11 rounded-lg bg-[#D3B574] px-5 text-sm font-extrabold text-[#0A1628] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {record || weight || skin || lanyard ? (
          <button
            type="button"
            onClick={() => void reset()}
            disabled={saving}
            className="min-h-11 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white/70 disabled:opacity-60"
          >
            Reset
          </button>
        ) : null}
        {message ? (
          <span className={`text-sm ${message === "Saved" || message === "Reset" ? "text-emerald-300" : "text-rose-300"}`}>{message}</span>
        ) : null}
        {record?.updatedAt ? (
          <span className="ml-auto text-xs text-white/40">
            {record.recordedByName ? `${record.recordedByName} · ` : ""}
            {new Date(record.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** The paper backup and official record: every wrestler by weight, with blanks to fill in by hand. */
function PrintRoster({ roster }: { roster: RosterAthlete[] }) {
  const byWeight = new Map<number, RosterAthlete[]>()
  for (const athlete of roster) byWeight.set(athlete.weightClass, [...(byWeight.get(athlete.weightClass) ?? []), athlete])
  return (
    <div className="hidden bg-white text-black print:block">
      <h1 className="text-xl font-bold">TOC Weigh-in Roster · Friday, September 18 · 4:00–5:00 PM</h1>
      <p className="mb-3 text-sm">Flat weight, no allowance. Singlet required. Lanyard only after weight and skin check pass.</p>
      {[...byWeight.entries()].sort((a, b) => a[0] - b[0]).map(([weight, athletes]) => (
        <table key={weight} className="mb-4 w-full border-collapse text-sm" style={{ breakInside: "avoid" }}>
          <thead>
            <tr>
              <th colSpan={6} className="border border-black bg-gray-200 px-2 py-1 text-left">{weight} lbs</th>
            </tr>
            <tr>
              {["Wrestler", "Club", "Weight", "Skin ✓", "Lanyard ✓", "Initials"].map((h) => (
                <th key={h} className="border border-black px-2 py-1 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete) => (
              <tr key={athlete.athleteId}>
                <td className="border border-black px-2 py-2">{athlete.name}</td>
                <td className="border border-black px-2 py-2">{athlete.club ?? "Unaffiliated"}</td>
                <td className="w-20 border border-black px-2 py-2" />
                <td className="w-16 border border-black px-2 py-2" />
                <td className="w-20 border border-black px-2 py-2" />
                <td className="w-20 border border-black px-2 py-2" />
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  )
}
