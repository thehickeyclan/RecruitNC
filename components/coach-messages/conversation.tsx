"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CheckCheck, Check, CornerUpLeft, FileText, Flag, Loader2, Paperclip, Pencil, Send, ShieldOff, ShieldCheck, SmilePlus, Trash2, X } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { ProgramMark, StageChip, wrestlerLine } from "@/components/coach-messages/inbox-list"
import { COACH_MESSAGES_CHANGED } from "@/hooks/use-nav-badges"

type Message = {
  id: string
  body: string
  senderRole: string
  senderName: string
  createdAt: string
  mine: boolean
  editedAt?: string | null
  unsent?: boolean
  replyTo?: { id: string; senderName: string; body: string } | null
  reactions?: Array<{ emoji: string; count: number; mine: boolean }>
  attachment?: { name: string; type: string; size: number; url: string | null } | null
  seen?: boolean
}
export type ThreadCollege = { id: string; name: string; city: string; state: string; division: string | null; conference: string | null; listStatus: string | null; note: string | null }
const REACTIONS = ["👍", "❤️", "🔥", "💪", "👏", "🙏"]
const EDIT_WINDOW_MS = 15 * 60 * 1000
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic"
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
  college?: ThreadCollege | null
  firstMessageAt?: string | null
  extras?: boolean
  /** For a coach only: their level may not recruit this wrestler yet (lib/coach-messages-compliance.ts). */
  compliance?: { status: string; title: string; detail: string; allowed: string; href: string } | null
}

