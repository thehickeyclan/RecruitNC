"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, GraduationCap, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Visit = { athleteId: string; name: string; classYear: number | null; school: string | null; views: number; lastViewedAt: string }
type Coach = {
  userId: string
  name: string
  email: string
  verified: boolean
  reviewed: boolean
  lastLoginAt: string | null
  lastActiveAt: string | null
  profileViews: number
  uniqueAthletes: number
  visits: Visit[]
}
type Program = { program: string; coaches: Coach[]; profileViews: number; uniqueAthletes: number; lastActiveAt: string | null }
type Payload = {
  summary: { programs: number; activePrograms: number; coaches: number; activeCoaches: number; profileViews: number; uniqueAthletes: number }
  programs: Program[]
  mostViewed: Array<{ athleteId: string; name: string; classYear: number | null; views: number; programs: string[] }>
}

function ago(iso: string | null): string {
  if (!iso) return "Never"
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 60) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

const cls = (y: number | null) => (y ? `'${String(y).slice(-2)}` : "")

/**
 * College programs ranked by how much their coaches use RecruitNC: every coach, when they last
 * signed in, and every athlete profile they opened. Follows the page's time range.
 */
export function CollegeProgramLeaderboard({ range }: { range: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openProgram, setOpenProgram] = useState<string | null>(null)
  const [openCoach, setOpenCoach] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/admin/coach-activity?range=${encodeURIComponent(range)}`, { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body?.error || "Could not load coach activity")
        if (!cancelled) setData(body as Payload)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load coach activity"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [range])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          College Program Leaderboard
        </CardTitle>
        <CardDescription>
          College programs ranked by athlete profiles their coaches opened. Click a program for its coaches and when
          they last signed in; click a coach for every profile they visited.
        </CardDescription>
        {data ? (
          <p className="text-sm text-gray-600">
            <strong>{data.summary.activePrograms}</strong> of {data.summary.programs} programs active ·{" "}
            <strong>{data.summary.activeCoaches}</strong> of {data.summary.coaches} coaches ·{" "}
            <strong>{data.summary.profileViews.toLocaleString()}</strong> profile views ·{" "}
            <strong>{data.summary.uniqueAthletes}</strong> athletes viewed
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading coach activity…
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-red-600">{error}</p>
        ) : !data || data.programs.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">No college coaches yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="w-10 px-3 py-2">#</th>
                    <th className="px-3 py-2">Program</th>
                    <th className="px-3 py-2 text-right">Coaches</th>
                    <th className="px-3 py-2 text-right">Profile views</th>
                    <th className="px-3 py-2 text-right">Athletes</th>
                    <th className="px-3 py-2">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.programs.map((p, i) => {
                    const open = openProgram === p.program
                    return (
                      <Fragment key={p.program}>
                        <tr
                          className="cursor-pointer border-t hover:bg-gray-50"
                          onClick={() => setOpenProgram(open ? null : p.program)}
                        >
                          <td className="px-3 py-2 font-semibold text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">
                            <span className="inline-flex items-center gap-1">
                              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              {p.program}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.coaches.length}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{p.profileViews}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.uniqueAthletes}</td>
                          <td className="px-3 py-2 text-gray-600">{ago(p.lastActiveAt)}</td>
                        </tr>
                        {open
                          ? p.coaches.map((c) => {
                              const coachOpen = openCoach === c.userId
                              return (
                                <Fragment key={c.userId}>
                                  <tr
                                    className="cursor-pointer border-t bg-gray-50/60 hover:bg-gray-100"
                                    onClick={() => setOpenCoach(coachOpen ? null : c.userId)}
                                  >
                                    <td />
                                    <td className="px-3 py-2 pl-9">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{c.name}</span>
                                        {!c.verified ? (
                                          <Badge variant="outline" className="border-red-300 text-red-700">No access</Badge>
                                        ) : !c.reviewed ? (
                                          <Badge className="bg-amber-500">Unreviewed</Badge>
                                        ) : null}
                                      </div>
                                      <div className="text-xs text-gray-500">{c.email}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs text-gray-500">Last login</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{c.profileViews}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{c.uniqueAthletes}</td>
                                    <td className="px-3 py-2 text-gray-600">{ago(c.lastLoginAt)}</td>
                                  </tr>
                                  {coachOpen ? (
                                    <tr className="border-t bg-white">
                                      <td />
                                      <td colSpan={5} className="px-3 py-3 pl-9">
                                        {c.visits.length === 0 ? (
                                          <p className="text-xs text-gray-500">No athlete profiles visited in this range.</p>
                                        ) : (
                                          <ul className="grid gap-1 sm:grid-cols-2">
                                            {c.visits.map((v) => (
                                              <li key={v.athleteId} className="flex items-baseline justify-between gap-3 text-sm">
                                                <Link
                                                  href={`/athletes/${v.athleteId}`}
                                                  target="_blank"
                                                  className="truncate text-blue-600 hover:underline"
                                                >
                                                  {v.name} {cls(v.classYear)}
                                                  {v.school ? <span className="text-gray-500"> · {v.school}</span> : null}
                                                </Link>
                                                <span className="shrink-0 text-xs text-gray-500">
                                                  {v.views > 1 ? `${v.views}× · ` : ""}
                                                  {ago(v.lastViewedAt)}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </td>
                                    </tr>
                                  ) : null}
                                </Fragment>
                              )
                            })
                          : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {data.mostViewed.length ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Athletes the most programs are looking at</h3>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {data.mostViewed.map((m) => (
                    <li key={m.athleteId} className="flex items-baseline justify-between gap-3 rounded border px-3 py-2 text-sm">
                      <Link href={`/athletes/${m.athleteId}`} target="_blank" className="truncate text-blue-600 hover:underline">
                        {m.name} {cls(m.classYear)}
                      </Link>
                      <span className="shrink-0 text-xs text-gray-500" title={m.programs.join(", ")}>
                        {m.programs.length} {m.programs.length === 1 ? "program" : "programs"} · {m.views} views
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
