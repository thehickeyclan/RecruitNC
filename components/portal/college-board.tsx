"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AdmissionsControls } from "@/components/portal/admissions-controls"
import { activitiesFor, daysInStage, isStale, nextStep, recentView, type Activity, type ActivityAction, type Inbound } from "@/lib/college-programs/board-activities"
import { easternToday, type AdmissionsSummary } from "@/lib/college-programs/admissions-format"
import type { Admissions } from "@/lib/college-programs/list"
import { ArrowRight, BadgeCheck, Check, Circle, Eye, ExternalLink, GripVertical, MessageSquare, MoreHorizontal, PhoneCall, Sparkles, X } from "lucide-react"

import { BOARD_STAGES, COLLEGE_LIST_STATUS_LABEL, boardStage, type BoardStage, type CollegeListStatus } from "@/lib/college-programs/list"
import { BrandName } from "@/components/recruiting/brand-name"

/**
 * The college list as a board (Command Center Phase 1, 14 Oct 2026; rebuilt 22 Oct as stages with
 * activities inside each): a column per stage, a small card per college with its progress and the
 * one next step, and everything else in a side panel behind the card's menu. The interest form is
 * an activity, not a stage.
 *
 * No drag library: pointer events, so it works the same with a mouse and a finger. On a phone a
 * card is dragged by its grip, so a swipe anywhere else still scrolls the board; every card also
 * has a "Move to" menu, which is how a keyboard or screen reader moves it. The page saves the
 * move (onMove) and puts it back if the save fails.
 */
export type BoardCollege = {
  id: string
  name: string
  level: string
  place: string
  status: CollegeListStatus
  logo: string | null
  cost: string | null
  note: string | null
  /** The family's own note: calls, what the coach said, next steps. */
  memo: string | null
  /** The college's coaches are on RecruitNC: they can see the profile and write in the app. */
  onRecruitNC: boolean
  /** The interest form is done (its own check, any stage). */
  questionnaireDone?: boolean
  /** The admissions track, shown under the stage. */
  admissions?: Admissions
  /** The college's own deadlines for this cycle. */
  admissionInfo?: AdmissionsSummary | null
  /** Told this program's coaches the wrestler is interested; null when it cannot be offered. */
  interest?: boolean | null
  /** We hold a link to its recruiting questionnaire. */
  hasQuestionnaire?: boolean
  /** When it entered its stage (days in stage; a stale deal). */
  stageSince?: string | null
  /** What came in from the college: profile views, a coach's message, a logged contact. */
  inbound?: Inbound
  /** When the interest form was marked done. */
  questionnaireDoneAt?: string | null
}

const STAGE_HINT: Record<BoardStage, string> = {
  interested: "Saved, nothing sent yet",
  contacted: "You have emailed the coach",
  talking: "The coach is writing back",
  visited: "You have been on campus",
  offer: "An offer in hand",
}
const MILESTONE: Partial<Record<BoardStage, string>> = {
  talking: "A coach is talking to you.",
  visited: "A visit done.",
  offer: "An offer. Get it in writing.",
}

type Drag = { id: string; x: number; y: number; dx: number; dy: number; width: number; over: BoardStage | null }

