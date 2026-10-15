"use client"

import { useState } from "react"
import { Bookmark, CalendarDays, ChevronRight, FileText, Map as MapIcon, NotebookPen, School, UserRound } from "lucide-react"

import { ProgramMark } from "@/components/coach-messages/inbox-list"
import type { ThreadCollege } from "@/components/coach-messages/conversation"
import { COLLEGE_LIST_STATUS_LABEL, type CollegeListStatus } from "@/lib/college-programs/list"
import { DIVISION_SHORT, type CollegeDivision } from "@/lib/college-programs/types"

type RailThread = {
  athleteId: string
  coachName: string
  program: string | null
  programLogo?: string | null
  college?: ThreadCollege | null
  firstMessageAt?: string | null
  messages: Array<{ createdAt: string }>
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })

/**
 * Beside a family's conversation: the college it is with, where it sits on their list, and what to
 * do next - so every message is tied to the recruiting journey, not floating in an inbox.
 */
export function CollegeRail({ thread }: { thread: RailThread }) {
  const c = thread.college ?? null
  const [status, setStatus] = useState<string | null>(c?.listStatus ?? null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!c) return
    setBusy(true)
    const res = await fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: c.id, status: "talking" }) }).catch(() => null)
    if (res?.ok) setStatus("talking")
    setBusy(false)
  }

  const row = "flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-white/85 hover:bg-white/5 hover:text-white"
  const last = thread.messages.at(-1)?.createdAt ?? null

  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="relative h-24 shrink-0 overflow-hidden rounded-t-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-banner-nchsaa-2026-arena.png" alt="" aria-hidden className="h-full w-full object-cover opacity-60" />
        <span className="absolute inset-0 bg-gradient-to-t from-[#0d1d36] to-transparent" aria-hidden />
      </div>
      <div className="-mt-10 px-4">
        <ProgramMark logo={thread.programLogo} program={thread.program} size={64} className="ring-4 ring-[#0d1d36]" />
        <p className="mt-2 text-lg font-black leading-6">{c?.name ?? thread.program ?? "College program"}</p>
        {c ? (
          <p className="text-xs text-white/55">
            {[c.division ? DIVISION_SHORT[c.division as CollegeDivision] ?? c.division : null, c.conference].filter(Boolean).join(" · ")}
            <span className="block">
              {c.city}, {c.state}
            </span>
          </p>
        ) : null}
        {c ? (
          <a href={`/recruiting/schools/${c.id}`} className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-[#D3B574] px-3 py-2 text-sm font-bold text-[#D3B574] hover:bg-[#D3B574] hover:text-[#0A1628]">
            View college <ChevronRight className="h-4 w-4" aria-hidden />
          </a>
        ) : null}
      </div>

      <div className="mt-4 border-t border-white/10 px-2 py-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <UserRound className="h-4 w-4 text-white/45" aria-hidden />
          <span className="text-sm">
            <span className="font-semibold text-white">{thread.coachName}</span>
            <span className="block text-xs text-emerald-300">Verified college coach</span>
          </span>
        </div>
        {c ? (
          status ? (
            <a href="/my-recruiting/colleges" className={row}>
              <Bookmark className="h-4 w-4 text-[#D3B574]" aria-hidden />
              <span className="flex-1">On your list: <b>{COLLEGE_LIST_STATUS_LABEL[status as CollegeListStatus] ?? status}</b></span>
            </a>
          ) : (
            <button type="button" onClick={save} disabled={busy} className={`${row} w-full text-left`}>
              <Bookmark className="h-4 w-4 text-white/45" aria-hidden />
              <span className="flex-1">Add to my college list</span>
            </button>
          )
        ) : null}
        {c ? (
          <a href={`/recruiting/college-map?school=${c.id}`} className={row}>
            <MapIcon className="h-4 w-4 text-white/45" aria-hidden /> View on map
          </a>
        ) : null}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#D3B574]">Conversation</p>
        <dl className="mt-2 space-y-1.5 text-xs">
          {thread.firstMessageAt ? (
            <div className="flex justify-between"><dt className="text-white/50">First message</dt><dd>{day(thread.firstMessageAt)}</dd></div>
          ) : null}
          <div className="flex justify-between"><dt className="text-white/50">Messages</dt><dd>{thread.messages.length}</dd></div>
          {last ? (
            <div className="flex justify-between"><dt className="text-white/50">Last message</dt><dd>{day(last)}</dd></div>
          ) : null}
        </dl>
      </div>

      <div className="border-t border-white/10 px-2 py-3">
        <p className="px-2 text-[10px] font-black uppercase tracking-widest text-[#D3B574]">Quick actions</p>
        <a href={`/athletes/${thread.athleteId}`} className={row}><School className="h-4 w-4 text-white/45" aria-hidden /> The profile coaches see</a>
        <a href="/my-recruiting/plan" className={row}><CalendarDays className="h-4 w-4 text-white/45" aria-hidden /> Update the schedule</a>
        <a href="/my-recruiting" className={row}><FileText className="h-4 w-4 text-white/45" aria-hidden /> Recruiting info sheet</a>
        <a href="/my-recruiting/colleges" className={row}><NotebookPen className="h-4 w-4 text-white/45" aria-hidden /> Add a note</a>
      </div>
    </aside>
  )
}
