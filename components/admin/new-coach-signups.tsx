"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, FileText, Loader2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Visit = { athleteId: string; name: string; classYear: number | null; school: string | null; views: number; lastViewedAt: string }
type Coach = {
  userId: string
  name: string
  email: string
  verified: boolean
  reviewed: boolean
  signedUpAt: string | null
  lastLoginAt: string | null
  lastActiveAt: string | null
  profileViews: number
  uniqueAthletes: number
  reports: number
  visits: Visit[]
}
type Program = { program: string; coaches: Coach[] }
type Payload = { programs: Program[] }

/**
 * Newest college coaches first, with what each has actually done since.
 *
 * Built because the answer was being fetched by hand. During the Division III outreach the only
 * way to see who had signed up and what they opened was to run a query, which meant the question
 * could only be asked by someone able to run one, and never at the moment it mattered.
 *
 * The leaderboard below this ranks programmes by use over time, which is the long view. This is
 * the short one: who arrived in the last hours, did they get past the rankings page, and did any
 * of them reach a scouting report - the step the outreach is waiting on.
 */

function ago(iso: string | null): string {
  if (!iso) return "never"
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function clockTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

function sameDay(iso: string | null, day: Date): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return d.toDateString() === day.toDateString()
}

const cls = (y: number | null) => (y ? `'${String(y).slice(-2)}` : "")

export function NewCoachSignups({ range }: { range: string }) {
  const [coaches, setCoaches] = useState<Coach[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)

  const load = useCallback(() => {
    setRefreshing(true)
    setError(null)
    fetch(`/api/admin/coach-activity?range=${encodeURIComponent(range)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : r.json().then((b) => Promise.reject(new Error(b?.error ?? "Could not load coaches")))))
      .then((data: Payload) => {
        /* The endpoint groups by programme; newest-first is a different question, so flatten. */
        const flat = (data.programs ?? []).flatMap((p) =>
          p.coaches.map((c) => ({ ...c, program: p.program })),
        ) as Array<Coach & { program: string }>
        flat.sort((a, b) => (b.signedUpAt ?? "").localeCompare(a.signedUpAt ?? ""))
        setCoaches(flat)
        setFetchedAt(new Date())
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load coaches"))
      .finally(() => setRefreshing(false))
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  /* Refreshes itself while the page is open, so a tab left up during a send stays current. */
  useEffect(() => {
    const id = setInterval(load, 120_000)
    return () => clearInterval(id)
  }, [load])

  const today = new Date()
  const todays = (coaches ?? []).filter((c) => sameDay(c.signedUpAt, today))
  const shown = (coaches ?? []).slice(0, 25) as Array<Coach & { program?: string }>

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Newest college coaches</CardTitle>
          <CardDescription>
            {todays.length} signed up today
            {todays.length > 0 && (
              <>
                {" · "}
                {todays.reduce((n, c) => n + c.uniqueAthletes, 0)} athlete profiles opened
                {" · "}
                {todays.reduce((n, c) => n + c.reports, 0)} scouting reports
              </>
            )}
            {fetchedAt ? ` · updated ${clockTime(fetchedAt.toISOString())}` : ""}
          </CardDescription>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </CardHeader>

      <CardContent>
        {error ? (
          <p className="py-6 text-center text-sm text-red-600">{error}</p>
        ) : coaches === null ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No college coaches in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Signed up</th>
                  <th className="py-2 pr-3 font-semibold">Coach</th>
                  <th className="py-2 pr-3 font-semibold">Program</th>
                  <th className="py-2 pr-3 text-center font-semibold">Profiles</th>
                  <th className="py-2 pr-3 text-center font-semibold">Reports</th>
                  <th className="py-2 pr-3 font-semibold">Last active</th>
                  <th className="py-2 font-semibold">Review</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => {
                  const isOpen = open === c.userId
                  const isToday = sameDay(c.signedUpAt, today)
                  return (
                    <Fragment key={c.userId}>
                      <tr
                        className={`border-b cursor-pointer hover:bg-gray-50 ${isToday ? "bg-amber-50/60" : ""}`}
                        onClick={() => setOpen(isOpen ? null : c.userId)}
                      >
                        <td className="py-2 pr-3 whitespace-nowrap text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            {c.uniqueAthletes > 0 ? (
                              isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                            ) : (
                              <span className="inline-block w-3" />
                            )}
                            {clockTime(c.signedUpAt)}
                            {isToday ? "" : ` · ${new Date(c.signedUpAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className="font-medium text-gray-900">{c.name}</span>
                          <span className="block text-xs text-gray-500">{c.email}</span>
                        </td>
                        <td className="py-2 pr-3 text-gray-700">{c.program ?? "—"}</td>
                        <td className="py-2 pr-3 text-center font-semibold text-gray-900">{c.uniqueAthletes}</td>
                        <td className="py-2 pr-3 text-center">
                          {c.reports > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-green-700">
                              <FileText className="h-3 w-3" />
                              {c.reports}
                            </span>
                          ) : (
                            <span className="text-gray-300">0</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-gray-600">{ago(c.lastActiveAt)}</td>
                        <td className="py-2">
                          {c.reviewed ? (
                            <Badge className="bg-green-100 text-green-800">Reviewed</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800">Unreviewed</Badge>
                          )}
                        </td>
                      </tr>

                      {isOpen && c.visits.length > 0 && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-6 py-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Profiles opened
                            </p>
                            <ul className="space-y-1">
                              {c.visits.map((v) => (
                                <li key={v.athleteId} className="flex items-center gap-2 text-sm">
                                  <span className="w-16 shrink-0 text-xs text-gray-500">{clockTime(v.lastViewedAt)}</span>
                                  <Link
                                    href={`/view-profile?id=${encodeURIComponent(v.athleteId)}`}
                                    target="_blank"
                                    className="font-medium text-blue-600 hover:underline"
                                  >
                                    {v.name}
                                  </Link>
                                  <span className="text-xs text-gray-500">
                                    {[cls(v.classYear), v.school].filter(Boolean).join(" · ")}
                                    {v.views > 1 ? ` · ${v.views} views` : ""}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
