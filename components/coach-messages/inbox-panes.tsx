"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, MessageSquare, PenSquare, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCoachMode } from "@/hooks/use-coach-mode"
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"
import { Conversation } from "@/components/coach-messages/conversation"
import { CoachComposeDialog } from "@/components/coach-messages/coach-message-button"
import { InboxEmpty, InboxList, type InboxFilter, type ThreadSummary } from "@/components/coach-messages/inbox-list"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/**
 * Messages as one screen (Matt, 11 October 2026): conversations down the left, the open one on
 * the right, so a coach working a dozen threads never leaves the page. Each row and the header of
 * the open conversation say who the wrestler is - class, last competed weight, school, state, and
 * where the coach has him in the funnel.
 *
 * On a phone there is room for one pane: the list, or the conversation with a way back.
 * /inbox and /inbox/<id> both render this; the address follows the open conversation, so a
 * refresh or an email link lands on the same one.
 */
type BoardWrestler = { athleteId: string }

export function InboxPanes({ initialThreadId = null }: { initialThreadId?: string | null }) {
  const { actsAsCoach: coach, previewNotice } = useCoachMode()
  const [selectedId, setSelectedId] = useState<string | null>(initialThreadId)
  const [filter, setFilter] = useState<InboxFilter>("all")
  const [query, setQuery] = useState("")
  const [counts, setCounts] = useState({ all: 0, unread: 0, reply: 0 })
  const [reloadKey, setReloadKey] = useState(0)
  const [picking, setPicking] = useState(false)

  const open = (id: string | null) => {
    setSelectedId(id)
    window.history.replaceState(null, "", id ? `/inbox/${id}` : "/inbox")
  }

  const tabs: Array<{ key: InboxFilter; label: string; count?: number }> = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread", count: counts.unread },
    { key: "reply", label: "Needs reply", count: counts.reply },
  ]

  return (
    <main className="bg-[#0A1628] text-white">
      <div className="mx-auto flex h-[calc(100dvh-3.5rem-4rem)] max-w-7xl flex-col px-4 py-5 lg:h-[calc(100dvh-3.5rem)] lg:px-6">
        <div className={cn("flex flex-wrap items-end justify-between gap-3", selectedId && "hidden lg:flex")}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">{RECRUITING_BRAND.name}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Messages</h1>
            <p className="mt-1 text-sm text-white/60">
              {coach
                ? "Conversations you started with wrestlers. Their linked parents see them too."
                : "College coaches who have reached out. Only coaches can start a conversation; you can reply."}
            </p>
          </div>
          {coach ? (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#D3B574] px-4 text-sm font-black text-[#0A1628] hover:bg-[#e0c58c]"
            >
              <PenSquare className="h-4 w-4" aria-hidden />
              New message
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(340px,420px)_1fr]">
          <section aria-label="Conversations" className={cn("flex min-h-0 flex-col rounded-xl border border-white/10 bg-white/[0.03]", selectedId && "hidden lg:flex")}>
            <div className="border-b border-white/10 p-3">
              <div className="flex gap-1.5">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilter(t.key)}
                    aria-pressed={filter === t.key}
                    className={cn(
                      "inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-xs font-bold",
                      filter === t.key ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/15 text-white/70 hover:text-white",
                    )}
                  >
                    {t.label}
                    {t.count ? (
                      <span className={cn("rounded-full px-1.5 text-[10px]", filter === t.key ? "bg-[#0A1628] text-[#D3B574]" : "bg-red-600 text-white")}>{t.count}</span>
                    ) : null}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A1628] px-3">
                <Search className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={coach ? "Search wrestler or school" : "Search coach or program"}
                  aria-label="Search conversations"
                  className="min-h-[40px] w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <InboxList
                selectedId={selectedId}
                onSelect={(t: ThreadSummary) => open(t.id)}
                filter={filter}
                query={query}
                reloadKey={reloadKey}
                onCounts={setCounts}
                listClassName="divide-y divide-white/10"
                empty={<div className="p-4"><InboxEmpty coach={coach} /></div>}
              />
            </div>
          </section>

          <section aria-label="Conversation" className={cn("min-h-0 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5", !selectedId && "hidden lg:block")}>
            {selectedId ? (
              <div className="flex h-full min-h-0 flex-col">
                <button type="button" onClick={() => open(null)} className="mb-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[#D3B574] lg:hidden">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  All messages
                </button>
                <div className="min-h-0 flex-1">
                  <Conversation key={selectedId} threadId={selectedId} pane />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquare className="h-8 w-8 text-[#D3B574]" aria-hidden />
                <p className="mt-3 text-lg font-bold">Pick a conversation</p>
                <p className="mt-1 max-w-sm text-sm text-white/55">
                  {coach ? "Or start one with a wrestler on your board." : "Messages from college coaches open here."}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {coach ? (
        <NewMessage
          open={picking}
          onOpenChange={setPicking}
          blockedMessage={previewNotice}
          onSent={(threadId) => {
            setPicking(false)
            setReloadKey((k) => k + 1)
            open(threadId)
          }}
        />
      ) : null}
    </main>
  )
}

