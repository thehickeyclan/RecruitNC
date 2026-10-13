"use client"

import { useMemo, useRef, useState } from "react"
import { CalendarDays, Check, ChevronRight, Circle, ListChecks, Lock, Mail, MapPin, X } from "lucide-react"

import { CoachEmailComposer } from "@/components/colleges/coach-email-composer"
import {
  COLLEGE_LIST_STATUSES,
  COLLEGE_LIST_STATUS_LABEL,
  type CollegeListStatus,
} from "@/lib/college-programs/list"
import { eventDates } from "@/lib/college-programs/outreach-results"
import { planSteps, type PlanStep } from "@/lib/college-programs/roadmap"

export type WarRoomSchool = {
  id: string
  name: string
  place: string
  level: string
  status: CollegeListStatus
  logo: string | null
  hasQuestionnaire: boolean
}

type SavedEvent = { id: string; title: string; startDate: string; endDate: string | null; location: string | null }

export type WarRoomWrestler = {
  id: string
  firstName: string
  name: string
  grade: string | null
  profilePercent: number
  profileTodo: { todo: string; edit: string } | null
  events: SavedEvent[]
}

const PANEL = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const TITLE = "flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/45"
const FIELD =
  "h-10 w-full rounded-lg border border-white/15 bg-[#0A1628] px-3 text-sm text-white placeholder:text-white/35 focus:border-[#D3B574] focus:outline-none"

/**
 * Plan: this month's steps, the college list and the schedule (app/my-recruiting).
 *
 * The college list is one per account and the schedule one per wrestler, so a parent with two
 * wrestlers switches wrestler for the steps and the schedule and keeps the same list.
 */