export function CollegeBoard({
  colleges,
  onMove,
  onEmail,
  onMemo,
  onInterest,
  interestName,
  onQuestionnaire,
}: {
  colleges: BoardCollege[]
  onInterest?: (id: string) => void
  onQuestionnaire?: (id: string, done: boolean) => void
  interestName?: string
  onMove: (id: string, status: CollegeListStatus) => void
  onEmail: (id: string) => void
  onMemo: (id: string, memo: string) => void
}) {
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [celebrate, setCelebrate] = useState<{ id: string; text: string } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const today = easternToday()
  const start = useRef<{ id: string; x: number; y: number; rect: DOMRect; active: boolean } | null>(null)

  const columnAt = (x: number, y: number): BoardStage | null => {
    const el = document.elementFromPoint(x, y)?.closest("[data-stage]") as HTMLElement | null
    return (el?.dataset.stage as BoardStage | undefined) ?? null
  }

  const move = useCallback(
    (id: string, status: BoardStage) => {
      const college = colleges.find((c) => c.id === id)
      if (!college || boardStage(college.status) === status) return
      onMove(id, status)
      const forward = BOARD_STAGES.indexOf(status) > BOARD_STAGES.indexOf(boardStage(college.status))
      const text = forward ? MILESTONE[status] : undefined
      if (text) {
        setCelebrate({ id, text })
        window.setTimeout(() => setCelebrate((c) => (c?.id === id ? null : c)), 2400)
      }
    },
    [colleges, onMove],
  )

  // The latest move function, for listeners attached once per drag.
  const moveRef = useRef(move)
  useEffect(() => {
    moveRef.current = move
  }, [move])

  const begin = (id: string) => (e: React.PointerEvent<HTMLElement>) => {
    // A mouse drags the whole card; a finger drags by the grip, so the board still scrolls.
    const fromGrip = (e.target as HTMLElement).closest("[data-grip]")
    if (e.pointerType !== "mouse" && !fromGrip) return
    if ((e.target as HTMLElement).closest("button, a, select, input, textarea")) return
    const card = (e.currentTarget as HTMLElement).getBoundingClientRect()
    start.current = { id, x: e.clientX, y: e.clientY, rect: card, active: false }
    // Listeners live for this one drag, attached here so the first move is never missed.
    const onPointerMove = (ev: PointerEvent) => {
      const st = start.current
      if (!st) return
      if (!st.active && Math.hypot(ev.clientX - st.x, ev.clientY - st.y) < 6) return
      st.active = true
      ev.preventDefault()
      setDrag({ id: st.id, x: ev.clientX, y: ev.clientY, dx: st.x - st.rect.left, dy: st.y - st.rect.top, width: st.rect.width, over: columnAt(ev.clientX, ev.clientY) })
    }
    const onPointerUp = (ev: PointerEvent) => {
      const st = start.current
      start.current = null
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      if (st?.active && ev.type === "pointerup") {
        const target = columnAt(ev.clientX, ev.clientY)
        if (target) moveRef.current(st.id, target)
      }
      setDrag(null)
    }
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
  }

  const dragged = drag ? colleges.find((c) => c.id === drag.id) : null
  const opened = open ? colleges.find((c) => c.id === open) ?? null : null

  /** Carry out an activity's action from the card or the panel. */
  const act = (c: BoardCollege, a: ActivityAction) => {
    if (a.kind === "reply") window.location.href = `/inbox/${a.threadId}`
    else if (a.kind === "forms") window.location.href = "/my-recruiting/questionnaires"
    else if (a.kind === "email") onEmail(c.id)
    else if (a.kind === "interest") onInterest?.(c.id)
    else if (a.kind === "apply") window.open(a.href, "_blank", "noopener,noreferrer")
    else if (a.kind === "stage") move(c.id, a.to)
    else if (a.kind === "scout") window.location.href = "/my-recruiting/scout"
  }

  // The pipeline at a glance: colleges per stage, the stale ones, and the moves that matter today.
  const perStage = BOARD_STAGES.map((st) => ({ st, n: colleges.filter((c) => boardStage(c.status) === st).length }))
  const maxStage = Math.max(1, ...perStage.map((p) => p.n))
  const staleCount = colleges.filter((c) => isStale(c, today)).length
  const leads = colleges.filter((c) => c.inbound?.message?.yourTurn || recentView(c, today)).length
  const moves = colleges
    .map((c) => ({ c, step: nextStep(c, today) }))
    .filter((m): m is { c: BoardCollege; step: NonNullable<ReturnType<typeof nextStep>> } => Boolean(m.step) && m.step!.rank < 4)
    .sort((a, b) => a.step.rank - b.step.rank)
    .slice(0, 5)

  return (
    <div className="relative">
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/45">Pipeline</p>
            <p className="text-[11px] text-white/45">
              {leads ? <span className="font-bold text-sky-300">{leads} new lead{leads === 1 ? "" : "s"}</span> : null}
              {leads && staleCount ? " · " : null}
              {staleCount ? <span className="font-bold text-amber-200">{staleCount} stale</span> : null}
            </p>
          </div>
          <div className="mt-2 flex items-end gap-1">
            {perStage.map(({ st, n }, i) => (
              <div key={st} className="min-w-0 flex-1 text-center">
                <div
                  className="mx-auto rounded-md bg-[#D3B574]"
                  style={{ height: `${n ? 8 + Math.round((n / maxStage) * 40) : 4}px`, width: `${100 - i * 12}%`, opacity: n ? 1 - i * 0.1 : 0.2 }}
                  aria-hidden
                />
                <p className="mt-1 text-lg font-black leading-none">{n}</p>
                <p className="truncate text-[10px] font-semibold text-white/50">{COLLEGE_LIST_STATUS_LABEL[st]}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/45">Today&apos;s moves</p>
          {moves.length ? (
            <ul className="mt-1.5 divide-y divide-white/5">
              {moves.map(({ c, step }) => (
                <li key={c.id} className="flex items-center gap-2 py-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${step.tone === "urgent" ? "bg-rose-400" : step.rank <= 2 ? "bg-sky-400" : "bg-amber-300"}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    {step.why ? <span className="block text-[11px] text-white/45">{step.why}</span> : null}
                  </span>
                  <button type="button" onClick={() => act(c, step.action)} className="shrink-0 rounded-md bg-[#D3B574] px-2 py-1 text-[11px] font-black text-[#0A1628]">
                    {step.label.length > 24 ? ACTION_LABEL[step.action.kind] : step.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-white/55">Nothing urgent. Each card shows its next step.</p>
          )}
        </div>
      </div>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {BOARD_STAGES.map((stage) => {
          const cards = colleges.filter((c) => boardStage(c.status) === stage)
          const over = drag?.over === stage
          return (
            <section
              key={stage}
              data-stage={stage}
              aria-label={COLLEGE_LIST_STATUS_LABEL[stage]}
              className={`flex w-64 shrink-0 snap-start flex-col rounded-xl border p-2.5 transition-colors ${over ? "border-[#D3B574] bg-[#D3B574]/10" : "border-white/10 bg-white/[0.02]"}`}
            >
              <header className="flex items-baseline justify-between px-1">
                <h3 className="text-sm font-black text-white">{COLLEGE_LIST_STATUS_LABEL[stage]}</h3>
                <span className="text-xs font-bold text-white/45">{cards.length}</span>
              </header>
              <p className="px-1 text-[11px] text-white/40">{STAGE_HINT[stage]}</p>
              <ul className="mt-2 flex min-h-16 flex-1 flex-col gap-2">
                {cards.map((c) => {
                  const acts = activitiesFor(c, today)
                  // Apply shows once there is something to say: a deadline we hold, or an application in.
                  const chips = acts.filter((a) => a.key === "form" || a.key === "email" || (a.key === "apply" && (a.done || a.detail)))
                  const step = nextStep(c, today)
                  return (
                    <li
                      key={c.id}
                      onPointerDown={begin(c.id)}
                      className={`group relative select-none rounded-lg border bg-[#0f1c2e] p-3 shadow-sm transition ${drag?.id === c.id ? "opacity-30" : "border-white/10 hover:border-[#D3B574]/50 hover:shadow-lg"} ${celebrate?.id === c.id ? "border-[#D3B574] ring-2 ring-[#D3B574]/60" : ""} cursor-grab active:cursor-grabbing`}
                    >
                      <div className="flex items-start gap-2">
                        {c.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.logo} alt="" className="h-8 w-8 shrink-0 rounded bg-white object-contain p-0.5" draggable={false} />
                        ) : (
                          <span className="h-8 w-8 shrink-0 rounded bg-white/[0.06]" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1">
                          <a href={`/recruiting/schools/${c.id}`} className="line-clamp-2 text-sm font-bold leading-5 text-white hover:underline" draggable={false}>
                            {c.name}
                          </a>
                          <span className="flex items-center gap-1 text-[11px] text-white/50">
                            {c.level} · {c.place}
                            {c.onRecruitNC ? (
                              <span title="Coaches on the platform" className="inline-flex text-[#D3B574]">
                                <BadgeCheck className="h-3.5 w-3.5" aria-label="Coaches on the platform" />
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <button type="button" onClick={() => setOpen(c.id)} aria-label={`Details for ${c.name}`} className="-mr-1 rounded p-1 text-white/40 hover:bg-white/10 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <span data-grip className="-mr-1 touch-none rounded p-1 text-white/25 hover:text-white/60" aria-hidden>
                          <GripVertical className="h-4 w-4" />
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {chips.map((a) => (
                          <Chip key={a.key} a={a} />
                        ))}
                      </div>
                      <Signals c={c} today={today} />
                      {c.note ? <p className="mt-1.5 text-[11px] font-semibold text-amber-200">{c.note}</p> : null}
                      {celebrate?.id === c.id ? (
                        <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[#D3B574]">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden /> {celebrate.text}
                        </p>
                      ) : null}
                      {step ? (
                        <button
                          type="button"
                          onClick={() => act(c, step.action)}
                          className={`mt-2 flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-black ${step.tone === "urgent" ? "bg-rose-400 text-[#0A1628]" : "bg-[#D3B574] text-[#0A1628] hover:bg-[#e2c98d]"}`}
                        >
                          <span className="min-w-0 truncate">{step.label}</span>
                          {step.action.kind === "apply" ? <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                        </button>
                      ) : null}
                    </li>
                  )
                })}
                {cards.length === 0 ? (
                  <li className={`flex flex-1 items-center justify-center rounded-lg border border-dashed p-3 text-center text-[11px] ${over ? "border-[#D3B574] text-[#D3B574]" : "border-white/10 text-white/30"}`}>
                    Drag a college here
                  </li>
                ) : null}
              </ul>
            </section>
          )
        })}
      </div>

      {drag && dragged ? (
        <div
          className="pointer-events-none fixed z-50 rotate-2 rounded-lg border border-[#D3B574] bg-[#0f1c2e] p-3 shadow-2xl shadow-black/60"
          style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.width }}
        >
          <p className="text-sm font-bold text-white">{dragged.name}</p>
          <p className="text-[11px] text-white/55">{drag.over ? `Drop in: ${COLLEGE_LIST_STATUS_LABEL[drag.over]}` : `${dragged.level} · ${dragged.place}`}</p>
        </div>
      ) : null}

      {opened ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setOpen(null)}>
          <aside
            role="dialog"
            aria-label={opened.name}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#0B1D3A] p-5 text-white shadow-2xl"
          >
            <div className="flex items-start gap-3">
              {opened.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opened.logo} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-1" />
              ) : null}
              <div className="min-w-0 flex-1">
                <a href={`/recruiting/schools/${opened.id}`} className="text-lg font-black leading-6 hover:underline">
                  {opened.name}
                </a>
                <p className="text-xs text-white/55">
                  {opened.level} · {opened.place}
                  {opened.onRecruitNC ? (
                    <span className="ml-1 text-[#D3B574]">
                      · Coaches on <BrandName />
                    </span>
                  ) : null}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Stage</p>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {BOARD_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => move(opened.id, s)}
                  aria-pressed={boardStage(opened.status) === s}
                  className={`rounded-md px-1 py-1.5 text-[11px] font-bold ${boardStage(opened.status) === s ? "bg-[#D3B574] text-[#0A1628]" : "border border-white/15 text-white/70 hover:text-white"}`}
                >
                  {COLLEGE_LIST_STATUS_LABEL[s]}
                </button>
              ))}
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Activities</p>
            <ul className="mt-2 divide-y divide-white/5">
              {activitiesFor(opened, today).map((a) => (
                <li key={a.key} className="flex items-center gap-3 py-2">
                  {a.key === "form" && onQuestionnaire ? (
                    <input
                      type="checkbox"
                      checked={a.done}
                      onChange={(e) => onQuestionnaire(opened.id, e.target.checked)}
                      aria-label="Interest form done"
                      className="h-4 w-4 shrink-0 accent-[#D3B574]"
                    />
                  ) : a.done ? (
                    <Check className="h-4 w-4 shrink-0 rounded-full bg-emerald-500 p-0.5 text-[#0A1628]" aria-label="Done" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-white/30" aria-label="Not yet" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${a.done ? "text-white/60" : ""}`}>
                      {a.key === "interest" && a.done ? `Coaches know ${interestName ?? "you"} ${interestName ? "is" : "are"} interested` : a.label}
                    </span>
                    {a.detail ? <span className={`block text-xs ${a.tone === "urgent" ? "text-rose-300" : a.tone === "soon" ? "text-amber-200" : "text-white/50"}`}>{a.detail}</span> : null}
                  </span>
                  {a.action && !(a.key === "interest" && a.done) ? (
                    <button type="button" onClick={() => act(opened, a.action!)} className="shrink-0 rounded-md border border-white/20 px-2 py-1 text-xs font-bold hover:border-[#D3B574]">
                      {ACTION_LABEL[a.action.kind]}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Timeline</p>
            <Timeline c={opened} />

            {opened.admissions ? (
              <>
                <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Application</p>
                <AdmissionsControls schoolId={opened.id} value={opened.admissions} info={opened.admissionInfo} readOnly={false} />
              </>
            ) : null}

            {opened.cost ? (
              <>
                <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Cost</p>
                <p className="mt-1 text-xs leading-5 text-white/65">{opened.cost}</p>
              </>
            ) : null}

            <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Notes</p>
            {editing?.id === opened.id ? (
              <div className="mt-2">
                <textarea
                  value={editing.text}
                  onChange={(e) => setEditing({ id: opened.id, text: e.target.value })}
                  rows={4}
                  maxLength={2000}
                  placeholder="Calls, what the coach said, next steps…"
                  aria-label={`Note on ${opened.name}`}
                  className="w-full rounded-md border border-white/15 bg-[#0A1628] p-2 text-sm text-white placeholder:text-white/35"
                />
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={() => { onMemo(opened.id, editing.text); setEditing(null) }} className="rounded-md bg-[#D3B574] px-3 py-1.5 text-xs font-bold text-[#0A1628]">
                    Save note
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="text-xs font-semibold text-white/55 hover:text-white">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setEditing({ id: opened.id, text: opened.memo ?? "" })} className="mt-2 block w-full rounded-md border border-white/10 bg-[#0A1628]/60 p-2 text-left text-sm leading-5 text-white/75 hover:border-white/30">
                {opened.memo || <span className="text-white/40">+ Add a note</span>}
              </button>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  )
}

const ACTION_LABEL: Record<ActivityAction["kind"], string> = {
  reply: "Reply",
  forms: "Fill it",
  email: "Email",
  interest: "Tell them",
  apply: "Apply",
  stage: "Mark done",
  scout: "Ask Scout",
}

/** A small progress mark: done in green, to do in grey, a near deadline in amber or rose. */
function Chip({ a }: { a: Activity }) {
  const short = a.key === "form" ? "Interest form" : a.key === "email" ? "Emailed coach" : a.done ? "Applied" : a.detail ? a.detail.replace(/ closes /, " ").replace(/^Early Decision/, "ED").replace(/^Early Action/, "EA").replace(/^Regular Decision/, "RD").replace(/^Restrictive Early Action/, "REA") : "Apply"
  const tone = a.done
    ? "border-emerald-400/40 text-emerald-300"
    : a.tone === "urgent"
      ? "border-rose-400/50 text-rose-300"
      : a.tone === "soon"
        ? "border-amber-300/50 text-amber-200"
        : "border-white/15 text-white/50"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>
      {a.done ? <Check className="h-3 w-3" aria-hidden /> : <Circle className="h-2.5 w-2.5" aria-hidden />}
      {short}
    </span>
  )
}

const dayShort = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })

/** Days in stage, and what came in from the college: the CRM's inbound side. */
function Signals({ c, today }: { c: BoardCollege; today: string }) {
  const days = daysInStage(c, today)
  const stale = isStale(c, today)
  const v = c.inbound?.views
  const m = c.inbound?.message
  const k = c.inbound?.contact
  if (days == null && !v && !m && !k) return null
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold">
      {days != null && boardStage(c.status) !== "offer" ? (
        <span className={stale ? "text-amber-200" : "text-white/40"} title="Days in this stage">
          {days === 0 ? "New today" : `${days} day${days === 1 ? "" : "s"} here`}
          {stale ? " · stale" : ""}
        </span>
      ) : null}
      {v ? (
        <span className={`inline-flex items-center gap-0.5 ${recentView(c, today) ? "text-sky-300" : "text-white/45"}`} title={`Profile viewed ${v.count} time${v.count === 1 ? "" : "s"}, last ${dayShort(v.last)}`}>
          <Eye className="h-3 w-3" aria-hidden /> {v.count}
        </span>
      ) : null}
      {m ? (
        <a href={`/inbox/${m.threadId}`} className={`inline-flex items-center gap-0.5 hover:underline ${m.yourTurn ? "text-sky-300" : "text-white/45"}`} draggable={false}>
          <MessageSquare className="h-3 w-3" aria-hidden /> {m.yourTurn ? "Your turn" : "Messages"}
        </a>
      ) : null}
      {k ? (
        <span className="inline-flex items-center gap-0.5 text-white/45" title="Latest contact from the coach">
          <PhoneCall className="h-3 w-3" aria-hidden /> {k.label} {k.date}
        </span>
      ) : null}
    </div>
  )
}

/** Inbound and outbound on one line each, newest first, from what we hold. */
function Timeline({ c }: { c: BoardCollege }) {
  const events: Array<{ at: string; text: string; inbound: boolean }> = []
  if (c.stageSince) events.push({ at: c.stageSince, text: `Moved to ${COLLEGE_LIST_STATUS_LABEL[boardStage(c.status)]}`, inbound: false })
  if (c.questionnaireDoneAt) events.push({ at: c.questionnaireDoneAt, text: "Interest form submitted", inbound: false })
  if (c.admissions?.submittedOn) events.push({ at: `${c.admissions.submittedOn}T12:00:00Z`, text: "Application submitted", inbound: false })
  if (c.inbound?.views) events.push({ at: c.inbound.views.last, text: `Coaches viewed the profile (${c.inbound.views.count} view${c.inbound.views.count === 1 ? "" : "s"})`, inbound: true })
  if (c.inbound?.message) events.push({ at: "", text: c.inbound.message.yourTurn ? "The coach wrote: your turn to reply" : "In a conversation with the coach", inbound: true })
  if (c.inbound?.contact) events.push({ at: "", text: `${c.inbound.contact.label} from the coach, ${c.inbound.contact.date}`, inbound: true })
  events.sort((a, b) => (b.at || "9").localeCompare(a.at || "9"))
  if (!events.length) return <p className="mt-2 text-sm text-white/45">Nothing yet.</p>
  return (
    <ol className="mt-2 space-y-1.5">
      {events.map((e, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.inbound ? "bg-sky-400" : "bg-emerald-400"}`} aria-hidden />
          <span className="min-w-0 flex-1 text-white/80">{e.text}</span>
          {e.at ? <span className="shrink-0 text-xs text-white/40">{dayShort(e.at)}</span> : null}
        </li>
      ))}
      <li className="pt-1 text-[11px] text-white/35">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" aria-hidden /> from the college · <span className="mx-1 inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden /> your moves
      </li>
    </ol>
  )
}
