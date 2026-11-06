"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Check, Heart, Star } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { FitBadge } from "@/components/fit-badge"
import { CoachMessageButton } from "@/components/coach-messages/coach-message-button"
import { BOARD_CHANGED_EVENT } from "@/components/coach/recruit-record"

type Peek = {
  id: string
  name: string
  photo: string | null
  classYear: number | null
  school: string | null
  state: string | null
  weight: string | null
  lastCompeted: { event: string; year: number } | null
  honors: string[]
  committed: string | null
  interested: boolean
  fit: { verdict: "meets" | "possible" | "misses"; summary: string } | null
  room: { weight: number; need: "likely" | "some" | "crowded"; label: string; fall: number } | null
  onBoard: boolean
  stage: string | null
}

/** One fetch per wrestler per page view; the board event clears it. */
const cache = new Map<string, Promise<Peek | null>>()
const fetchPeek = (id: string) => {
  let p = cache.get(id)
  if (!p) {
    p = fetch(`/api/coach-portal/peek/${encodeURIComponent(id)}`, { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<Peek>) : null))
      .catch(() => null)
    cache.set(id, p)
  }
  return p
}
if (typeof window !== "undefined") window.addEventListener(BOARD_CHANGED_EVENT, () => cache.clear())

const OPEN_MS = 350
const CLOSE_MS = 200
const WIDTH = 320

/**
 * The recruit card a coach sees when he hovers a wrestler's name on a list (Matt, 6 Nov 2026,
 * after the for-coaches page card: "we actually need that in the product"). Class, last-competed
 * weight, honors, interest in this program, the Perfect Recruit verdict, room at his weight and
 * the board stage, with Add and Message. Coaches and admins on a mouse; everyone else just gets
 * the link.
 */
export function RecruitPeek({ athleteId, children }: { athleteId: string | null | undefined; children: ReactNode }) {
  const { isVerifiedCoach, isAdmin } = useAuth()
  const [canHover, setCanHover] = useState(false)
  useEffect(() => setCanHover(window.matchMedia("(hover: hover) and (pointer: fine)").matches), [])
  const active = Boolean(athleteId) && (isVerifiedCoach || isAdmin) && canHover

  const anchor = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null)
  const [peek, setPeek] = useState<Peek | null | undefined>(undefined)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  const show = useCallback(() => {
    clear()
    timer.current = setTimeout(() => {
      const r = anchor.current?.getBoundingClientRect()
      if (!r || !athleteId) return
      const above = r.bottom + 300 > window.innerHeight && r.top > 300
      setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8)), top: above ? r.top - 6 : r.bottom + 6, above })
      setPeek(undefined)
      void fetchPeek(athleteId).then(setPeek)
    }, OPEN_MS)
  }, [athleteId])
  const hide = useCallback(() => {
    clear()
    timer.current = setTimeout(() => setPos(null), CLOSE_MS)
  }, [])

  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    window.addEventListener("scroll", close, true)
    return () => window.removeEventListener("scroll", close, true)
  }, [pos])
  useEffect(() => clear, [])

  if (!active) return <>{children}</>

  return (
    <span ref={anchor} onMouseEnter={show} onMouseLeave={hide} className="inline-flex">
      {children}
      {pos && peek !== null
        ? createPortal(
            <div
              role="dialog"
              aria-label="Recruit card"
              onMouseEnter={clear}
              onMouseLeave={hide}
              style={{ left: pos.left, top: pos.top, width: WIDTH, transform: pos.above ? "translateY(-100%)" : undefined }}
              className="fixed z-[80] rounded-xl border border-white/15 bg-[#0f1c2e] p-4 text-left text-white shadow-2xl shadow-black/50"
            >
              {peek ? <PeekBody peek={peek} /> : <p className="py-6 text-center text-xs text-white/50">Loading…</p>}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}

function PeekBody({ peek }: { peek: Peek }) {
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(peek.onBoard)
  const facts = [peek.classYear ? `Class of ${peek.classYear}` : null, peek.weight ? `${peek.weight} lbs` : null].filter(Boolean).join(" · ")
  const where = [peek.school, peek.state].filter(Boolean).join(", ")

  const add = async () => {
    setBusy(true)
    const res = await fetch("/api/coach-portal/star", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ athleteId: peek.id, action: "add" }),
    }).catch(() => null)
    setBusy(false)
    if (res?.ok) {
      setAdded(true)
      window.dispatchEvent(new Event(BOARD_CHANGED_EVENT))
    }
  }

  const roomTone = peek.room?.need === "likely" ? "text-[#A3E635]" : peek.room?.need === "some" ? "text-amber-300" : "text-white/60"

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        {peek.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={peek.photo} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white/60">
            {peek.name
              .split(/\s+/)
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-black leading-tight">{peek.name}</p>
          {facts ? <p className="text-xs font-semibold text-white/80">{facts}</p> : null}
          {where ? <p className="truncate text-xs text-white/50">{where}</p> : null}
        </div>
      </div>

      {peek.committed ? <p className="rounded-md bg-red-500/15 px-2 py-1 text-xs font-bold text-red-300">Committed to {peek.committed}</p> : null}
      {peek.interested ? (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#A3E635]/15 px-2.5 py-1 text-xs font-bold text-[#A3E635]">
          <Heart className="h-3.5 w-3.5" aria-hidden />
          Interested in you
        </p>
      ) : null}

      {peek.honors.length ? (
        <div className="flex flex-wrap gap-1.5">
          {peek.honors.map((h) => (
            <span key={h} className="rounded-md border border-[#D3B574]/40 bg-[#D3B574]/10 px-2 py-0.5 text-[11px] font-bold text-[#D3B574]">
              {h}
            </span>
          ))}
        </div>
      ) : null}

      {peek.fit || peek.room ? (
        <div className="space-y-1 border-t border-white/10 pt-2 text-xs">
          {peek.fit ? <FitBadge flag={peek.fit} /> : null}
          {peek.room ? (
            <p className="text-white/70">
              Your room at {peek.room.weight} in {peek.room.fall}: <span className={`font-bold ${roomTone}`}>{peek.room.label}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {peek.lastCompeted ? (
        <p className="text-[11px] text-white/45">
          Last competed: {peek.lastCompeted.event} {peek.lastCompeted.year}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        {added ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A3E635]">
            <Check className="h-4 w-4" aria-hidden />
            {peek.stage ? `On your board: ${peek.stage}` : "On your board"}
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void add()}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#D3B574] bg-[#D3B574]/10 px-3 text-xs font-extrabold text-[#D3B574] hover:bg-[#D3B574]/20 disabled:opacity-50"
          >
            <Star className="h-3.5 w-3.5" aria-hidden />
            Add to My Recruits
          </button>
        )}
        <CoachMessageButton athleteId={peek.id} athleteName={peek.name} />
        <Link href={`/view-profile?id=${encodeURIComponent(peek.id)}`} className="ml-auto text-xs font-semibold text-[#D3B574] hover:underline">
          Full profile →
        </Link>
      </div>
    </div>
  )
}
