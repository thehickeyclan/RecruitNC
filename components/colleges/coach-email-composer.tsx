"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, Mail, Plus, X } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CollegeListStatus } from "@/lib/college-programs/list"
import type { OutreachContext, SuggestedEvent } from "@/lib/college-programs/outreach"
import { eventDates } from "@/lib/college-programs/outreach-results"
import {
  OUTREACH_KINDS,
  OUTREACH_KIND_HINT,
  OUTREACH_KIND_LABEL,
  WHY_PROMPTS,
  outreachBlocker,
  renderOutreachEmail,
  type OutreachEvent,
  type OutreachKind,
} from "@/lib/college-programs/outreach-templates"

/** Where sending each kind of email leaves the school on My List. Null leaves it where it is. */
const STATUS_AFTER: Record<OutreachKind, CollegeListStatus | null> = {
  intro: "contacted",
  competing: null,
  update: null,
  visit: "visited",
  reply: "talking",
}

const DETAIL_LABEL: Partial<Record<OutreachKind, { label: string; placeholder: string }>> = {
  update: { label: "What happened?", placeholder: "I went 5-1 at Super 32 and placed 6th at 132." },
  visit: { label: "What did you come for, and what stood out?", placeholder: "I learned a lot at your June camp, especially the work on top." },
  reply: { label: "Your answer to the coach", placeholder: "Yes, I can send my transcript this week." },
}

/** A schedule entry as the composer holds it: the saved row's id, when it came from the account. */
type ScheduleEvent = OutreachEvent & { id?: string }
type SavedEvent = { id: string; title: string; startDate: string; endDate: string | null; location: string | null }

const fromSaved = (e: SavedEvent): ScheduleEvent => ({
  id: e.id,
  title: e.title,
  dates: eventDates(e.startDate, e.endDate),
  location: e.location,
})

