"use client"

/**
 * College interest — which programs are looking at which wrestlers.
 *
 * Card analytics answers "who is getting viewed"; this answers "by whom", which is the part
 * that tells us which athletes are drawing real recruiting attention and which programs are
 * working our roster. Programs are named, coaches are not: see lib/admin-college-interest.ts.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, GraduationCap, Eye, Users, RefreshCw, ChevronDown, ChevronRight } from "lucide-react"
import type { CollegeInterestReport } from "@/lib/admin-college-interest"

const RANGE_OPTIONS = [
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 3 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
] as const

function when(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

export default function CollegeInterestPage() {
  const [range, setRange] = useState<string>("last90")
  const [report, setReport] = useState<CollegeInterestReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics/college-interest?range=${range}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not load college interest")
      setReport(data as CollegeInterestReport)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load college interest")
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = (college: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(college)) next.delete(college)
      else next.add(college)
      return next
    })

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">College interest</h1>
          <p className="text-sm text-muted-foreground">
            Which college programs viewed which athletes. Programs are named from the coach&apos;s school email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/card-analytics">Card analytics</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {loading && !report ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading college views…
          </CardContent>
        </Card>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <GraduationCap className="h-7 w-7 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{report.totals.colleges}</div>
                  <div className="text-xs text-muted-foreground">Programs</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-7 w-7 text-emerald-600" />
                <div>
                  <div className="text-2xl font-bold">{report.totals.coaches}</div>
                  <div className="text-xs text-muted-foreground">Coaches</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Eye className="h-7 w-7 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{report.totals.views}</div>
                  <div className="text-xs text-muted-foreground">Profile views</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-7 w-7 text-amber-600" />
                <div>
                  <div className="text-2xl font-bold">{report.totals.athletes}</div>
                  <div className="text-xs text-muted-foreground">Athletes looked at</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>By program</CardTitle>
              <CardDescription>Most recent look first. Click a program to see who they looked at.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.byCollege.length === 0 ? (
                <p className="text-sm text-muted-foreground">No college views in this range.</p>
              ) : (
                report.byCollege.map((college) => {
                  const expanded = open.has(college.college)
                  return (
                    <div key={college.college} className="rounded-md border">
                      <button
                        type="button"
                        onClick={() => toggle(college.college)}
                        className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/50"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {college.college}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{college.athletes.length} athletes</Badge>
                          <Badge variant="secondary">{college.views} views</Badge>
                          <span>{when(college.lastViewedAt)}</span>
                        </span>
                      </button>
                      {expanded && (
                        <ul className="divide-y border-t text-sm">
                          {college.athletes.map((athlete) => (
                            <li key={athlete.athleteId} className="flex items-center justify-between gap-3 px-4 py-2">
                              <Link href={`/unified-profile/${athlete.athleteId}`} className="hover:underline">
                                {athlete.athleteName}
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                {athlete.views} {athlete.views === 1 ? "view" : "views"} · {when(athlete.lastViewedAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By athlete</CardTitle>
              <CardDescription>
                Ranked by how many different programs looked — two programs once each is more interest than one program
                three times.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.byAthlete.length === 0 ? (
                <p className="text-sm text-muted-foreground">No college views in this range.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {report.byAthlete.map((athlete) => (
                    <li key={athlete.athleteId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <Link href={`/unified-profile/${athlete.athleteId}`} className="font-medium hover:underline">
                        {athlete.athleteName}
                      </Link>
                      <span className="flex flex-wrap items-center gap-1">
                        {athlete.colleges.map((college) => (
                          <Badge key={college.college} variant="outline" className="font-normal">
                            {college.college}
                            {college.views > 1 ? ` ×${college.views}` : ""}
                          </Badge>
                        ))}
                        <span className="ml-1 text-xs text-muted-foreground">{when(athlete.lastViewedAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
