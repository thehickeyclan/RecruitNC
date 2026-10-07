"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

/**
 * Coach messages - staff view of coach → prospect messaging.
 *
 * Overview (the numbers), Conversations (every thread, searchable, readable in place), Coaches
 * (who is using it and whether families answer them) and Reports (App Store guideline 1.2: act
 * within 24 hours). Resolving a report can cut the coach off from that wrestler; revoking the coach
 * altogether is Confirm/Revoke on /admin/users-dashboard, which stops every send at once.
 *
 * Reading a conversation here does not mark it read for the coach or the family.
 */

type Thread = {
  id: string
  athleteId: string
  athleteName: string
  classYear: number | null
  claimed: boolean
  coachUserId: string
  coachName: string
  coachEmail: string | null
  program: string | null
  createdAt: string
  lastMessageAt: string
  stopped: boolean
  coachMessages: number
  athleteMessages: number
  parentMessages: number
  replied: boolean
  replyHours: number | null
  awaiting: "family" | "coach" | null
  openReports: number
  everReported: boolean
}
type Coach = {
  userId: string
  name: string
  email: string | null
  reviewStatus: string | null
  program: string | null
  conversations: number
  newLast7: number
  messagesSent: number
  replied: number
  replyRate: number
  stopped: number
  reported: number
  lastSentAt: string | null
}
type Report = {
  id: string
  status: string
  reason: string | null
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
  reporter: string
  thread: Thread | null
}
type Stats = {
  conversations: number
  messages: number
  coachMessages: number
  familyMessages: number
  replied: number
  replyRate: number
  medianReplyHours: number | null
  activeCoaches: number
  programs: number
  wrestlers: number
  unclaimedWrestlers: number
  stopped: number
  openReports: number
  newLast7: number
  newLast30: number
  messagesLast7: number
}
type Payload = { stats: Stats; daily: Array<{ day: string; coach: number; family: number }>; threads: Thread[]; coaches: Coach[]; reports: Report[] }
type Detail = {
  messages: Array<{ id: string; body: string; senderRole: string; senderName: string; createdAt: string }>
}

