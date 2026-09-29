"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Download, FileText, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Row = {
  athleteId: string
  athleteName: string
  classYear: number | null
  viewerId: string
  viewerName: string
  viewerEmail: string | null
  institution: string | null
  role: string | null
  staff: boolean
  tier: string | null
  opens: number
  downloads: number
  lastAt: string
}
type Payload = {
  summary: { opens: number; downloads: number; people: number; athletes: number; hiddenStaffRows: number }
  rows: Row[]
}

const roleLabel = (role: string | null) =>
  !role ? "" : role.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

/** Who opened and downloaded scouting reports, on which wrestlers. Follows the page's range. */
export function ScoutingReportActivity({ range }: { range: string }) {
  const [includeStaff, setIncludeStaff] = useState(false)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/admin/scouting-report-activity?range=${encodeURIComponent(range)}${includeStaff ? "&staff=1" : ""}`, { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body?.error || "Could not load scouting report activity")
        if (!cancelled) setData(body as Payload)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load scouting report activity"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [range, includeStaff])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Scouting Reports
        </CardTitle>
        <CardDescription>
          Who opened each wrestler&apos;s scouting report, and who downloaded it (printed or saved as a PDF). Downloads are
          recorded from 29 September 2026.
        </CardDescription>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {data ? (
            <p className="text-sm text-gray-600">
              <strong>{data.summary.opens}</strong> opens · <strong>{data.summary.downloads}</strong> downloads ·{" "}
              <strong>{data.summary.people}</strong> {data.summary.people === 1 ? "person" : "people"} ·{" "}
              <strong>{data.summary.athletes}</strong> wrestlers
            </p>
          ) : (
            <span />
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={includeStaff} onChange={(e) => setIncludeStaff(e.target.checked)} />
            Show staff
            {!includeStaff && data?.summary.hiddenStaffRows ? (
              <span className="text-xs text-gray-400">({data.summary.hiddenStaffRows} hidden)</span>
            ) : null}
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-red-600">{error}</p>
        ) : !data || data.rows.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">
            No scouting reports opened in this range{includeStaff ? "" : " outside staff"}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Who</th>
                  <th className="px-3 py-2">Wrestler</th>
                  <th className="px-3 py-2 text-right">Opened</th>
                  <th className="px-3 py-2 text-right">Downloaded</th>
                  <th className="px-3 py-2">Last</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={`${r.athleteId}:${r.viewerId}`} className="border-t align-top">
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.viewerName}</span>
                        {r.staff ? <Badge variant="outline">Staff</Badge> : null}
                        {r.tier === "full" ? <Badge className="bg-green-600">Full report</Badge> : null}
                      </div>
                      <div className="text-xs text-gray-500">
                        {[r.institution, roleLabel(r.role), r.viewerEmail].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/athletes/${r.athleteId}`} target="_blank" className="text-blue-600 hover:underline">
                        {r.athleteName}
                      </Link>
                      {r.classYear ? <span className="text-gray-500"> &apos;{String(r.classYear).slice(-2)}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.opens || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.downloads ? (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Download className="h-3.5 w-3.5" />
                          {r.downloads}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{new Date(r.lastAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
