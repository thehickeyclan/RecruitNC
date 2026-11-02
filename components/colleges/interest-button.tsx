"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, Mail, Send } from "lucide-react"
import { useCoachMode } from "@/hooks/use-coach-mode"
import { BrandName } from "@/components/recruiting/brand-name"

type Wrestler = { id: string; firstName: string }
type State = { wrestlers: Wrestler[]; sent: Set<string> }

const PRIMARY =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[var(--recruit-accent)] px-4 py-2 text-sm font-black text-[var(--recruit-on-accent)] transition hover:opacity-90 disabled:opacity-50"

/**
 * "Tell the coaches you're interested" on a college's page (Matt, 21 Oct 2026): one tap tells this
 * program's coaches the wrestler is interested; they see it on My Recruits and Interested. Free for
 * every family. One button per wrestler on the account.
 *
 * A primary button in the page header beside Save to My List (Matt, 2 Nov 2026), not a strip under
 * it. When the program's coaches are not on the platform nobody would see the tap, so it is not
 * offered; the next step there is the Command Center's reach-out checklist (the program's own
 * questionnaire and a coach email), without promising anyone reads them here.
 *
 * Never for a coach, or an admin looking at the coach view.
 */
export function InterestButton({
  schoolId,
  schoolName,
  onPlatform,
}: {
  schoolId: string
  schoolName: string
  /** This program's coaches use the platform (the college map's onRecruitNC). */
  onPlatform: boolean
}) {
  const { actsAsCoach } = useCoachMode()
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

  if (actsAsCoach || !state || !state.wrestlers.length) return null

  if (!onPlatform) {
    // The questionnaire is already the header's button; the checklist holds it and the coach email.
    return (
      <div className="flex flex-col gap-1.5">
        <a href="/my-recruiting/reach-out" className={PRIMARY}>
          <Mail className="h-4 w-4" aria-hidden /> Reach out to the coaches
        </a>
        <p className="max-w-xs text-xs text-white/50">
          {schoolName}&apos;s coaches are not on <BrandName /> yet. Their questionnaire and a coach email reach them directly.
        </p>
      </div>
    )
  }

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
          <span key={w.id} className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-200">
            <BadgeCheck className="h-4 w-4" aria-hidden /> {schoolName}&apos;s coaches know {w.firstName} is interested
            <button type="button" disabled={busy === w.id} onClick={() => toggle(w)} className="ml-1 text-xs font-semibold text-white/50 underline hover:text-white">
              Undo
            </button>
          </span>
        ) : (
          <button key={w.id} type="button" disabled={busy === w.id} onClick={() => toggle(w)} className={PRIMARY}>
            <Send className="h-4 w-4" aria-hidden /> Tell the coaches {state.wrestlers.length > 1 ? `${w.firstName} is` : "you're"} interested
          </button>
        ),
      )}
    </div>
  )
}