const stamp = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
const pct = (x: number) => `${Math.round(x * 100)}%`
const hours = (h: number | null) => (h == null ? "—" : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(h < 10 ? 1 : 0)} h` : `${Math.round(h / 24)} days`)
const hoursLeft = (iso: string) => Math.round(24 - (Date.now() - new Date(iso).getTime()) / 3_600_000)

type Tab = "overview" | "conversations" | "coaches" | "reports"
type Filter = "all" | "awaiting" | "replied" | "unreplied" | "stopped" | "reported"

export default function AdminCoachMessagesPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [coachFilter, setCoachFilter] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () =>
    fetch("/api/admin/coach-messages", { credentials: "include" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error ?? "Could not load.")
        setData(body)
        if (body.stats?.openReports > 0) setTab((t) => (t === "overview" ? "reports" : t))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load."))

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!openId) {
      setDetail(null)
      return
    }
    setDetail(null)
    fetch(`/api/coach-messages/${openId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDetail(d.thread ?? { messages: [] }))
      .catch(() => setDetail({ messages: [] }))
  }, [openId])

  const threads = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.threads ?? []).filter((t) => {
      if (coachFilter && t.coachUserId !== coachFilter) return false
      if (filter === "awaiting" && t.awaiting !== "coach") return false
      if (filter === "replied" && !t.replied) return false
      if (filter === "unreplied" && t.replied) return false
      if (filter === "stopped" && !t.stopped) return false
      if (filter === "reported" && !t.everReported) return false
      if (!q) return true
      return [t.athleteName, t.coachName, t.coachEmail, t.program].some((v) => (v ?? "").toLowerCase().includes(q))
    })
  }, [data, query, filter, coachFilter])

  const resolve = async (reportId: string, stopThread: boolean) => {
    const resolution = window.prompt(stopThread ? "Note (coach will be cut off from this wrestler):" : "Resolution note:", "")
    if (resolution === null) return
    setBusy(reportId)
    try {
      const res = await fetch("/api/admin/coach-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reportId, resolution, stopThread }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed")
      await load()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed")
    } finally {
      setBusy(null)
    }
  }

  const s = data?.stats
  const maxDay = Math.max(1, ...(data?.daily ?? []).map((d) => d.coach + d.family))

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628]">Coach messages</h1>
          <p className="mt-1 text-sm text-slate-600">
            Coaches start every conversation; the wrestler and linked parents can reply. Reports must be acted on within 24 hours.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Refresh
        </button>
      </div>

      {error ? <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {(
          [
            ["overview", "Overview"],
            ["conversations", `Conversations${s ? ` (${s.conversations})` : ""}`],
            ["coaches", `Coaches${s ? ` (${s.activeCoaches})` : ""}`],
            ["reports", `Reports${s?.openReports ? ` · ${s.openReports} open` : ""}`],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === key ? "border-[#0A1628] text-[#0A1628]" : "border-transparent text-slate-500 hover:text-slate-800"
            } ${key === "reports" && s?.openReports ? "text-red-700" : ""}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {!data ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : tab === "overview" && s ? (
        <section className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Conversations", s.conversations, `${s.newLast7} new this week`],
              ["Messages", s.messages, `${s.coachMessages} coach · ${s.familyMessages} family`],
              ["Reply rate", pct(s.replyRate), `${s.replied} of ${s.conversations} answered`],
              ["Median first reply", hours(s.medianReplyHours), "coach's first → family's first"],
              ["Coaches", s.activeCoaches, `${s.programs} programs`],
              ["Wrestlers reached", s.wrestlers, s.unclaimedWrestlers ? `${s.unclaimedWrestlers} unclaimed profiles` : "all claimed"],
            ].map(([label, value, sub]) => (
              <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[#0A1628]">{value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`rounded-lg border p-4 ${s.openReports ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open reports</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${s.openReports ? "text-red-700" : "text-[#0A1628]"}`}>{s.openReports}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Families who stopped a coach</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#0A1628]">{s.stopped}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last 30 days</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#0A1628]">{s.newLast30}</p>
              <p className="mt-0.5 text-xs text-slate-500">new conversations · {s.messagesLast7} messages this week</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#0A1628]">Messages per day, last 30 days</p>
              <p className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#0A1628]" /> Coach
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#D3B574]" /> Family
                </span>
              </p>
            </div>
            <div className="mt-4 flex h-32 items-end gap-[3px]">
              {data.daily.map((d) => (
                <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.coach} coach, ${d.family} family`}>
                  <div className="rounded-t-sm bg-[#D3B574]" style={{ height: `${(d.family / maxDay) * 100}%` }} />
                  <div className="bg-[#0A1628]" style={{ height: `${(d.coach / maxDay) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>{data.daily[0]?.day.slice(5)}</span>
              <span>today</span>
            </div>
          </div>
        </section>
      ) : tab === "conversations" ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wrestler, coach, email or program"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm sm:w-80"
            />
            {(
              [
                ["all", "All"],
                ["awaiting", "Coach owes a reply"],
                ["replied", "Family replied"],
                ["unreplied", "No reply"],
                ["stopped", "Stopped"],
                ["reported", "Reported"],
              ] as Array<[Filter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === key ? "border-[#0A1628] bg-[#0A1628] text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            ))}
            {coachFilter ? (
              <button type="button" onClick={() => setCoachFilter(null)} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                Coach: {data.coaches.find((c) => c.userId === coachFilter)?.name} ✕
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              {threads.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No conversations match.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Coach</th>
                      <th className="px-3 py-2">Wrestler</th>
                      <th className="px-3 py-2 text-right">Coach</th>
                      <th className="px-3 py-2 text-right">Family</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Last</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {threads.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setOpenId(t.id === openId ? null : t.id)}
                        className={`cursor-pointer hover:bg-slate-50 ${t.id === openId ? "bg-amber-50" : ""}`}
                      >
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-900">{t.coachName}</div>
                          <div className="text-xs text-slate-500">{t.program ?? t.coachEmail}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-slate-900">{t.athleteName}</div>
                          <div className="text-xs text-slate-500">
                            {t.classYear ? `Class of ${t.classYear}` : ""}
                            {!t.claimed ? " · unclaimed" : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{t.coachMessages}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {t.athleteMessages + t.parentMessages}
                          {t.parentMessages ? <span className="ml-1 text-xs text-slate-400">({t.parentMessages}p)</span> : null}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {t.openReports ? <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">reported</span> : null}
                            {t.stopped ? <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700">stopped</span> : null}
                            {t.replied ? (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-800">replied{t.replyHours != null ? ` in ${hours(t.replyHours)}` : ""}</span>
                            ) : (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">no reply</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-500">{stamp(t.lastMessageAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <aside className="rounded-lg border border-slate-200 bg-white lg:sticky lg:top-4 lg:max-h-[80vh] lg:overflow-y-auto">
              {!openId ? (
                <p className="p-6 text-sm text-slate-500">Select a conversation to read it. Reading here does not mark it read for anyone.</p>
              ) : !detail ? (
                <p className="p-6 text-sm text-slate-500">Loading…</p>
              ) : (
                <div className="p-4">
                  {(() => {
                    const t = data.threads.find((x) => x.id === openId)
                    return t ? (
                      <div className="mb-3 border-b border-slate-100 pb-3">
                        <p className="font-semibold text-slate-900">
                          {t.coachName} → <Link href={`/athletes/${t.athleteId}`} target="_blank" className="hover:underline">{t.athleteName}</Link>
                        </p>
                        <p className="text-xs text-slate-500">{[t.program, t.coachEmail, `started ${stamp(t.createdAt)}`].filter(Boolean).join(" · ")}</p>
                      </div>
                    ) : null
                  })()}
                  <ol className="space-y-3">
                    {detail.messages.map((m) => (
                      <li key={m.id} className={m.senderRole === "coach" ? "" : "pl-6"}>
                        <p className="text-xs text-slate-500">
                          <span className={`font-semibold ${m.senderRole === "coach" ? "text-[#0A1628]" : "text-amber-700"}`}>{m.senderName}</span> · {stamp(m.createdAt)}
                        </p>
                        <p className={`mt-1 whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.senderRole === "coach" ? "bg-slate-100 text-slate-900" : "bg-amber-50 text-slate-900"}`}>{m.body}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </aside>
          </div>
        </section>
      ) : tab === "coaches" ? (
        <section className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          {data.coaches.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No coach has sent a message yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">Coach</th>
                  <th className="px-3 py-2 text-right">Conversations</th>
                  <th className="px-3 py-2 text-right">New 7d</th>
                  <th className="px-3 py-2 text-right">Sent</th>
                  <th className="px-3 py-2 text-right">Reply rate</th>
                  <th className="px-3 py-2 text-right">Stopped</th>
                  <th className="px-3 py-2 text-right">Reported</th>
                  <th className="px-3 py-2">Last sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.coaches.map((c) => (
                  <tr key={c.userId}>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCoachFilter(c.userId)
                          setFilter("all")
                          setTab("conversations")
                        }}
                        className="text-left font-semibold text-slate-900 hover:underline"
                      >
                        {c.name}
                      </button>
                      <div className="text-xs text-slate-500">
                        {[c.program, c.email].filter(Boolean).join(" · ")}
                        {c.reviewStatus !== "approved" ? <span className="ml-1 font-semibold text-red-700">({c.reviewStatus ?? "unreviewed"})</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.conversations}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.newLast7}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.messagesSent}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {pct(c.replyRate)} <span className="text-xs text-slate-400">({c.replied})</span>
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${c.stopped ? "font-semibold text-amber-700" : ""}`}>{c.stopped}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${c.reported ? "font-semibold text-red-700" : ""}`}>{c.reported}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">{c.lastSentAt ? stamp(c.lastSentAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            To revoke a coach entirely, use <Link href="/admin/users-dashboard" className="underline">Users</Link>. Revoking stops every send at once.
          </p>
        </section>
      ) : (
        <section className="mt-6">
          {data.reports.length === 0 ? (
            <p className="text-sm text-slate-500">No reports.</p>
          ) : (
            <ul className="space-y-3">
              {data.reports.map((r) => (
                <li key={r.id} className={`rounded-lg border p-4 ${r.status === "open" ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold text-slate-900">
                      {r.thread ? `${r.thread.coachName}${r.thread.program ? ` (${r.thread.program})` : ""} → ${r.thread.athleteName}` : "Conversation removed"}
                    </span>
                    <span className="text-slate-500">
                      reported by {r.reporter} · {stamp(r.createdAt)}
                    </span>
                    {r.status === "open" ? (
                      <span className={`font-semibold ${hoursLeft(r.createdAt) <= 4 ? "text-red-700" : "text-amber-700"}`}>
                        {hoursLeft(r.createdAt) > 0 ? `${hoursLeft(r.createdAt)}h left` : `overdue by ${-hoursLeft(r.createdAt)}h`}
                      </span>
                    ) : (
                      <span className="text-emerald-700">
                        Resolved {r.resolvedAt ? stamp(r.resolvedAt) : ""}: {r.resolution}
                      </span>
                    )}
                  </div>
                  {r.reason ? <p className="mt-2 text-sm text-slate-700">“{r.reason}”</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {r.thread ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenId(r.thread!.id)
                          setFilter("all")
                          setCoachFilter(null)
                          setQuery("")
                          setTab("conversations")
                        }}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Read conversation
                      </button>
                    ) : null}
                    {r.status === "open" ? (
                      <>
                        <button type="button" disabled={busy === r.id} onClick={() => resolve(r.id, false)} className="rounded bg-slate-800 px-3 py-1.5 font-semibold text-white">
                          Resolve
                        </button>
                        <button type="button" disabled={busy === r.id} onClick={() => resolve(r.id, true)} className="rounded bg-red-700 px-3 py-1.5 font-semibold text-white">
                          Resolve + cut coach off
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
