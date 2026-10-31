"use client"

import { useMemo, useState } from "react"
import { Bell, X } from "lucide-react"

import { addDays, easternAt, easternDay, reminderPresets, type Reminder, type ReminderTopic } from "@/lib/recruiting/reminders"

const FIELD = "h-10 w-full rounded-lg border border-white/15 bg-[#0A1628] px-3 text-sm text-white placeholder:text-white/35 focus:border-[#D3B574] focus:outline-none [color-scheme:dark]"

export type RemindContext = {
  athleteId?: string | null
  school?: { id: string; name: string } | null
  visit?: { id: string; startsOn: string; schoolName: string; kind: string } | null
}

/**
 * Schedule a reminder (Matt, 28 Oct 2026): a quick preset such as "follow up with this coach in a
 * week" or "the day before the visit", or a date, a time and a note of the parent's own. It
 * arrives by app push and email (/api/cron/family-reminders).
 */
export function RemindMeButton({ ctx, label = "Remind me", onSaved, className }: { ctx: RemindContext; label?: string; onSaved?: (r: Reminder) => void; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-xs font-bold text-white/80 hover:border-[#D3B574]"}
      >
        <Bell className="h-3.5 w-3.5" aria-hidden /> {label}
      </button>
      {open ? <ReminderDialog ctx={ctx} onClose={() => setOpen(false)} onSaved={(r) => { onSaved?.(r); setOpen(false) }} /> : null}
    </>
  )
}

export function ReminderDialog({ ctx, onClose, onSaved }: { ctx: RemindContext; onClose: () => void; onSaved: (r: Reminder) => void }) {
  const presets = useMemo(() => reminderPresets({ school: ctx.school ?? null, visit: ctx.visit ?? null }), [ctx.school, ctx.visit])
  // Opens on the first preset, its day, time and note all filled; a family changes what they like.
  const first = presets[0] ?? null
  const at = (iso: string) => {
    const d = new Date(iso)
    return { day: d.toLocaleDateString("en-CA", { timeZone: "America/New_York" }), time: d.toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" }) }
  }
  const [day, setDay] = useState(first ? at(first.remindAt).day : addDays(easternDay(), 1))
  const [time, setTime] = useState(first ? at(first.remindAt).time : "09:00")
  const [note, setNote] = useState(first?.note ?? "")
  const [topic, setTopic] = useState<ReminderTopic>(first?.topic ?? (ctx.visit ? "visit" : ctx.school ? "school" : "note"))
  const [picked, setPicked] = useState<string | null>(first?.key ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = (key: string) => {
    const p = presets.find((x) => x.key === key)
    if (!p) return
    setPicked(key)
    setDay(at(p.remindAt).day)
    setTime(at(p.remindAt).time)
    if (p.note) setNote(p.note)
    setTopic(p.topic)
  }

  const save = async () => {
    setError(null)
    if (!note.trim()) return setError("Add a note: what to remember.")
    const [h, m] = time.split(":").map(Number)
    const remindAt = easternAt(day, h || 0, m || 0).toISOString()
    setBusy(true)
    const res = await fetch("/api/family-reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindAt, note, topic, athleteId: ctx.athleteId ?? null, schoolId: ctx.school?.id ?? null, visitId: ctx.visit?.id ?? null }),
    }).catch(() => null)
    const body = (await res?.json().catch(() => null)) as { reminder?: Reminder; error?: string } | null
    setBusy(false)
    if (!res?.ok || !body?.reminder) return setError(body?.error ?? "Could not save. Try again.")
    onSaved(body.reminder)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Set a reminder" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#0f1c2e] p-5 text-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-base font-black">
            <Bell className="h-4 w-4 text-[#D3B574]" aria-hidden /> Set a reminder
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-white/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {ctx.school || ctx.visit ? <p className="mt-0.5 text-xs text-white/50">{ctx.visit ? `${ctx.visit.schoolName} · ${ctx.visit.kind}` : ctx.school?.name}</p> : null}
        {presets.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => choose(p.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${picked === p.key ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/75 hover:text-white"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-xs text-white/50">
            Day
            <input type="date" value={day} min={easternDay()} onChange={(e) => { setDay(e.target.value); setPicked(null) }} className={`${FIELD} mt-0.5`} />
          </label>
          <label className="text-xs text-white/50">
            Time (Eastern)
            <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setPicked(null) }} className={`${FIELD} mt-0.5`} />
          </label>
        </div>
        <label className="mt-2 block text-xs text-white/50">
          Note
          <textarea value={note} maxLength={300} rows={2} onChange={(e) => setNote(e.target.value)} placeholder="Call Coach Smith back about the visit" className={`${FIELD} mt-0.5 h-auto py-2`} />
        </label>
        {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        <button type="button" onClick={save} disabled={busy} className="mt-4 w-full rounded-lg bg-[#D3B574] py-2.5 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d] disabled:opacity-60">
          {busy ? "Saving…" : "Save reminder"}
        </button>
        <p className="mt-2 text-center text-[11px] text-white/40">Sent to your phone and your email.</p>
      </div>
    </div>
  )
}
