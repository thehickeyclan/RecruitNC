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
}: {
  athleteId?: string
  familyOnly?: boolean
  limit?: number
  empty?: React.ReactNode
  /** Rendered above the list only when there is at least one conversation. */
  header?: React.ReactNode
}) {
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      {rows.map((t) => {
        const who = t.viewerRole === "coach" ? t.athleteName || "Wrestler" : t.coachName
        const sub = t.viewerRole === "coach" ? null : [t.program, t.viewerRole === "parent" ? `about ${t.athleteName}` : null].filter(Boolean).join(" · ")
        const lastBy =
          t.lastSenderRole === "coach"
            ? t.viewerRole === "coach" ? "You: " : ""
            : t.viewerRole === "coach" ? "" : t.lastSenderRole === t.viewerRole ? "You: " : ""
        return (
          <li key={t.id}>
            <Link href={`/inbox/${t.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.05]">
              <span
                className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", t.unread ? "bg-[#D3B574]" : "bg-transparent")}
                aria-label={t.unread ? "Unread" : undefined}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={cn("truncate text-[15px]", t.unread ? "font-bold text-white" : "font-semibold text-white/85")}>{who}</span>
                  <span className="ml-auto shrink-0 text-xs text-white/45">{day(t.lastMessageAt)}</span>
                </span>
                {sub ? <span className="block truncate text-xs text-[#D3B574]/90">{sub}</span> : null}
                <span className="mt-0.5 block truncate text-sm text-white/55">
                  {t.stopped ? "Messages stopped · " : ""}
                  {lastBy}
                  {t.lastMessagePreview}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
    </>
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
