"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { activitiesFor, isStale, nextStep, recentView, type ActivityAction } from "@/lib/college-programs/board-activities"
import { easternToday } from "@/lib/college-programs/admissions-format"
import { ArrowRight, BadgeCheck, ExternalLink, GripVertical, MoreHorizontal, Sparkles } from "lucide-react"

import { BOARD_STAGES, COLLEGE_LIST_STATUS_LABEL, boardStage, type BoardStage, type CollegeListStatus } from "@/lib/college-programs/list"
import { ACTION_LABEL, Chip, CollegePanel, Signals, type PipelineCollege as BoardCollege } from "@/components/portal/college-pipeline"

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
export type { PipelineCollege as BoardCollege } from "@/components/portal/college-pipeline"

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
        <CollegePanel
          c={opened}
          today={today}
          interestName={interestName}
          onClose={() => setOpen(null)}
          onStage={(st) => move(opened.id, st)}
          onAct={(a) => act(opened, a)}
          onQuestionnaire={onQuestionnaire ? (done) => onQuestionnaire(opened.id, done) : undefined}
          onMemo={(memo) => onMemo(opened.id, memo)}
        />
      ) : null}
    </div>
  )
}

