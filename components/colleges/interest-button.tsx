"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, Send } from "lucide-react"

type Wrestler = { id: string; firstName: string }
type State = { wrestlers: Wrestler[]; sent: Set<string> }

/**
 * "Let the coaches know" on a college's page (Matt, 21 Oct 2026): one tap tells this program's
 * coaches the wrestler is interested; they see it on Coach Home. Free for every family; shown only
 * when the program's coaches are on the platform to see it. One button per wrestler on the account.
 */
export function InterestButton({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const [state, setState] = useState<State | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/college-list/interest", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return
        const body = (await res.json()) as { available: boolean; wrestlers: Wrestler[]; sent: Array<{ athleteId: string; schoolId: string }> }
        if (body.available) setState({ wrestlers: body.wrestlers, sent: new Set(body.sent.filter((s) => s.schoolId === schoolId).map((s) => s.athleteId)) })
      })
      .catch(() => {})
  }, [schoolId])

  if (!state || !state.wrestlers.length) return null

  const toggle = async (w: Wrestler) => {
    const on = !state.sent.has(w.id)
    setBusy(w.id)
    const res = await fetch("/api/college-list/interest", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId: w.id, schoolId, interested: on }) }).catch(() => null)
    setBusy(null)
    if (!res?.ok) return
    const sent = new Set(state.sent)
    if (on) sent.add(w.id)
    else sent.delete(w.id)
    setState({ ...state, sent })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {state.wrestlers.map((w) =>
        state.sent.has(w.id) ? (
          <span key={w.id} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-200">
            <BadgeCheck className="h-4 w-4" aria-hidden /> {schoolName}&apos;s coaches know {w.firstName} is interested
            <button type="button" disabled={busy === w.id} onClick={() => toggle(w)} className="ml-1 text-xs font-semibold text-white/50 underline hover:text-white">
              Undo
            </button>
          </span>
        ) : (
          <button
            key={w.id}
            type="button"
            disabled={busy === w.id}
            onClick={() => toggle(w)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--recruit-accent)] px-3 py-2 text-sm font-bold text-white hover:bg-white/5"
          >
            <Send className="h-4 w-4" style={{ color: "var(--recruit-accent)" }} aria-hidden /> Tell the coaches {state.wrestlers.length > 1 ? `${w.firstName} is` : "you're"} interested
          </button>
        ),
      )}
    </div>
  )
}
