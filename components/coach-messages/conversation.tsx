"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Flag, Loader2, Send, ShieldOff, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProgramMark, StageChip, wrestlerLine } from "@/components/coach-messages/inbox-list"
import { COACH_MESSAGES_CHANGED } from "@/hooks/use-nav-badges"

type Message = { id: string; body: string; senderRole: string; senderName: string; createdAt: string; mine: boolean }
type Thread = {
  id: string
  athleteId: string
  athleteName: string
  coachName: string
  program: string | null
  programLogo?: string | null
  stopped: boolean
  viewerRole: "coach" | "athlete" | "parent" | "admin"
  canReply: boolean
  wrestler?: { classYear: number | null; weight: string | null; school: string | null; state: string | null; stage: string | null } | null
  messages: Message[]
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

/**
 * One coach ↔ family conversation. The same screen for the coach, the wrestler, a parent and an
 * admin reviewing a report; what each can do comes from the server (`canReply`, `viewerRole`).
 */
export function Conversation({
  threadId,
  compact = false,
  pane = false,
  onSent,
}: {
  threadId: string
  compact?: boolean
  /** Fills the right-hand pane of the inbox: the messages scroll, the reply box stays put. */
  pane?: boolean
  /** Called after a message is sent, so a list beside this one can drop its "needs your reply". */
  onSent?: () => void
}) {
  const [thread, setThread] = useState<Thread | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState("")
  const endRef = useRef<HTMLLIElement>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach-messages/${threadId}`, { credentials: "include" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? "Could not load this conversation.")
      return
    }
    setThread(data.thread)
    // Loading it marked it read on the server.
    window.dispatchEvent(new Event(COACH_MESSAGES_CHANGED))
  }, [threadId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    // On the profile the conversation is one card among many; jumping the page would lose the reader.
    if (!compact) endRef.current?.scrollIntoView({ block: pane ? "nearest" : "end" })
  }, [thread?.messages.length, compact])

  const send = async () => {
    if (!draft.trim() || busy) return
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch(`/api/coach-messages/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: draft }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Could not send.")
      setDraft("")
      await load()
      onSent?.()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not send.")
    } finally {
      setBusy(false)
    }
  }

  const toggleStop = async () => {
    if (!thread) return
    const stopping = !thread.stopped
    if (stopping && !window.confirm(`Stop messages from ${thread.coachName}? They will not be able to write to ${thread.athleteName || "this wrestler"} again unless you turn this back on.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/coach-messages/${threadId}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stopped: stopping }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not update.")
      setNotice(stopping ? "This coach can no longer message you." : "This coach can message you again.")
      await load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not update.")
    } finally {
      setBusy(false)
    }
  }

  const report = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/coach-messages/${threadId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not file the report.")
      setReporting(false)
      setReason("")
      setNotice("Reported. NC United staff will review this conversation within 24 hours.")
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not file the report.")
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>
  if (!thread) return <p className="text-sm text-white/50">Loading…</p>

  const family = thread.viewerRole === "athlete" || thread.viewerRole === "parent"
  const title = thread.viewerRole === "coach" ? thread.athleteName || "Wrestler" : thread.coachName
  const subtitle =
    thread.viewerRole === "coach"
      ? wrestlerLine(thread.wrestler ?? {}) ?? "The wrestler and their linked parents see this conversation."
      : `${thread.program ? `${thread.program} · ` : ""}About ${thread.athleteName || "your wrestler"}. Everyone linked to the profile sees this conversation.`

  const coachSide = thread.viewerRole === "coach" || thread.viewerRole === "admin"
  const action = "inline-flex min-h-[36px] items-center rounded-lg border border-white/20 px-3 text-xs font-bold text-white/80 hover:border-[#D3B574] hover:text-[#D3B574]"

  return (
    <div className={cn("flex flex-col gap-4", pane && "h-full min-h-0")}>
      <div className={cn("flex flex-wrap items-start justify-between gap-3", compact && "justify-end", pane && "border-b border-white/10 pb-4")}>
        <div className={cn("flex min-w-0 items-start gap-3", compact && "hidden")}>
          {thread.viewerRole !== "coach" ? <ProgramMark logo={thread.programLogo} program={thread.program} size={52} /> : null}
          <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight">
            {thread.viewerRole === "coach" ? (
              <Link href={`/athletes/${thread.athleteId}`} className="hover:underline">
                {title}
              </Link>
            ) : (
              title
            )}
          </h1>
          <p className={cn("mt-1 text-sm", coachSide && thread.wrestler ? "font-semibold text-[#D3B574]" : "text-white/60")}>{subtitle}</p>
          {coachSide && thread.wrestler ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/50">
              <StageChip stage={thread.wrestler.stage} />
              {thread.wrestler.stage ? null : <span>Not on your board yet.</span>}
              <span>The wrestler and their linked parents see this conversation.</span>
            </p>
          ) : null}
          {thread.viewerRole === "admin" ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#D3B574]">Staff review · read-only</p>
          ) : null}
          </div>
        </div>
        {thread.viewerRole === "coach" && !compact ? (
          <div className="flex flex-wrap gap-2">
            <a href={`/athletes/${thread.athleteId}`} className={action}>Profile</a>
            <a href={`/compare?left=${thread.athleteId}&src=inbox`} className={action}>Compare</a>
          </div>
        ) : null}
        {family ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleStop}
              disabled={busy}
              className={cn("inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 font-semibold text-white/80 hover:bg-white/10", compact ? "min-h-[34px] text-xs" : "min-h-[40px] text-sm")}
            >
              {thread.stopped ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
              {thread.stopped ? "Allow this coach again" : "Stop messages from this coach"}
            </button>
            <button
              type="button"
              onClick={() => setReporting((v) => !v)}
              className={cn("inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 font-semibold text-white/80 hover:bg-white/10", compact ? "min-h-[34px] text-xs" : "min-h-[40px] text-sm")}
            >
              <Flag className="h-4 w-4" />
              Report
            </button>
          </div>
        ) : null}
      </div>

      {reporting ? (
        <div className="rounded-lg border border-white/15 bg-white/[0.04] p-4">
          <p className="text-sm font-semibold">Report this conversation</p>
          <p className="mt-1 text-xs text-white/60">NC United staff read the conversation and act within 24 hours.</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="What is wrong? (optional)"
            className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-white placeholder:text-white/40 focus:border-[#D3B574] focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setReporting(false)} className="px-3 py-2 text-sm text-white/70">
              Cancel
            </button>
            <button type="button" onClick={report} disabled={busy} className="rounded-lg bg-[#B31B1B] px-4 py-2 text-sm font-bold text-white">
              Send report
            </button>
          </div>
        </div>
      ) : null}

      {notice ? <p className="rounded-lg border border-[#D3B574]/30 bg-[#D3B574]/10 p-3 text-sm text-[#f0dcae]">{notice}</p> : null}

      <ol className={cn("flex flex-col gap-3", pane && "min-h-0 flex-1 overflow-y-auto pr-1")}>
        {thread.messages.map((m) => (
          <li key={m.id} className={cn("flex items-end gap-2", m.mine ? "flex-row-reverse" : "flex-row")}>
            {/* The program's mark beside what its coach wrote, for the family and for staff reading along. */}
            {m.senderRole === "coach" && !m.mine ? <ProgramMark logo={thread.programLogo} program={thread.program} size={32} className="mb-5" /> : null}
            <div className={cn("flex min-w-0 max-w-[85%] flex-col", m.mine ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                  m.mine ? "bg-[#D3B574] text-[#0A1628]" : "border border-white/10 bg-white/[0.06] text-white",
                )}
              >
                {m.body}
              </div>
              <span className="mt-1 px-1 text-xs text-white/45">
                {m.mine ? "You" : m.senderName} · {when(m.createdAt)}
              </span>
            </div>
          </li>
        ))}
        <li ref={endRef} aria-hidden />
      </ol>

      {thread.stopped && thread.viewerRole === "coach" ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
          This family has turned off messages from you.
        </p>
      ) : thread.canReply ? (
        <div className={compact || pane ? "border-t border-white/10 pt-3" : "sticky bottom-0 -mx-4 border-t border-white/10 bg-[#0A1628]/95 px-4 py-3 backdrop-blur"}>
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder="Write a reply…"
              className="min-h-[48px] flex-1 resize-y rounded-lg border border-white/15 bg-white/5 p-3 text-[15px] text-white placeholder:text-white/40 focus:border-[#D3B574] focus:outline-none"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim() || busy}
              aria-label="Send"
              className="inline-flex h-12 min-w-12 items-center justify-center rounded-lg bg-[#D3B574] px-4 font-bold text-[#0A1628] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