export function WarRoomPlan({
  blue,
  wrestlers,
  schools: initialSchools,
}: {
  blue: boolean
  wrestlers: WarRoomWrestler[]
  schools: WarRoomSchool[]
}) {
  const [wrestlerId, setWrestlerId] = useState(wrestlers[0]?.id ?? "")
  const [schools, setSchools] = useState(initialSchools)
  const [eventsBy, setEventsBy] = useState<Record<string, SavedEvent[]>>(() =>
    Object.fromEntries(wrestlers.map((w) => [w.id, w.events])),
  )
  const [emailSchool, setEmailSchool] = useState<WarRoomSchool | null>(null)
  const [draft, setDraft] = useState({ title: "", startDate: "", endDate: "", location: "" })
  const [error, setError] = useState<string | null>(null)
  const scheduleRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const wrestler = wrestlers.find((w) => w.id === wrestlerId) ?? wrestlers[0]
  const events = useMemo(() => eventsBy[wrestler?.id ?? ""] ?? [], [eventsBy, wrestler])

  const steps = useMemo(
    () =>
      wrestler
        ? planSteps({
            firstName: wrestler.firstName,
            athleteId: wrestler.id,
            grade: wrestler.grade,
            profilePercent: wrestler.profilePercent,
            profileTodo: wrestler.profileTodo,
            listStatuses: schools.map((s) => s.status),
            questionnairesWaiting: schools.filter((s) => s.hasQuestionnaire && s.status === "interested").length,
            scheduleCount: events.length,
          })
        : [],
    [wrestler, schools, events],
  )

  if (!blue) {
    return (
      <div className={`${PANEL} mt-5 p-5 sm:p-6`}>
        <p className="flex items-center gap-2 text-base font-bold">
          <Lock className="h-4 w-4 text-[#D3B574]" aria-hidden /> The plan is part of NC United Blue
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
          Blue members get this month&apos;s steps for each wrestler, a college list that tracks every school from
          interested to offer, coach emails drafted from verified results, the coaching staff and recruiting
          questionnaire for every program, and a schedule that tells coaches where to watch.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/blue" className="rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
            Learn about Blue
          </a>
          <a href="/recruiting/college-map" className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/5">
            See the college map
          </a>
        </div>
      </div>
    )
  }
  if (!wrestler) return null

  const setStatus = async (school: WarRoomSchool, status: CollegeListStatus) => {
    const before = schools
    setError(null)
    setSchools((current) => current.map((s) => (s.id === school.id ? { ...s, status } : s)))
    const res = await fetch("/api/college-list", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId: school.id, status }),
    })
    if (!res.ok) {
      setSchools(before)
      setError("Could not save that change. Try again.")
    }
  }

  const addEvent = async () => {
    setError(null)
    const title = draft.title.trim()
    if (!title || !draft.startDate) {
      setError("Give the event a name and the date it starts.")
      return
    }
    const res = await fetch("/api/college-list/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteId: wrestler.id,
        title,
        startDate: draft.startDate,
        endDate: draft.endDate || null,
        location: draft.location.trim() || null,
      }),
    })
    const body = (await res.json().catch(() => ({}))) as { event?: SavedEvent; error?: string }
    if (!res.ok || !body.event) {
      setError(body.error || "Could not save the event. Try again.")
      return
    }
    const added = body.event
    setEventsBy((current) => ({
      ...current,
      [wrestler.id]: [...(current[wrestler.id] ?? []).filter((e) => e.id !== added.id), added].sort((a, b) =>
        a.startDate.localeCompare(b.startDate),
      ),
    }))
    setDraft({ title: "", startDate: "", endDate: "", location: "" })
  }

  const removeEvent = async (event: SavedEvent) => {
    setEventsBy((current) => ({ ...current, [wrestler.id]: (current[wrestler.id] ?? []).filter((e) => e.id !== event.id) }))
    const res = await fetch(
      `/api/college-list/schedule?athlete=${encodeURIComponent(wrestler.id)}&event=${encodeURIComponent(event.id)}`,
      { method: "DELETE" },
    )
    if (!res.ok) setError("Could not remove the event. Try again.")
  }

  /** "Email a coach" from the steps: the first school not yet written to, or the list if it is empty. */
  const act = (step: PlanStep) => {
    if (step.action?.kind === "schedule") scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    if (step.action?.kind === "email") {
      const next = schools.find((s) => COLLEGE_LIST_STATUSES.indexOf(s.status) < COLLEGE_LIST_STATUSES.indexOf("contacted")) ?? schools[0]
      if (next) setEmailSchool(next)
      else listRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const counts = COLLEGE_LIST_STATUSES.map((status) => ({ status, n: schools.filter((s) => s.status === status).length }))

  return (
    <div className="mt-5 space-y-4">
      {wrestlers.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Wrestler">
          {wrestlers.map((w) => (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={w.id === wrestler.id}
              onClick={() => setWrestlerId(w.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-bold ${
                w.id === wrestler.id ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/70 hover:text-white"
              }`}
            >
              {w.firstName}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="rounded-lg bg-red-500/15 px-4 py-2 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${PANEL} p-5`}>
          <p className={TITLE}>
            <ListChecks className="h-4 w-4 text-[#D3B574]" aria-hidden /> This month for {wrestler.firstName}
            {wrestler.grade ? ` · ${wrestler.grade}` : ""}
          </p>
          <ol className="mt-3 space-y-3">
            {steps.map((step) => {
              const label = (
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold ${step.done ? "text-white/55" : "text-white"}`}>{step.title}</span>
                  <span className="mt-0.5 block text-sm leading-5 text-white/55">{step.detail}</span>
                </span>
              )
              const mark = step.done ? (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-label="Done" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#D3B574]" aria-label="To do" />
              )
              const go = step.action ? <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30" aria-hidden /> : null
              const row = "flex w-full items-start gap-3 rounded-lg p-2 text-left"
              return (
                <li key={step.key}>
                  {step.action?.kind === "link" ? (
                    <a href={step.action.href} className={`${row} hover:bg-white/[0.05]`}>
                      {mark}
                      {label}
                      {go}
                    </a>
                  ) : step.action ? (
                    <button type="button" onClick={() => act(step)} className={`${row} hover:bg-white/[0.05]`}>
                      {mark}
                      {label}
                      {go}
                    </button>
                  ) : (
                    <div className={row}>
                      {mark}
                      {label}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <div ref={scheduleRef} className={`${PANEL} p-5`}>
          <p className={TITLE}>
            <CalendarDays className="h-4 w-4 text-[#D3B574]" aria-hidden /> Where {wrestler.firstName} is wrestling next
          </p>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-white/55">Nothing yet. Add the tournaments, duals and camps coming up.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-white">{e.title}</span>
                    <span className="text-white/55">
                      {" "}
                      · {eventDates(e.startDate, e.endDate)}
                      {e.location ? ` · ${e.location}` : ""}
                    </span>
                  </span>
                  <button type="button" onClick={() => removeEvent(e)} aria-label={`Remove ${e.title}`} className="shrink-0 text-white/40 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Event name" aria-label="Event name" className={FIELD} />
            <input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="City (optional)" aria-label="Event location" className={FIELD} />
            <label className="text-xs text-white/50">
              Starts
              <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} aria-label="Start date" className={`${FIELD} mt-0.5 [color-scheme:dark]`} />
            </label>
            <label className="text-xs text-white/50">
              Ends (if more than one day)
              <input type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} aria-label="End date" className={`${FIELD} mt-0.5 [color-scheme:dark]`} />
            </label>
          </div>
          <button type="button" onClick={addEvent} className="mt-3 rounded-lg border border-[#D3B574] px-4 py-2 text-sm font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
            Add to the schedule
          </button>
          <p className="mt-2 text-xs text-white/40">It goes in every coach email and on the profile, where approved college coaches can see it. It is never public.</p>
        </div>
      </div>

      <div ref={listRef} className={`${PANEL} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={TITLE}>
            <MapPin className="h-4 w-4 text-[#D3B574]" aria-hidden /> My college list · {schools.length} {schools.length === 1 ? "school" : "schools"}
          </p>
          <a href="/recruiting/college-map" className="inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:underline">
            Add schools on the map <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>

        {schools.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-white/55">
            No schools saved yet. Open the college map, tap a program and choose <span className="font-semibold text-white">Save to My List</span>.
            Go wide to begin with: every level, more than one state.
          </p>
        ) : (
          <>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {counts.map(({ status, n }) => (
                <li key={status} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${n > 0 ? "bg-[#D3B574]/15 text-[#e9d5a4]" : "bg-white/[0.04] text-white/35"}`}>
                  {COLLEGE_LIST_STATUS_LABEL[status]} · {n}
                </li>
              ))}
            </ul>
            <ul className="mt-3 divide-y divide-white/10">
              {schools.map((school) => (
                <li key={school.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  {school.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={school.logo} alt="" className="hidden h-9 w-9 shrink-0 rounded bg-white object-contain p-0.5 sm:block" />
                  ) : (
                    <span className="hidden h-9 w-9 shrink-0 rounded bg-white/[0.06] sm:block" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <a href={`/recruiting/schools/${school.id}`} className="block truncate text-sm font-bold text-white hover:underline">
                      {school.name}
                    </a>
                    <span className="block text-xs text-white/50">
                      {school.level} · {school.place}
                      {school.hasQuestionnaire && school.status === "interested" ? " · questionnaire to fill out" : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <select
                      value={school.status}
                      onChange={(e) => setStatus(school, e.target.value as CollegeListStatus)}
                      aria-label={`Where things stand with ${school.name}`}
                      className="h-9 rounded-lg border border-white/15 bg-[#0A1628] px-2 text-sm text-white"
                    >
                      {COLLEGE_LIST_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {COLLEGE_LIST_STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setEmailSchool(school)}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#CC0000] px-3 text-sm font-bold text-white hover:bg-[#a80000]"
                    >
                      <Mail className="h-4 w-4" aria-hidden /> Email
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {emailSchool ? (
        <CoachEmailComposer
          schoolId={emailSchool.id}
          schoolName={emailSchool.name}
          initialAthleteId={wrestler.id}
          open
          onOpenChange={(open) => {
            if (open) return
            setEmailSchool(null)
            // Events added inside the email screen belong on the schedule card too.
            fetch(`/api/college-list/schedule?athlete=${encodeURIComponent(wrestler.id)}`, { cache: "no-store" })
              .then((res) => (res.ok ? res.json() : null))
              .then((body: { events?: SavedEvent[] } | null) => {
                if (body?.events) setEventsBy((current) => ({ ...current, [wrestler.id]: body.events ?? [] }))
              })
              .catch(() => {})
          }}
          onSent={(status) => {
            // Sending moves the school along the list; it never moves it backwards.
            if (status && COLLEGE_LIST_STATUSES.indexOf(status) > COLLEGE_LIST_STATUSES.indexOf(emailSchool.status)) {
              void setStatus(emailSchool, status)
            }
          }}
        />
      ) : null}
    </div>
  )
}
