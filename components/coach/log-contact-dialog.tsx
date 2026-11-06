"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** What a coach logs. The values are the ones recruiting_actions already holds (app/api/coach-portal/activities). */
export const ACTIVITY_TYPES = [
  { value: "call", label: "Call" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "visit", label: "Campus visit" },
  { value: "watched_live", label: "Watched live" },
  { value: "prospect_camp", label: "Prospect camp" },
  { value: "social_media", label: "Social media" },
  { value: "letter", label: "Letter" },
  { value: "other", label: "Other" },
] as const
/** Platform messages count as contact without anyone logging them (lib/my-recruits.ts). */
export const activityLabel = (type: string) =>
  type === "message" ? "Message sent" : type === "reply" ? "Family replied" : (ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? "Contact")
/**
 * Log a contact, from the board or a wrestler's profile: what it was, when, a note, and an optional follow-up date. Saved
 * to the program's activity log; a first contact or a visit also moves the wrestler along the
 * funnel (activity-helpers.ts).
 */
export function LogActivityDialog({ row, onClose, onSaved }: { row: { athleteId: string; name: string }; onClose: () => void; onSaved: () => void }) {
  // The coach's own day: toISOString() is UTC, which is tomorrow by evening in the US.
  const today = new Date().toLocaleDateString("en-CA")
  const [type, setType] = useState<string>("call")
  const [date, setDate] = useState(today)
  const [note, setNote] = useState("")
  const [followUp, setFollowUp] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/coach-portal/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId: row.athleteId, actionType: type, actionDate: date, followUpDate: followUp || null, description: note }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Could not save.")
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.")
    } finally {
      setSaving(false)
    }
  }

  const field = "mt-1 w-full rounded-lg border px-3 py-2 text-sm"
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log contact with {row.name}</DialogTitle>
          <DialogDescription>Your whole staff sees this on the board.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={cn(
                "min-h-[36px] rounded-full border px-3 text-xs font-semibold",
                type === t.value ? "border-[#0A1628] bg-[#0A1628] text-white" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold">
            When
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={field} />
          </label>
          <label className="text-xs font-semibold">
            Follow up (optional)
            <input type="date" value={followUp} min={today} onChange={(e) => setFollowUp(e.target.value)} className={field} />
          </label>
        </div>
        <label className="text-xs font-semibold">
          Note (optional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="What was said, what comes next" className={field} />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[40px] rounded-lg px-4 text-sm font-semibold text-muted-foreground">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving || !date} className="min-h-[40px] rounded-lg bg-[#0A1628] px-4 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
