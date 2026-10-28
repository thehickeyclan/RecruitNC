"use client"

import { useMemo, useState } from "react"
import { BookOpenCheck, CalendarCheck, Check, Plane, Plus, Trash2, X } from "lucide-react"

import { RemindMeButton } from "@/components/portal/remind-me"
import { daysUntilText, visitDates, visitPhase, VISIT_GUIDE, VISIT_KIND_LABEL, type Visit, type VisitKind } from "@/lib/recruiting/visits"

const PANEL = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const FIELD = "h-10 w-full rounded-lg border border-white/15 bg-[#0A1628] px-3 text-sm text-white placeholder:text-white/35 focus:border-[#D3B574] focus:outline-none [color-scheme:dark]"

export type VisitSchool = { id: string; name: string; logo?: string | null }

/**
 * Visits (Matt, 28 Oct 2026): the family records a planned visit - school, official or unofficial,
 * dates, who is going, notes. Upcoming ones count down; once the date has passed it asks whether it
 * happened, and "yes" logs the visit so the school moves forward on My List.
 */
export function VisitsPanel({
  initial,
  available,
  today,
  wrestlers,
  listSchools,
  allSchools,
  remindersOn,
  readOnly,
}: {
  initial: Visit[]
  available: boolean
  today: string
  wrestlers: Array<{ id: string; firstName: string }>
  listSchools: VisitSchool[]
  allSchools: VisitSchool[]
  remindersOn: boolean
  readOnly?: boolean
}) {
  const [visits, setVisits] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const names = useMemo(() => new Map([...allSchools, ...listSchools].map((s) => [s.id, s])), [allSchools, listSchools])
  const name = (id: string) => names.get(id)?.name ?? id
  const who = (id: string) => (wrestlers.length > 1 ? wrestlers.find((w) => w.id === id)?.firstName : null)

  const answer = async (v: Visit, outcome: Visit["outcome"]) => {
    setError(null)
    const res = await fetch("/api/recruiting-visits", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: v.id, outcome }) }).catch(() => null)
    const body = (await res?.json().catch(() => null)) as { visit?: Visit; error?: string } | null
    if (!res?.ok || !body?.visit) return setError(body?.error ?? "Could not save. Try again.")
    setVisits((all) => all.map((x) => (x.id === v.id ? body.visit! : x)))
  }
  const remove = async (v: Visit) => {
    if (!window.confirm(`Remove the ${name(v.schoolId)} visit?`)) return
    const res = await fetch(`/api/recruiting-visits?id=${encodeURIComponent(v.id)}`, { method: "DELETE" }).catch(() => null)
    if (res?.ok) setVisits((all) => all.filter((x) => x.id !== v.id))
  }

  const toConfirm = visits.filter((v) => visitPhase(v, today) === "confirm")
  const upcoming = visits.filter((v) => visitPhase(v, today) === "upcoming")
  const past = visits.filter((v) => visitPhase(v, today) === "happened").reverse()

  const row = (v: Visit) => {
    const school = names.get(v.schoolId)
    const phase = visitPhase(v, today)
    return (
      <li key={v.id} className="rounded-lg bg-white/[0.04] p-3">
        <div className="flex items-start gap-3">
          {school?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logo} alt="" className="h-9 w-9 shrink-0 rounded bg-white object-contain p-0.5" />
          ) : (
            <Plane className="mt-1 h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {name(v.schoolId)}
              {who(v.athleteId) ? <span className="font-semibold text-white/50"> · {who(v.athleteId)}</span> : null}
            </p>
            <p className="text-xs text-white/60">
              <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-black ${v.kind === "official" ? "bg-[#D3B574] text-[#0A1628]" : "bg-white/15 text-white"}`}>{v.kind === "official" ? "OFFICIAL" : "UNOFFICIAL"}</span>
              {visitDates(v)}
              {phase === "upcoming" ? <span className="text-white/45"> · {daysUntilText(v.startsOn, today)}</span> : null}
            </p>
            {v.who ? <p className="mt-0.5 text-xs text-white/50">Going: {v.who}</p> : null}
            {v.notes ? <p className="mt-0.5 line-clamp-2 text-xs text-white/45">{v.notes}</p> : null}
          </div>
          {!readOnly ? (
            <button type="button" onClick={() => remove(v)} aria-label="Remove the visit" className="shrink-0 rounded p-1 text-white/35 hover:text-white">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {phase === "confirm" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#D3B574]/40 bg-[#D3B574]/[0.08] p-2.5">
            <span className="mr-auto text-sm font-bold">Did the visit happen?</span>
            <button type="button" disabled={readOnly} onClick={() => answer(v, "happened")} className="rounded-lg bg-[#D3B574] px-3 py-1.5 text-xs font-black text-[#0A1628] disabled:opacity-50">
              Yes, we went
            </button>
            <button type="button" disabled={readOnly} onClick={() => answer(v, "missed")} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white/80 disabled:opacity-50">
              No
            </button>
          </div>
        ) : phase === "upcoming" ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {v.kind === "official" ? (
              <a href={VISIT_GUIDE} className="inline-flex items-center gap-1 rounded-full border border-[#D3B574]/60 px-2.5 py-1 text-xs font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
                <BookOpenCheck className="h-3.5 w-3.5" aria-hidden /> Get ready
              </a>
            ) : null}
            {remindersOn && !readOnly ? (
              <RemindMeButton ctx={{ athleteId: v.athleteId, school: { id: v.schoolId, name: name(v.schoolId) }, visit: { id: v.id, startsOn: v.startsOn, schoolName: name(v.schoolId), kind: VISIT_KIND_LABEL[v.kind].toLowerCase() } }} />
            ) : null}
          </div>
        ) : phase === "happened" ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-300">
            <Check className="h-3.5 w-3.5" aria-hidden /> Visited. Logged on My List.
          </p>
        ) : null}
      </li>
    )
  }

  return (
    <section id="visits" className={`${PANEL} scroll-mt-20 p-5`} aria-labelledby="visits-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="visits-title" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/45">
          <CalendarCheck className="h-4 w-4 text-[#D3B574]" aria-hidden /> Visits
        </h2>
        {available && !readOnly && !adding ? (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg border border-[#D3B574] px-3 py-1.5 text-xs font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add a visit
          </button>
        ) : null}
      </div>
      {!available ? (
        <p className="mt-3 text-sm text-white/55">Visit planning is being switched on.</p>
      ) : (
        <>
          {error ? <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          {adding ? (
            <VisitForm
              wrestlers={wrestlers}
              listSchools={listSchools}
              allSchools={allSchools}
              onCancel={() => setAdding(false)}
              onSaved={(v) => {
                setVisits((all) => [...all, v].sort((a, b) => a.startsOn.localeCompare(b.startsOn)))
                setAdding(false)
              }}
            />
          ) : null}
          {visits.length === 0 && !adding ? (
            <p className="mt-3 text-sm text-white/55">No visits yet. When a coach invites you, or you plan a trip to campus, add it here.</p>
          ) : null}
          {toConfirm.length || upcoming.length ? <ul className="mt-3 space-y-2">{[...toConfirm, ...upcoming].map(row)}</ul> : null}
          {past.length ? (
            <>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-white/40">Visited</p>
              <ul className="mt-2 space-y-2">{past.map(row)}</ul>
            </>
          ) : null}
          <a href={VISIT_GUIDE} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:underline">
            <BookOpenCheck className="h-3.5 w-3.5" aria-hidden /> Get ready for your official visit →
          </a>
        </>
      )}
    </section>
  )
}

function VisitForm({
  wrestlers,
  listSchools,
  allSchools,
  onCancel,
  onSaved,
}: {
  wrestlers: Array<{ id: string; firstName: string }>
  listSchools: VisitSchool[]
  allSchools: VisitSchool[]
  onCancel: () => void
  onSaved: (v: Visit) => void
}) {
  const [draft, setDraft] = useState({ athleteId: wrestlers[0]?.id ?? "", schoolId: listSchools[0]?.id ?? "", kind: "official" as VisitKind, startsOn: "", endsOn: "", who: "", notes: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listIds = new Set(listSchools.map((s) => s.id))
  const save = async () => {
    setError(null)
    if (!draft.schoolId) return setError("Pick the college.")
    if (!draft.startsOn) return setError("Add the date of the visit.")
    setBusy(true)
    const res = await fetch("/api/recruiting-visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, endsOn: draft.endsOn || null }) }).catch(() => null)
    const body = (await res?.json().catch(() => null)) as { visit?: Visit; error?: string } | null
    setBusy(false)
    if (!res?.ok || !body?.visit) return setError(body?.error ?? "Could not save. Try again.")
    onSaved(body.visit)
  }
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Plan a visit</p>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="rounded p-1 text-white/50 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {wrestlers.length > 1 ? (
          <label className="text-xs text-white/50 sm:col-span-2">
            Wrestler
            <select value={draft.athleteId} onChange={(e) => setDraft({ ...draft, athleteId: e.target.value })} className={`${FIELD} mt-0.5`}>
              {wrestlers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.firstName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-xs text-white/50 sm:col-span-2">
          College
          <select value={draft.schoolId} onChange={(e) => setDraft({ ...draft, schoolId: e.target.value })} className={`${FIELD} mt-0.5`}>
            <option value="">Pick a college</option>
            {listSchools.length ? (
              <optgroup label="My List">
                {listSchools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Every college">
              {allSchools
                .filter((s) => !listIds.has(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </label>
        <div className="flex rounded-lg border border-white/15 p-0.5 sm:col-span-2" role="radiogroup" aria-label="Kind of visit">
          {(["official", "unofficial"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={draft.kind === k}
              onClick={() => setDraft({ ...draft, kind: k })}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-bold ${draft.kind === k ? "bg-[#D3B574] text-[#0A1628]" : "text-white/65"}`}
            >
              {k === "official" ? "Official (college pays)" : "Unofficial (we pay)"}
            </button>
          ))}
        </div>
        <label className="text-xs text-white/50">
          First day
          <input type="date" value={draft.startsOn} onChange={(e) => setDraft({ ...draft, startsOn: e.target.value })} className={`${FIELD} mt-0.5`} />
        </label>
        <label className="text-xs text-white/50">
          Last day (if more than one)
          <input type="date" value={draft.endsOn} min={draft.startsOn || undefined} onChange={(e) => setDraft({ ...draft, endsOn: e.target.value })} className={`${FIELD} mt-0.5`} />
        </label>
        <label className="text-xs text-white/50 sm:col-span-2">
          Who&apos;s going
          <input value={draft.who} maxLength={200} onChange={(e) => setDraft({ ...draft, who: e.target.value })} placeholder="The wrestler, Mom and Dad" className={`${FIELD} mt-0.5`} />
        </label>
        <label className="text-xs text-white/50 sm:col-span-2">
          Notes
          <textarea value={draft.notes} maxLength={2000} rows={2} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Meet Coach Smith at 10, practice at 3" className={`${FIELD} mt-0.5 h-auto py-2`} />
        </label>
      </div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      <button type="button" onClick={save} disabled={busy} className="mt-3 rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d] disabled:opacity-60">
        {busy ? "Saving…" : "Save the visit"}
      </button>
    </div>
  )
}