/**
 * Start a conversation without leaving the inbox: search any wrestler, then write. The coach's
 * own board is listed first, because those are the wrestlers a coach is working.
 */
type Recipient = { id: string; name: string; highschool: string | null; graduationyear: number | string | null; weightclass: string | null }

function NewMessage({
  open,
  onOpenChange,
  onSent,
  blockedMessage = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent: (threadId: string) => void
  blockedMessage?: string | null
}) {
  const [all, setAll] = useState<Recipient[] | null>(null)
  const [board, setBoard] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const [target, setTarget] = useState<Recipient | null>(null)

  useEffect(() => {
    if (!open || all) return
    fetch("/api/coach-messages/recipients", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAll(Array.isArray(d?.athletes) ? d.athletes : []))
      .catch(() => setAll([]))
    fetch("/api/coaches/my-recruits", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBoard(new Set(((d?.recruits ?? []) as BoardWrestler[]).map((r) => r.athleteId))))
      .catch(() => {})
  }, [open, all])

  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const hit = (a: Recipient) => words.every((w) => `${a.name} ${a.highschool ?? ""}`.toLowerCase().includes(w))
    const rows = (all ?? []).filter(hit)
    // The board first; with nothing typed, only the board, so the list opens short and useful.
    const onBoard = rows.filter((a) => board.has(a.id))
    const rest = words.length ? rows.filter((a) => !board.has(a.id)) : []
    return [...onBoard, ...rest].slice(0, 40)
  }, [all, board, query])

  if (target) {
    return (
      <CoachComposeDialog
        athleteId={target.id}
        athleteName={target.name}
        blockedMessage={blockedMessage}
        open
        onOpenChange={(o) => {
          if (!o) setTarget(null)
        }}
        onSent={(threadId) => {
          setTarget(null)
          onSent(threadId)
        }}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Search any wrestler by name or high school. Your board is listed first.</DialogDescription>
        </DialogHeader>
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or high school"
          aria-label="Search wrestlers"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <div className="max-h-[50vh] overflow-y-auto">
          {all === null ? (
            <p className="py-4 text-sm text-muted-foreground">Loading wrestlers…</p>
          ) : matches.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              {query.trim() ? "No wrestler in the current classes matches that." : "Type a name or high school to find a wrestler."}
            </p>
          ) : (
            <ul className="divide-y">
              {matches.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setTarget(a)} className="flex min-h-[48px] w-full items-center justify-between gap-3 px-1 py-2 text-left hover:bg-muted/60">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{a.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[a.graduationyear ? `Class of ${a.graduationyear}` : null, a.weightclass ? `${a.weightclass} lbs` : null, a.highschool].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {board.has(a.id) ? <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">On your board</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
