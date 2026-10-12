"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export type ThreadSummary = {
  id: string
  athleteId: string
  athleteName: string
  coachName: string
  program: string | null
  programLogo?: string | null
  lastMessageAt: string
  lastMessagePreview: string
  lastSenderRole: string | null
  unread: boolean
  stopped: boolean
  viewerRole: "coach" | "athlete" | "parent"
  yourTurn?: boolean
  classYear?: number | null
  /** Last competed weight (lib/coach-messages.ts), never the listed one. */
  weight?: string | null
  school?: string | null
  state?: string | null
  /** The coach's funnel stage for this wrestler, when he is on their board. */
  stage?: string | null
}

export type InboxFilter = "all" | "unread" | "reply"

/** "Class of 2027 · 174 lbs · Lincolnton · NC": who a coach is talking to, the same on every surface. */
export function wrestlerLine(w: { classYear?: number | null; weight?: string | null; school?: string | null; state?: string | null }): string | null {
  return [w.classYear ? `Class of ${w.classYear}` : null, w.weight ? `${w.weight} lbs` : null, w.school, w.state].filter(Boolean).join(" · ") || null
}

/**
 * A program's mark beside its coach's name and messages - the logo on a white tile, as Coach Home
 * shows it, or the program's initials when there is no logo on file.
 */
export function ProgramMark({ logo, program, size = 40, className }: { logo?: string | null; program?: string | null; size?: number; className?: string }) {
  const initials =
    (program ?? "")
      .replace(/\b(the|of|at|and|university|college)\b/gi, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        <span className="text-xs font-black text-[#0A1628]">{initials}</span>
      )}
    </span>
  )
}

export function StageChip({ stage, className }: { stage?: string | null; className?: string }) {
  if (!stage) return null
  return (
    <span className={cn("shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70", className)}>
      {stage}
    </span>
  )
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })

/**
 * Conversations, newest first. A coach sees the wrestlers they wrote to; a family sees the
 * coaches who wrote to them. `athleteId` narrows to one wrestler (the profile card), and
 * `familyOnly` drops threads where this account is the coach, so a coach looking at a profile
 * does not see their own thread in the family's card.
 */
