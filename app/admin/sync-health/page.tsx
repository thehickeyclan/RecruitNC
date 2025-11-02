"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Report = {
  headline: {
    colleges_with_division: number
    total_colleges: number
    total_athletes: number
    athletes_with_division: number
  }
  coverage: {
    with_college: number
    matched_cnt: number
    matched_percent: number
  }
  non_canonical: Array<{ id: number; name: string | null; college: string | null; division: string | null }>
  mismatches: Array<{
    athlete_id: number
    name: string | null
    college: string | null
    athlete_division: string | null
    mapped_division: string | null
  }>
  top_unmatched: Array<{ norm_college: string | null; cnt: number; example_raw: string | null }>
}

export default function SyncHealthPage() {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/division-sync-health", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to load report")
      } else {
        setReport(json.report)
      }
    } catch (e: any) {
      setError(e?.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  async function install() {
    setInstalling(true)
    try {
      const res = await fetch("/api/run-script/create-sync-health-function", { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to install function")
      } else {
        // Re-load the report after install
        await load()
      }
    } catch (e: any) {
      setError(e?.message || "Unknown error during install")
    } finally {
      setInstalling(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const headline = report?.headline
  const coverage = report?.coverage

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Division Sync Health</h1>
        <div className="flex space-x-2">
          <Button onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          {!report && !error && (
            <Button onClick={install} variant="secondary" disabled={installing}>
              {installing ? "Installing…" : "Install Function"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Colleges with Division" value={headline?.colleges_with_division} />
        <StatCard title="Total Colleges" value={headline?.total_colleges} />
        <StatCard title="Athletes with Division" value={headline?.athletes_with_division} />
        <StatCard title="Total Athletes" value={headline?.total_athletes} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coverage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <StatMini title="With College" value={coverage?.with_college} />
          <StatMini title="Matched Count" value={coverage?.matched_cnt} />
          <StatMini title="Matched %" value={coverage ? `${coverage.matched_percent}%` : undefined} />
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              If function is missing, run scripts/create-sync-health-function.sql in Supabase SQL Editor.
            </p>
            <Button onClick={install} disabled={installing} className="mt-4">
              {installing ? "Installing…" : "Install Function"}
            </Button>
          </CardContent>
        </Card>
      )}

      <DataTable
        title="Non-Canonical Divisions (max 100)"
        rows={report?.non_canonical}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "college", label: "College" },
          { key: "division", label: "Division" },
        ]}
        empty="All divisions are canonical. Great!"
      />

      <DataTable
        title="Division Mismatches (max 100)"
        rows={report?.mismatches}
        columns={[
          { key: "athlete_id", label: "Athlete ID" },
          { key: "name", label: "Name" },
          { key: "college", label: "College" },
          { key: "athlete_division", label: "Current" },
          { key: "mapped_division", label: "Mapped" },
        ]}
        empty="No mismatches detected."
      />

      <DataTable
        title="Top Unmatched Colleges (max 50)"
        rows={report?.top_unmatched}
        columns={[
          { key: "norm_college", label: "Normalized College" },
          { key: "cnt", label: "Count" },
          { key: "example_raw", label: "Example Raw" },
        ]}
        empty="All colleges are matched to mappings/aliases."
      />
    </main>
  )
}

function StatCard({ title, value }: { title: string; value?: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value ?? "—"}</div>
      </CardContent>
    </Card>
  )
}

function StatMini({ title, value }: { title: string; value?: number | string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-lg font-medium">{value ?? "—"}</div>
    </div>
  )
}

type Column = { key: string; label: string }
function DataTable({
  title,
  rows,
  columns,
  empty,
}: {
  title: string
  rows?: Array<Record<string, any>>
  columns: Column[]
  empty: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {!rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-left font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  {columns.map((c) => (
                    <td key={c.key} className="px-2 py-2 align-top">
                      {String(r?.[c.key] ?? "") || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