/** "MH" for "Matthew Hickey (parent)"; the bracketed role is not part of the name. */
const initialsOf = (name: string) =>
  name
    .replace(/\(.*?\)/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?"

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
  onThread,
}: {
  threadId: string
  compact?: boolean
  /** Fills the right-hand pane of the inbox: the messages scroll, the reply box stays put. */
  pane?: boolean
  /** Called after a message is sent, so a list beside this one can drop its "needs your reply". */
  onSent?: () => void
  /** The loaded conversation, for a panel beside it (the college, for a family). */
  onThread?: (thread: Thread) => void
}) {
  const [thread, setThread] = useState<Thread | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState("")
  const endRef = useRef<HTMLLIElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<Message | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [actionsFor, setActionsFor] = useState<string | null>(null)
  const [picking, setPicking] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach-messages/${threadId}`, { credentials: "include" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? "Could not load this conversation.")
      return
    }
    setThread(data.thread)
    onThread?.(data.thread)
    // Loading it marked it read on the server.
    window.dispatchEvent(new Event(COACH_MESSAGES_CHANGED))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    // On the profile the conversation is one card among many; jumping the page would lose the reader.
    if (!compact) endRef.current?.scrollIntoView({ block: pane ? "nearest" : "end" })
  }, [thread?.messages.length, compact])

  const api = async (url: string, init: RequestInit) => {
    const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.")
    return data
  }

  const send = async () => {
    if ((!draft.trim() && !file) || busy) return
    setBusy(true)
    setNotice(null)
    try {
      if (editing) {
        await api(`/api/coach-messages/${threadId}/messages/${editing.id}`, { method: "PATCH", body: JSON.stringify({ action: "edit", body: draft }) })
        setEditing(null)
      } else {
        let attachment: { path: string; name: string; type: string; size: number } | null = null
        if (file) {
          const slot = await api(`/api/coach-messages/${threadId}/attachment`, { method: "POST", body: JSON.stringify({ name: file.name, type: file.type, size: file.size }) })
          const { error: upErr } = await createBrowserClient().storage.from(slot.bucket).uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type })
          if (upErr) throw new Error("Could not upload the file. Try again.")
          attachment = { path: slot.path, name: file.name, type: file.type, size: file.size }
        }
        await api(`/api/coach-messages/${threadId}`, { method: "POST", body: JSON.stringify({ body: draft, replyToId: replyTo?.id ?? null, attachment }) })
        setReplyTo(null)
        setFile(null)
        onSent?.()
      }
      setDraft("")
      await load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not send.")
    } finally {
      setBusy(false)
    }
  }

  const unsend = async (m: Message) => {
    if (!window.confirm("Unsend this message? It disappears for everyone in the conversation.")) return
    try {
      await api(`/api/coach-messages/${threadId}/messages/${m.id}`, { method: "PATCH", body: JSON.stringify({ action: "unsend" }) })
      await load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not unsend.")
    }
  }

  const react = async (m: Message, emoji: string) => {
    setPicking(null)
    try {
      await api(`/api/coach-messages/${threadId}/messages/${m.id}/react`, { method: "POST", body: JSON.stringify({ emoji }) })
      await load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not react.")
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
        {thread.viewerRole === "coach" && thread.compliance ? (
          <div role="alert" className="w-full rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-bold">{thread.compliance.title}</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/80">
              {thread.compliance.allowed}{" "}
              <a href={thread.compliance.href} target="_blank" rel="noreferrer" className="underline">
                The rules
              </a>
            </p>
          </div>
        ) : null}
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

      <ol className={cn("flex flex-col gap-4", pane && "min-h-0 flex-1 overflow-y-auto pr-1")}>
        {thread.messages.map((m, i) => {
          const canChange = m.mine && !m.unsent && thread.extras && Date.now() - new Date(m.createdAt).getTime() < EDIT_WINDOW_MS && thread.canReply
          const canAct = thread.extras && !m.unsent && thread.viewerRole !== "admin"
          const lastMine = m.mine && !thread.messages.slice(i + 1).some((n) => n.mine)
          const image = m.attachment?.type.startsWith("image/")
          return (
            <li key={m.id} className={cn("group flex items-start gap-2.5", m.mine ? "flex-row-reverse" : "flex-row")}>
              {/*
                Who said it, on every message, the way a group chat shows it (Matt, 12 October 2026):
                the program's logo beside a coach, initials beside the wrestler or a parent.
              */}
              {m.senderRole === "coach" ? (
                <ProgramMark logo={thread.programLogo} program={thread.program} size={36} className="mt-0.5" />
              ) : (
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-black text-white" aria-hidden>
                  {initialsOf(m.senderName)}
                </span>
              )}
              <div className={cn("flex min-w-0 max-w-[85%] flex-col", m.mine ? "items-end" : "items-start")}>
                <span className="mb-1 px-1 text-xs text-white/55">
                  <span className="font-bold text-white/85">{m.senderName || (m.senderRole === "coach" ? "Coach" : "Family")}</span>
                  {m.mine ? " (You)" : ""}
                  <span className="text-white/40"> · {when(m.createdAt)}</span>
                </span>
                <div className={cn("relative flex items-center gap-1", m.mine ? "flex-row-reverse" : "flex-row")}>
                  <div
                    onClick={() => setActionsFor((cur) => (cur === m.id ? null : m.id))}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-left text-[15px] leading-relaxed",
                      m.unsent
                        ? "border border-dashed border-white/20 italic text-white/45"
                        : m.mine
                          ? "bg-[#1f5fbf] text-white"
                          : "border border-white/10 bg-white/[0.06] text-white",
                    )}
                  >
                    {m.replyTo ? (
                      <span className={cn("mb-2 block border-l-2 pl-2 text-xs", m.mine ? "border-white/60 text-white/75" : "border-[#D3B574] text-white/60")}>
                        <span className="font-bold">{m.replyTo.senderName}</span>
                        <span className="line-clamp-2 block">{m.replyTo.body}</span>
                      </span>
                    ) : null}
                    {m.unsent ? (
                      "Message unsent"
                    ) : (
                      <>
                        {m.attachment ? (
                          image && m.attachment.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <a href={m.attachment.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mb-2 block">
                              <img src={m.attachment.url} alt={m.attachment.name} className="max-h-64 rounded-lg" />
                            </a>
                          ) : (
                            <a
                              href={m.attachment.url ?? undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mb-2 flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2 text-sm font-semibold"
                            >
                              <FileText className="h-4 w-4 shrink-0" aria-hidden />
                              <span className="truncate">{m.attachment.name}</span>
                              <span className="shrink-0 text-xs opacity-60">{Math.max(1, Math.round(m.attachment.size / 1024))} KB</span>
                            </a>
                          )
                        ) : null}
                        {m.attachment && m.body === `📎 ${m.attachment.name}` ? null : <span className="whitespace-pre-wrap break-words">{m.body}</span>}
                      </>
                    )}
                  </div>
                  {canAct ? (
                    <span className={cn("flex shrink-0 items-center gap-0.5 transition", actionsFor === m.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                      <button type="button" aria-label="React" onClick={() => setPicking((cur) => (cur === m.id ? null : m.id))} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
                        <SmilePlus className="h-4 w-4" />
                      </button>
                      {thread.canReply ? (
                        <button type="button" aria-label="Reply" onClick={() => { setEditing(null); setReplyTo(m) }} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
                          <CornerUpLeft className="h-4 w-4" />
                        </button>
                      ) : null}
                      {canChange ? (
                        <>
                          <button type="button" aria-label="Edit" onClick={() => { setReplyTo(null); setEditing(m); setDraft(m.body) }} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" aria-label="Unsend" onClick={() => unsend(m)} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-red-300">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </span>
                  ) : null}
                  {picking === m.id ? (
                    <span className={cn("absolute -top-11 z-10 flex gap-1 rounded-full border border-white/15 bg-[#0d1d36] px-2 py-1 shadow-xl", m.mine ? "right-0" : "left-0")}>
                      {REACTIONS.map((e) => (
                        <button key={e} type="button" onClick={() => react(m, e)} className="rounded-full px-1 text-xl transition hover:scale-125" aria-label={`React ${e}`}>
                          {e}
                        </button>
                      ))}
                    </span>
                  ) : null}
                </div>
                {m.reactions?.length ? (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => react(m, r.emoji)}
                        disabled={!canAct}
                        className={cn("rounded-full border px-2 py-0.5 text-xs", r.mine ? "border-[#D3B574] bg-[#D3B574]/15" : "border-white/15 bg-white/5")}
                      >
                        {r.emoji} {r.count > 1 ? r.count : ""}
                      </button>
                    ))}
                  </span>
                ) : null}
                {(m.editedAt && !m.unsent) || (lastMine && !m.unsent) ? (
                  <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-white/40">
                    {m.editedAt && !m.unsent ? <span>Edited</span> : null}
                    {lastMine && !m.unsent && thread.extras ? (
                      m.seen ? (
                        <span className="inline-flex items-center gap-0.5 text-sky-300"><CheckCheck className="h-3.5 w-3.5" aria-hidden /> Seen</span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5"><Check className="h-3.5 w-3.5" aria-hidden /> Sent</span>
                      )
                    ) : null}
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
        <li ref={endRef} aria-hidden />
      </ol>

      {thread.stopped && thread.viewerRole === "coach" ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
          This family has turned off messages from you.
        </p>
      ) : thread.canReply ? (
        <div className={compact || pane ? "border-t border-white/10 pt-3" : "sticky bottom-0 -mx-4 border-t border-white/10 bg-[#0A1628]/95 px-4 py-3 backdrop-blur"}>
          {replyTo || editing || file ? (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70">
              {editing ? <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden /> : replyTo ? <CornerUpLeft className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              <span className="min-w-0 flex-1 truncate">
                {editing ? "Editing your message" : replyTo ? <>Replying to <b>{replyTo.senderName}</b>: {replyTo.body}</> : file?.name}
              </span>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => {
                  if (editing) setDraft("")
                  setEditing(null)
                  setReplyTo(null)
                  setFile(null)
                }}
                className="rounded p-0.5 hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            {thread.extras && !editing ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    e.target.value = ""
                    if (f && f.size > 10 * 1024 * 1024) return setNotice("Files can be up to 10 MB.")
                    setFile(f)
                  }}
                />
                <button type="button" aria-label="Attach a PDF or photo" onClick={() => fileRef.current?.click()} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/60 hover:text-white">
                  <Paperclip className="h-5 w-5" />
                </button>
              </>
            ) : null}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={editing ? "Edit your message…" : "Type a message…"}
              className="min-h-[48px] flex-1 resize-y rounded-lg border border-white/15 bg-white/5 p-3 text-[15px] text-white placeholder:text-white/40 focus:border-[#D3B574] focus:outline-none"
            />
            <button
              type="button"
              onClick={send}
              disabled={(!draft.trim() && !file) || busy}
              aria-label={editing ? "Save" : "Send"}
              className="inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-lg bg-[#D3B574] px-4 font-bold text-[#0A1628] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : editing ? "Save" : <><span className="hidden sm:inline">Send</span><Send className="h-5 w-5" /></>}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