export function CoachEmailComposer({
  schoolId,
  schoolName,
  initialAthleteId,
  open,
  onOpenChange,
  onSent,
}: {
  schoolId: string
  schoolName: string
  /** The wrestler the page is already showing, so a parent of two is not asked twice. */
  initialAthleteId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called once the draft has been opened or copied, with the status the school should move to. */
  onSent: (status: CollegeListStatus | null) => void
}) {
  const [context, setContext] = useState<OutreachContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [athleteId, setAthleteId] = useState<string | null>(initialAthleteId ?? null)
  const [kind, setKind] = useState<OutreachKind>("intro")
  const [why, setWhy] = useState("")
  const [detail, setDetail] = useState("")
  const [questionnaireDone, setQuestionnaireDone] = useState(false)
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [custom, setCustom] = useState({ title: "", startDate: "", endDate: "", location: "" })
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setContext(null)
    setError(null)
    const query = new URLSearchParams({ school: schoolId, ...(athleteId ? { athlete: athleteId } : {}) })
    fetch(`/api/college-list/outreach?${query}`, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json()) as OutreachContext & { error?: string }
        if (!res.ok) throw new Error(body.error || "Could not load the draft.")
        if (cancelled) return
        setContext(body)
        setEvents([])
        if (!body.facts) return
        // The schedule lives on the wrestler's account, so it is the same on every device.
        const res2 = await fetch(`/api/college-list/schedule?athlete=${encodeURIComponent(body.facts.athleteId)}`, { cache: "no-store" })
        if (!res2.ok || cancelled) return
        const saved = (await res2.json()) as { events?: SavedEvent[] }
        if (!cancelled) setEvents((saved.events ?? []).map(fromSaved))
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the draft.")
      })
    return () => {
      cancelled = true
    }
  }, [open, schoolId, athleteId])

  const facts = context?.facts ?? null
  const input = useMemo(() => ({ kind, why, detail, questionnaireDone, events }), [kind, why, detail, questionnaireDone, events])
  const blocker = outreachBlocker(input)
  const generated = useMemo(() => (facts && !blocker ? renderOutreachEmail(facts, input) : null), [facts, blocker, input])

  /**
   * The family's own edits to the draft. They hold until the boxes above change what the template
   * would say - then the draft is rebuilt, because an edit made against an older draft (a
   * different wrestler, another kind of email) would be wrong to keep.
   */
  const [edited, setEdited] = useState<{ from: string; subject: string; body: string } | null>(null)
  const generatedKey = generated ? `${generated.subject}\n${generated.body}` : ""
  const email =
    generated && edited && edited.from === generatedKey ? { subject: edited.subject, body: edited.body } : generated
  const isEdited = Boolean(generated && email && (email.subject !== generated.subject || email.body !== generated.body))
  const edit = (patch: { subject?: string; body?: string }) => {
    if (!generated || !email) return
    setEdited({ from: generatedKey, subject: patch.subject ?? email.subject, body: patch.body ?? email.body })
  }

  const hasEvent = (e: OutreachEvent) => events.some((x) => x.title === e.title && x.dates === e.dates)

  const addEvent = async (event: { title: string; startDate: string; endDate: string | null; location: string | null }) => {
    if (!facts) return false
    setScheduleError(null)
    const res = await fetch("/api/college-list/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId: facts.athleteId, ...event }),
    })
    const body = (await res.json().catch(() => ({}))) as { event?: SavedEvent; error?: string }
    if (!res.ok || !body.event) {
      setScheduleError(body.error || "Could not save the event. Try again.")
      return false
    }
    const added = fromSaved(body.event)
    setEvents((current) => [...current.filter((x) => x.id !== added.id), added])
    return true
  }

  const removeEvent = async (event: ScheduleEvent) => {
    setEvents((current) => current.filter((x) => x !== event))
    if (!facts || !event.id) return
    const res = await fetch(
      `/api/college-list/schedule?athlete=${encodeURIComponent(facts.athleteId)}&event=${encodeURIComponent(event.id)}`,
      { method: "DELETE" },
    )
    if (!res.ok) setScheduleError("Could not remove the event. Try again.")
  }

  const addSuggested = (e: SuggestedEvent) =>
    addEvent({ title: e.title, startDate: e.startDate, endDate: e.endDate, location: e.location ?? null })

  const addCustom = async () => {
    const title = custom.title.trim()
    if (!title || !custom.startDate) {
      setScheduleError("Give the event a name and the date it starts.")
      return
    }
    const ok = await addEvent({
      title,
      startDate: custom.startDate,
      endDate: custom.endDate || null,
      location: custom.location.trim() || null,
    })
    if (ok) setCustom({ title: "", startDate: "", endDate: "", location: "" })
  }

  const finish = () => onSent(STATUS_AFTER[kind])
  const mailto = email
    ? `mailto:${context?.coach?.email ?? ""}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
    : undefined
  const copy = async () => {
    if (!email) return
    try {
      await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
      finish()
    } catch {
      setError("Could not copy. Select the text below and copy it yourself.")
    }
  }

  const detailField = DETAIL_LABEL[kind]
  const offered = (context?.suggestedEvents ?? []).filter((e) => !hasEvent(e))
  const field = "w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B1D3A] focus:outline-none"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email the coach at {schoolName}</DialogTitle>
          <DialogDescription>
            Written in the wrestler&apos;s voice with verified results filled in. It opens in your own email, so you can
            read and change it before you send.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="rounded-sm bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {!context && !error ? <p className="text-sm text-slate-500">Loading the wrestler&apos;s results…</p> : null}

        {context && context.athletes.length === 0 ? (
          <p className="rounded-sm bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            There is no wrestler linked to this account yet. Claim your profile, or link to your wrestler as a parent,
            and this will fill in from their record.
          </p>
        ) : null}

        {context && facts ? (
          <div className="space-y-4">
            {context.athletes.length > 1 ? (
              <label className="block text-sm font-semibold text-slate-800">
                Which wrestler?
                <select value={facts.athleteId} onChange={(e) => setAthleteId(e.target.value)} className={`${field} mt-1`}>
                  {context.athletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block text-sm font-semibold text-slate-800">
              What kind of email?
              <select value={kind} onChange={(e) => setKind(e.target.value as OutreachKind)} className={`${field} mt-1`}>
                {OUTREACH_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {OUTREACH_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">{OUTREACH_KIND_HINT[kind]}</span>
            </label>

            {kind === "intro" ? (
              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Why {facts.schoolName}? In your own words.
                  <textarea
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    rows={3}
                    className={`${field} mt-1`}
                    placeholder="One or two sentences only you could write."
                  />
                </label>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-slate-500">
                  {WHY_PROMPTS.map((prompt) => (
                    <li key={prompt}>{prompt}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detailField ? (
              <label className="block text-sm font-semibold text-slate-800">
                {detailField.label}
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  className={`${field} mt-1`}
                  placeholder={detailField.placeholder}
                />
              </label>
            ) : null}

            {kind !== "visit" ? (
              <div>
                <p className="text-sm font-semibold text-slate-800">Where are you wrestling next?</p>
                {events.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {events.map((e) => (
                      <li key={`${e.title}-${e.dates}`} className="flex items-center justify-between gap-2 rounded-sm bg-slate-100 px-2.5 py-1.5 text-sm text-slate-800">
                        <span>
                          {e.title}, {e.dates}
                          {e.location ? <span className="text-slate-500"> ({e.location})</span> : null}
                        </span>
                        <button type="button" onClick={() => removeEvent(e)} aria-label={`Remove ${e.title}`} className="text-slate-500 hover:text-slate-900">
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {offered.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {offered.slice(0, 8).map((e) => (
                      <button
                        key={`${e.title}-${e.dates}`}
                        type="button"
                        onClick={() => addSuggested(e)}
                        className="inline-flex items-center gap-1 rounded-sm border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="h-3 w-3" /> {e.title} · {e.dates}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input value={custom.title} onChange={(e) => setCustom({ ...custom, title: e.target.value })} placeholder="Event name" className={field} aria-label="Event name" />
                  <input value={custom.location} onChange={(e) => setCustom({ ...custom, location: e.target.value })} placeholder="City (optional)" className={field} aria-label="Event location" />
                  <label className="text-xs text-slate-600">
                    Starts
                    <input type="date" value={custom.startDate} onChange={(e) => setCustom({ ...custom, startDate: e.target.value })} className={`${field} mt-0.5`} aria-label="Start date" />
                  </label>
                  <label className="text-xs text-slate-600">
                    Ends (if more than one day)
                    <input type="date" value={custom.endDate} min={custom.startDate || undefined} onChange={(e) => setCustom({ ...custom, endDate: e.target.value })} className={`${field} mt-0.5`} aria-label="End date" />
                  </label>
                </div>
                <button type="button" onClick={addCustom} className="mt-2 rounded-sm border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  Add to my schedule
                </button>
                {scheduleError ? <p className="mt-1 text-xs text-red-700">{scheduleError}</p> : null}
                <p className="mt-1 text-xs text-slate-500">Saved to {facts.firstName}&apos;s schedule, so it&apos;s here for every email. Approved college coaches see it on the profile; it is never public.</p>
              </div>
            ) : null}

            {kind === "intro" && context.hasQuestionnaire ? (
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={questionnaireDone} onChange={(e) => setQuestionnaireDone(e.target.checked)} className="h-4 w-4" />
                I&apos;ve filled out their recruiting questionnaire
              </label>
            ) : null}

            {facts.results.length === 0 ? (
              <p className="rounded-sm bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                We don&apos;t hold a state or national placing for {facts.firstName} yet, so the email leaves results out
                rather than guess. Add them in your own words once it opens.
              </p>
            ) : null}

            <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                To {context.coach ? `${context.coach.name}, ${context.coach.title}` : "the head coach"}
                {context.coach && !context.coach.email ? " — no email on file; find it on the athletics website" : ""}
              </p>
              {email ? (
                <>
                  <input
                    value={email.subject}
                    onChange={(e) => edit({ subject: e.target.value })}
                    aria-label="Subject"
                    className={`${field} mt-2 font-semibold`}
                  />
                  <textarea
                    value={email.body}
                    onChange={(e) => edit({ body: e.target.value })}
                    aria-label="Email text"
                    rows={Math.min(22, Math.max(10, email.body.split("\n").length + 2))}
                    className={`${field} mt-2 leading-6`}
                  />
                  <p className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Change anything you like. You can edit it again in your email before sending.</span>
                    {isEdited ? (
                      <button type="button" onClick={() => setEdited(null)} className="shrink-0 font-semibold text-slate-700 hover:underline">
                        Undo my changes
                      </button>
                    ) : null}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">{blocker}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={mailto}
                onClick={(e) => {
                  if (!email) e.preventDefault()
                  else finish()
                }}
                aria-disabled={!email}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-bold text-white ${
                  email ? "bg-[#CC0000] hover:bg-[#a80000]" : "cursor-not-allowed bg-slate-300"
                }`}
              >
                <Mail className="h-4 w-4" /> Open in my email
              </a>
              <button
                type="button"
                onClick={copy}
                disabled={!email}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy instead"}
              </button>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              One school at a time, on purpose: coaches delete emails that read like a mass mailing. Division I coaches
              may not be allowed to reply to underclassmen yet, so silence is not a no.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
