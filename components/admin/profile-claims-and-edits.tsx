"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Week = { weekStart: string; label: string; count: number }
type Payload = {
  totalClaimed: number
  claimsByWeek: Week[]
  editsByWeek: Array<Week & { profiles: number }>
}

const NAVY = "#03154C"
const GOLD = "#D3B574"

/**
 * Are families taking up their profiles, and do they come back to them?
 *
 * Claims are the first question and edits the second: a claim is a family arriving, an edit is
 * a family using the thing. Both by week, because the answer that matters is whether a push
 * (an Instagram campaign, a coach email) moved the number in the week it went out.
 *
 * Always the last twelve weeks, whatever range the page is set to - a weekly chart of "today"
 * is one bar.
 */
export function ProfileClaimsAndEdits() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/analytics/profile-claims-edits", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : r.json().then((b) => Promise.reject(new Error(b?.error ?? "Could not load claims and edits")))))
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-red-600">Claims and edits: {error}</CardContent>
      </Card>
    )
  }
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center p-6 text-sm text-gray-600">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading claims and edits…
        </CardContent>
      </Card>
    )
  }

  const thisWeekClaims = data.claimsByWeek.at(-1)?.count ?? 0
  const thisWeekEdits = data.editsByWeek.at(-1)
  const weekOf = (label: unknown) => `Week of ${String(label)}`

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardDescription>Profiles claimed</CardDescription>
          <CardTitle className="text-3xl">{data.totalClaimed.toLocaleString()}</CardTitle>
          <p className="text-sm text-gray-600">{thisWeekClaims.toLocaleString()} so far this week. New claims by week, last 12 weeks.</p>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.claimsByWeek} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip labelFormatter={weekOf} formatter={(v) => [Number(v), "Profiles claimed"]} />
                <Bar dataKey="count" fill={NAVY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Profile edits this week</CardDescription>
          <CardTitle className="text-3xl">{(thisWeekEdits?.count ?? 0).toLocaleString()}</CardTitle>
          <p className="text-sm text-gray-600">
            Across {thisWeekEdits?.profiles ?? 0} {thisWeekEdits?.profiles === 1 ? "profile" : "profiles"}. One edit is one field a family changed. By week, last 12 weeks.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.editsByWeek} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip
                  labelFormatter={weekOf}
                  formatter={(v, _n, item) => [
                    `${Number(v)} across ${(item.payload as { profiles?: number } | undefined)?.profiles ?? 0} profiles`,
                    "Edits",
                  ]}
                />
                <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
