"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

/**
 * Staff oversight of coach → prospect messaging.
 *
 * Reports first: App Store guideline 1.2 gives 24 hours from report to action, and the reporting
 * family is told that. Resolving can also cut the coach off from that wrestler; revoking the coach
 * altogether is the Confirm/Revoke on /admin/users-dashboard, which stops every send at once.
 */

type ThreadRow = {
  id: string
  athleteId: string
  athleteName: string
  coachName: string
  coachEmail: string | null
  program: string | null
  lastMessageAt: string
  stopped: boolean
  coachMessages: number
  familyMessages: number
}
type ReportRow = {
  id: string
  status: string
  reason: string | null
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
  reporter: string
  thread: ThreadRow | null
}

const stamp = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

function hoursLeft(iso: string): number {
  return Math.round(24 - (Date.now() - new Date(iso).getTime()) / 3_600_000)
}

export default function AdminCoachMessagesPage() {
  const [data, setData] = useState<{ reports: ReportRow[]; threads: ThreadRow[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () =>
    fetch("/api/admin/coach-messages", { credentials: "include" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error ?? "Could not load.")
        setData(body)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load."))

  useEffect(() => {
    void load()
  }, [])

  const resolve = async (reportId: string, stopThread: boolean) => {
    const resolution = window.prompt(stopThread ? "Note (coach will be cut off from this wrestler):" : "Resolution note:", "") ?? null
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

  const open = data?.reports.filter((r) => r.status === "open") ?? []

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0A1628]">Coach messages</h1>
      <p className="mt-1 text-sm text-slate-600">
        Coaches start every conversation; the wrestler and linked parents can reply. Reports must be acted on within 24 hours.
      </p>
      {error ? <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {!data ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <h2 className="mt-8 text-lg font-bold text-[#0A1628]">
            Reports {open.length ? <span className="ml-2 rounded bg-red-600 px-2 py-0.5 text-sm text-white">{open.length} open</span> : null}
          </h2>
          {data.reports.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No reports.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.reports.map((r) => (
                <li key={r.id} className={`rounded-lg border p-4 ${r.status === "open" ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold text-slate-900">
                      {r.thread ? `${r.thread.coachName}${r.thread.program ? ` (${r.thread.program})` : ""} → ${r.thread.athleteName}` : "Conversation removed"}
                    </span>
                    <span className="text-slate-500">reported by {r.reporter} · {stamp(r.createdAt)}</span>
                    {r.status === "open" ? (
                      <span className={`font-semibold ${hoursLeft(r.createdAt) <= 4 ? "text-red-700" : "text-amber-700"}`}>
                        {hoursLeft(r.createdAt) > 0 ? `${hoursLeft(r.createdAt)}h left` : `overdue by ${-hoursLeft(r.createdAt)}h`}
                      </span>
                    ) : (
                      <span className="text-emerald-700">Resolved {r.resolvedAt ? stamp(r.resolvedAt) : ""}: {r.resolution}</span>
                    )}
                  </div>
                  {r.reason ? <p className="mt-2 text-sm text-slate-700">“{r.reason}”</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {r.thread ? (
                      <Link href={`/inbox/${r.thread.id}`} target="_blank" className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-50">
                        Read conversation
                      </Link>
                    ) : null}
                    {r.status === "open" ? (
                      <>
                        <button type="button" disabled={busy === r.id} onClick={() => resolve(r.id, false)} className="rounded bg-slate-800 px-3 py-1.5 font-semibold text-white">
                          Resolve
                        </button>
                        <button type="button" disabled={busy === r.id} onClick={() => resolve(r.id, true)} className="rounded bg-red-700 px-3 py-1.5 font-semibold text-white">
                          Resolve + cut coach off
                        </button>
                        <Link href="/admin/users-dashboard" className="self-center text-xs text-slate-500 underline">
                          Revoke the coach entirely →
                        </Link>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-10 text-lg font-bold text-[#0A1628]">Recent conversations</h2>
          {data.threads.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No conversations yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Coach</th>
                    <th className="px-3 py-2">Wrestler</th>
                    <th className="px-3 py-2">Coach / family msgs</th>
                    <th className="px-3 py-2">Last</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.threads.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900">{t.coachName}</div>
                        <div className="text-xs text-slate-500">{[t.program, t.coachEmail].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/athletes/${t.athleteId}`} className="text-slate-900 hover:underline">
                          {t.athleteName}
                        </Link>
                        {t.stopped ? <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">stopped</span> : null}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {t.coachMessages} / {t.familyMessages}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{stamp(t.lastMessageAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <Link href={`/inbox/${t.id}`} target="_blank" className="font-semibold text-[#0A1628] hover:underline">
                          Read
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  )
}
