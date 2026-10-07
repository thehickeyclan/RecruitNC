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
  lastMessageAt: string
  lastMessagePreview: string
  lastSenderRole: string | null
  unread: boolean
  stopped: boolean
  viewerRole: "coach" | "athlete" | "parent"
  yourTurn?: boolean
  classYear?: number | null
  weight?: string | null
  school?: string | null
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
  }, [athleteId])

  if (threads === null) return <p className="text-sm text-white/50">Loading…</p>
  const rows = (familyOnly ? threads.filter((t) => t.viewerRole !== "coach") : threads).slice(0, limit ?? Infinity)
  if (error && !rows.length) return <p className="text-sm text-red-200">{error}</p>
  if (!rows.length) return <>{empty ?? null}</>

  return (
    <>
    {header}
    <ul className={listClassName ?? "divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"}>
      {rows.map((t) => {
        const who = t.viewerRole === "coach" ? t.athleteName || "Wrestler" : t.coachName
        const sub =
          t.viewerRole === "coach"
            ? [t.classYear ? `Class of ${t.classYear}` : null, t.weight ? `${t.weight} lbs` : null, t.school].filter(Boolean).join(" · ") || null
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
                renderOpen
                  ? () => {
                      setOpenId((cur) => (cur === t.id ? null : t.id))
                      // Opening it marks it read on the server; mirror that here.
                      setThreads((all) => all?.map((x) => (x.id === t.id ? { ...x, unread: false } : x)) ?? all)
                    }
                  : undefined
              }
              expanded={openId === t.id}
            >
              <span
                className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", t.unread ? "bg-[#D3B574]" : "bg-transparent")}
                aria-label={t.unread ? "Unread" : undefined}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={cn("truncate text-[15px]", t.unread ? "font-bold text-white" : "font-semibold text-white/85")}>{who}</span>
                  {t.unread ? (
                    <span className="shrink-0 rounded-full bg-[#D3B574] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A1628]">New</span>
                  ) : t.yourTurn ? (
                    <span className="shrink-0 rounded-full border border-[#D3B574]/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D3B574]">
                      Needs your reply
                    </span>
                  ) : null}
                  <span className="ml-auto shrink-0 text-xs text-white/45">{day(t.lastMessageAt)}</span>
                </span>
                {sub ? <span className="block truncate text-xs text-[#D3B574]/90">{sub}</span> : null}
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
    <button type="button" onClick={onToggle} aria-expanded={expanded} className={cn(cls, expanded && "bg-white/[0.04]")}>
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