export function InboxList({
  athleteId,
  familyOnly = false,
  limit,
  empty,
  header,
  listClassName,
  renderOpen,
  initialOpenId = null,
  selectedId = null,
  onSelect,
  filter = "all",
  query = "",
  reloadKey = 0,
  onCounts,
}: {
  athleteId?: string
  familyOnly?: boolean
  limit?: number
  empty?: React.ReactNode
  /** Rendered above the list only when there is at least one conversation. */
  header?: React.ReactNode
  /** Replaces the list's own border and background, e.g. when it sits inside a card. */
  listClassName?: string
  /**
   * Open a conversation inside the list instead of navigating to /inbox/<id> - the profile card,
   * where a family reads and replies without leaving their wrestler's page.
   */
  renderOpen?: (threadId: string) => React.ReactNode
  /** Conversation to start open, e.g. from an email link (?thread=). */
  initialOpenId?: string | null
  /**
   * The two-pane inbox: a row is a button that hands its conversation to the pane beside it
   * rather than a link. (A link cannot do this - app/layout.tsx navigates every same-site <a> on
   * capture, before a React handler runs.)
   */
  selectedId?: string | null
  onSelect?: (thread: ThreadSummary) => void
  filter?: InboxFilter
  /** Narrows by wrestler, coach, school or program. */
  query?: string
  /** Bump to re-read the list, e.g. after a new conversation is started. */
  reloadKey?: number
  onCounts?: (counts: { all: number; unread: number; reply: number }) => void
}) {
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(initialOpenId)
  useEffect(() => {
    if (initialOpenId) setOpenId(initialOpenId)
  }, [initialOpenId])

  useEffect(() => {
    const q = athleteId ? `?athleteId=${encodeURIComponent(athleteId)}` : ""
    fetch(`/api/coach-messages${q}`, { credentials: "include" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error ?? "Could not load messages.")
        setThreads(data.threads ?? [])
      })
      .catch((e: unknown) => {
        setThreads([])
        setError(e instanceof Error ? e.message : "Could not load messages.")
      })
  }, [athleteId, reloadKey])

  useEffect(() => {
    if (!threads || !onCounts) return
    onCounts({ all: threads.length, unread: threads.filter((t) => t.unread).length, reply: threads.filter((t) => t.yourTurn).length })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads])

  if (threads === null) return <p className="text-sm text-white/50">Loading…</p>
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const rows = (familyOnly ? threads.filter((t) => t.viewerRole !== "coach") : threads)
    .filter((t) => (filter === "unread" ? t.unread : filter === "reply" ? t.yourTurn : true))
    .filter((t) => {
      if (!words.length) return true
      const hay = `${t.athleteName} ${t.coachName} ${t.school ?? ""} ${t.program ?? ""}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
    .slice(0, limit ?? Infinity)
  if (error && !rows.length) return <p className="text-sm text-red-200">{error}</p>
  if (!rows.length) {
    if (threads.length && (filter !== "all" || words.length)) return <p className="px-4 py-6 text-sm text-white/50">No conversations match.</p>
    return <>{empty ?? null}</>
  }

  return (
    <>
    {header}
    <ul className={listClassName ?? "divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"}>
      {rows.map((t) => {
        const who = t.viewerRole === "coach" ? t.athleteName || "Wrestler" : t.coachName
        const sub =
          t.viewerRole === "coach"
            ? wrestlerLine(t)
            : [t.program, t.viewerRole === "parent" ? `about ${t.athleteName}` : null].filter(Boolean).join(" · ")
        const lastBy =
          t.lastSenderRole === "coach"
            ? t.viewerRole === "coach" ? "You: " : ""
            : t.viewerRole === "coach" ? "" : t.lastSenderRole === t.viewerRole ? "You: " : ""
        return (
          <li key={t.id} id={`thread-${t.id}`} className="scroll-mt-28">
            <RowShell
              href={`/inbox/${t.id}`}
              onToggle={
                onSelect
                  ? () => {
                      onSelect(t)
                      setThreads((all) => all?.map((x) => (x.id === t.id ? { ...x, unread: false } : x)) ?? all)
                    }
                  : renderOpen
                  ? () => {
                      setOpenId((cur) => (cur === t.id ? null : t.id))
                      // Opening it marks it read on the server; mirror that here.
                      setThreads((all) => all?.map((x) => (x.id === t.id ? { ...x, unread: false } : x)) ?? all)
                    }
                  : undefined
              }
              expanded={onSelect ? selectedId === t.id : openId === t.id}
            >
              <span
                className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", t.unread ? "bg-[#D3B574]" : "bg-transparent")}
                aria-label={t.unread ? "Unread" : undefined}
              />
              {t.viewerRole !== "coach" ? <ProgramMark logo={t.programLogo} program={t.program} /> : null}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={cn("truncate text-[15px]", t.unread ? "font-bold text-white" : "font-semibold text-white/85")}>{who}</span>
                  <span className="ml-auto shrink-0 text-xs text-white/45">{day(t.lastMessageAt)}</span>
                </span>
                {sub ? <span className="block text-xs text-[#D3B574]/90">{sub}</span> : null}
                {t.unread || t.yourTurn || (t.viewerRole === "coach" && t.stage) ? (
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {t.unread ? (
                      <span className="shrink-0 rounded-full bg-[#D3B574] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A1628]">New</span>
                    ) : t.yourTurn ? (
                      <span className="shrink-0 rounded-full border border-[#D3B574]/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D3B574]">
                        Needs your reply
                      </span>
                    ) : null}
                    <StageChip stage={t.viewerRole === "coach" ? t.stage : null} />
                  </span>
                ) : null}
                <span className="mt-0.5 block truncate text-sm text-white/55">
                  {t.stopped ? "Messages stopped · " : ""}
                  {lastBy}
                  {t.lastMessagePreview}
                </span>
              </span>
            </RowShell>
            {renderOpen && openId === t.id ? <div className="px-4 pb-4">{renderOpen(t.id)}</div> : null}
          </li>
        )
      })}
    </ul>
    </>
  )
}

/** A row is a link to /inbox/<id>, or - on the profile card - a button that opens it in place. */
function RowShell({
  href,
  onToggle,
  expanded,
  children,
}: {
  href: string
  onToggle?: () => void
  expanded: boolean
  children: React.ReactNode
}) {
  const cls = "flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-white/[0.05]"
  if (!onToggle) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onToggle} aria-expanded={expanded} className={cn(cls, expanded && "bg-white/[0.07] shadow-[inset_2px_0_0_#D3B574]")}>
      {children}
    </button>
  )
}

/** The empty state for the full inbox. */
export function InboxEmpty({ coach }: { coach: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <MessageSquare className="mx-auto h-8 w-8 text-[#D3B574]" aria-hidden />
      <p className="mt-3 text-lg font-bold">No messages yet</p>
      <p className="mt-1 text-sm text-white/60">
        {coach
          ? "Open a wrestler's profile and tap the message button to start a conversation."
          : "When a college coach messages your wrestler, it shows up here and on the profile."}
      </p>
    </div>
  )
}
