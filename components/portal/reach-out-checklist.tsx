"use client"

import { useState } from "react"
import { Check, ClipboardList, Mail, Send } from "lucide-react"

import { CoachEmailComposer } from "@/components/colleges/coach-email-composer"
import { COLLEGE_LIST_STATUSES, type CollegeListStatus } from "@/lib/college-programs/list"

export type ReachState = {
  /** Null when the program's coaches are not on the platform, so there is no one to tell. */
  interest: boolean | null
  formDone: boolean
  emailed: boolean
}

const put = (body: Record<string, unknown>) =>
  fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.ok, () => false)

/**
 * The three reach-out moves for one college (Matt, 28 Oct 2026), each one tap away:
 *
 * - Interested: tells the program's coaches, who see it on Coach Home (only when they are on the platform).
 * - Form: opens the college's interest form with the family's answers ready to copy.
 * - Email: opens the coach email. It goes out from the family's own mail app (a mailto link), so
 *   using the composer - or ticking the circle - is what records it.
 *
 * The circle on each move ticks it by hand; the label does the move.
 */
export function ReachOutChecklist({
  school,
  athlete,
  initial,
  status,
  readOnly,
  compact = false,
  onChange,
}: {
  school: { id: string; name: string }
  athlete: { id: string; firstName: string }
  initial: ReachState
  status: CollegeListStatus
  readOnly?: boolean
  compact?: boolean
  onChange?: (state: ReachState) => void
}) {
  const [state, setState] = useState(initial)
  const [busy, setBusy] = useState<keyof ReachState | null>(null)
  const [composing, setComposing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (next: ReachState) => {
    setState(next)
    onChange?.(next)
  }

  const toggleInterest = async () => {
    if (readOnly || state.interest === null) return
    const on = !state.interest
    setBusy("interest")
    const res = await fetch("/api/college-list/interest", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId: athlete.id, schoolId: school.id, interested: on }) }).catch(() => null)
    setBusy(null)
    if (res?.ok) update({ ...state, interest: on })
    else setError("Could not save. Try again.")
  }
  const tick = async (key: "formDone" | "emailed", done: boolean) => {
    if (readOnly) return
    if (!done && !window.confirm(key === "formDone" ? "Mark the interest form as not done?" : "Mark the coach email as not sent?")) return
    setBusy(key)
    const ok = await put(key === "formDone" ? { schoolId: school.id, questionnaireDone: done } : { schoolId: school.id, emailed: done })
    setBusy(null)
    if (ok) update({ ...state, [key]: done })
    else setError("Could not save. Try again.")
  }

  const items: Array<{ key: keyof ReachState; label: string; done: boolean; icon: typeof Send; act: () => void; tick?: () => void }> = []
  if (state.interest !== null) {
    items.push({ key: "interest", label: compact ? "Interested" : state.interest ? "Interested" : "Say interested", done: state.interest, icon: Send, act: () => void toggleInterest() })
  }
  items.push({
    key: "formDone",
    label: compact ? "Form" : state.formDone ? "Form in" : "Interest form",
    done: state.formDone,
    icon: ClipboardList,
    act: () => {
      window.location.href = `/my-recruiting/questionnaires?w=${encodeURIComponent(athlete.id)}#form-${school.id}`
    },
    tick: () => void tick("formDone", !state.formDone),
  })
  items.push({ key: "emailed", label: compact ? "Email" : state.emailed ? "Emailed" : "Email coach", done: state.emailed, icon: Mail, act: () => setComposing(true), tick: () => void tick("emailed", !state.emailed) })

  const doneCount = items.filter((i) => i.done).length
  return (
    <div className="min-w-0">
      <div className={`flex items-center ${compact ? "flex-nowrap gap-1" : "flex-wrap gap-1.5"}`}>
        {items.map((i) => {
          const Icon = i.icon
          const tone = i.done ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/15 text-white/80 hover:border-[#D3B574]"
          return (
            <span key={i.key} className={`inline-flex items-stretch overflow-hidden rounded-full border ${tone} ${busy === i.key ? "opacity-60" : ""}`}>
              {i.tick ? (
                <button
                  type="button"
                  onClick={i.tick}
                  disabled={readOnly || busy !== null}
                  aria-label={i.done ? `${i.label}: tap to undo` : `Mark ${i.label.toLowerCase()} done`}
                  title={i.done ? "Done - tap to undo" : "Tick it when it is done"}
                  className="flex items-center pl-2 pr-1"
                >
                  {i.done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span className="h-3 w-3 rounded-full border border-current" aria-hidden />}
                </button>
              ) : null}
              <button
                type="button"
                onClick={i.act}
                disabled={readOnly || busy !== null}
                className={`flex items-center gap-1 whitespace-nowrap py-1 pr-2.5 font-bold ${i.tick ? "pl-0.5" : "pl-2.5"} ${compact ? "text-[11px]" : "text-xs"}`}
              >
                {i.tick ? null : i.done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Icon className="h-3.5 w-3.5" aria-hidden />}
                {i.label}
              </button>
            </span>
          )
        })}
        {!compact ? <span className="text-[11px] font-semibold text-white/45">{doneCount} of {items.length}</span> : null}
      </div>
      {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}
      {composing ? (
        <CoachEmailComposer
          schoolId={school.id}
          schoolName={school.name}
          initialAthleteId={athlete.id}
          open
          onOpenChange={(o) => {
            if (!o) setComposing(false)
          }}
          onSent={(next) => {
            // The draft was opened in the mail app or copied: record the email, and move the college forward, never back.
            void put({ schoolId: school.id, emailed: true, ...(next && COLLEGE_LIST_STATUSES.indexOf(next) > COLLEGE_LIST_STATUSES.indexOf(status) ? { status: next } : {}) })
            update({ ...state, emailed: true })
          }}
        />
      ) : null}
    </div>
  )
}
