"use client"

import { useState } from "react"
import { Bell, Plus, Trash2 } from "lucide-react"

import { ReminderDialog } from "@/components/portal/remind-me"
import { reminderWhen, type Reminder } from "@/lib/recruiting/reminders"

const PANEL = "rounded-xl border border-white/10 bg-[#0f1c2e]"

/** The family's reminders: what is coming, and a button for a new one (Matt, 28 Oct 2026). */
export function RemindersPanel({
  initial,
  available,
  schoolNames,
  athleteId,
  readOnly,
  limit,
}: {
  initial: Reminder[]
  available: boolean
  schoolNames: Record<string, string>
  athleteId?: string | null
  readOnly?: boolean
  /** Show only the next few (the home page). */
  limit?: number
}) {
  const [reminders, setReminders] = useState(initial.filter((r) => !r.sentAt))
  const [adding, setAdding] = useState(false)
  const shown = limit ? reminders.slice(0, limit) : reminders
  const remove = async (r: Reminder) => {
    const res = await fetch(`/api/family-reminders?id=${encodeURIComponent(r.id)}`, { method: "DELETE" }).catch(() => null)
    if (res?.ok) setReminders((all) => all.filter((x) => x.id !== r.id))
  }
  return (
    <section id="reminders" className={`${PANEL} scroll-mt-20 p-5`} aria-labelledby="reminders-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="reminders-title" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/45">
          <Bell className="h-4 w-4 text-[#D3B574]" aria-hidden /> Reminders
        </h2>
        {available && !readOnly ? (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg border border-[#D3B574] px-3 py-1.5 text-xs font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
            <Plus className="h-3.5 w-3.5" aria-hidden /> New reminder
          </button>
        ) : null}
      </div>
      {!available ? (
        <p className="mt-3 text-sm text-white/55">Reminders are being switched on.</p>
      ) : shown.length === 0 ? (
        <p className="mt-3 text-sm text-white/55">Nothing scheduled. Set one for a follow-up, a form or the day before a visit; it arrives on your phone and by email.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {shown.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">{r.note}</span>
                <span className="block text-xs text-white/50">
                  {reminderWhen(r.remindAt)}
                  {r.schoolId && schoolNames[r.schoolId] && !r.note.includes(schoolNames[r.schoolId]) ? ` · ${schoolNames[r.schoolId]}` : ""}
                </span>
              </span>
              {!readOnly ? (
                <button type="button" onClick={() => remove(r)} aria-label="Delete the reminder" className="shrink-0 rounded p-1 text-white/35 hover:text-white">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
          {limit && reminders.length > limit ? (
            <li>
              <a href="/my-recruiting/plan#reminders" className="text-xs font-bold text-[#D3B574] hover:underline">
                {reminders.length - limit} more →
              </a>
            </li>
          ) : null}
        </ul>
      )}
      {adding ? (
        <ReminderDialog
          ctx={{ athleteId: athleteId ?? null }}
          onClose={() => setAdding(false)}
          onSaved={(r) => {
            setReminders((all) => [...all, r].sort((a, b) => a.remindAt.localeCompare(b.remindAt)))
            setAdding(false)
          }}
        />
      ) : null}
    </section>
  )
}
