"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GripVertical, Mail, Sparkles } from "lucide-react"

import { COLLEGE_LIST_STATUSES, COLLEGE_LIST_STATUS_LABEL, type CollegeListStatus } from "@/lib/college-programs/list"

/**
 * The college list as a board (Command Center Phase 1, 14 Oct 2026): a column per stage of
 * recruiting, a card per college, dragged from one stage to the next as it happens.
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
}

const STAGE_HINT: Record<CollegeListStatus, string> = {
  interested: "Saved from the map",
  questionnaire: "In their database",
  contacted: "You wrote to the coach",
  talking: "The coach wrote back",
  visited: "You have been on campus",
  offer: "An offer in hand",
}
const MILESTONE: Partial<Record<CollegeListStatus, string>> = {
  talking: "A coach is talking to you.",
  visited: "A visit done.",
  offer: "An offer. Get it in writing.",
}

type Drag = { id: string; x: number; y: number; dx: number; dy: number; width: number; over: CollegeListStatus | null }

export function CollegeBoard({
  colleges,
  onMove,
  onEmail,
}: {
  colleges: BoardCollege[]
  onMove: (id: string, status: CollegeListStatus) => void
  onEmail: (id: string) => void
}) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const [celebrate, setCelebrate] = useState<{ id: string; text: string } | null>(null)
  const start = useRef<{ id: string; x: number; y: number; rect: DOMRect; active: boolean } | null>(null)

  const columnAt = (x: number, y: number): CollegeListStatus | null => {
    const el = document.elementFromPoint(x, y)?.closest("[data-stage]") as HTMLElement | null
    return (el?.dataset.stage as CollegeListStatus | undefined) ?? null
  }

  const move = useCallback(
    (id: string, status: CollegeListStatus) => {
      const college = colleges.find((c) => c.id === id)
      if (!college || college.status === status) return
      onMove(id, status)
      const forward = COLLEGE_LIST_STATUSES.indexOf(status) > COLLEGE_LIST_STATUSES.indexOf(college.status)
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
    if ((e.target as HTMLElement).closest("button, a, select")) return
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

  return (
    <div className="relative">
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {COLLEGE_LIST_STATUSES.map((stage) => {
          const cards = colleges.filter((c) => c.status === stage)
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
                {cards.map((c) => (
                  <li
                    key={c.id}
                    onPointerDown={begin(c.id)}
                    className={`group relative select-none rounded-lg border bg-[#0f1c2e] p-3 shadow-sm transition ${drag?.id === c.id ? "opacity-30" : "border-white/10 hover:-translate-y-0.5 hover:border-[#D3B574]/50 hover:shadow-lg"} ${celebrate?.id === c.id ? "border-[#D3B574] ring-2 ring-[#D3B574]/60" : ""} cursor-grab active:cursor-grabbing`}
                  >
                    <div className="flex items-start gap-2">
                      {c.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logo} alt="" className="h-8 w-8 shrink-0 rounded bg-white object-contain p-0.5" draggable={false} />
                      ) : (
                        <span className="h-8 w-8 shrink-0 rounded bg-white/[0.06]" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <a href={`/recruiting/schools/${c.id}`} className="block text-sm font-bold leading-5 text-white hover:underline" draggable={false}>
                          {c.name}
                        </a>
                        <span className="block text-[11px] text-white/50">
                          {c.level} · {c.place}
                        </span>
                      </span>
                      <span data-grip className="-mr-1 touch-none rounded p-1 text-white/30 hover:text-white/70" aria-hidden>
                        <GripVertical className="h-4 w-4" />
                      </span>
                    </div>
                    {c.cost ? <p className="mt-2 text-[11px] leading-4 text-white/55">{c.cost}</p> : null}
                    {c.note ? <p className="mt-1 text-[11px] font-semibold text-amber-200">{c.note}</p> : null}
                    {celebrate?.id === c.id ? (
                      <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[#D3B574]">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden /> {celebrate.text}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => onEmail(c.id)} className="inline-flex h-7 items-center gap-1 rounded-md bg-[#CC0000] px-2 text-[11px] font-bold text-white hover:bg-[#a80000]">
                        <Mail className="h-3.5 w-3.5" aria-hidden /> Email
                      </button>
                      <select
                        value={c.status}
                        onChange={(e) => move(c.id, e.target.value as CollegeListStatus)}
                        aria-label={`Move ${c.name} to`}
                        className="h-7 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0A1628] px-1 text-[11px] text-white/80"
                      >
                        {COLLEGE_LIST_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            Move to: {COLLEGE_LIST_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
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
    </div>
  )
}
