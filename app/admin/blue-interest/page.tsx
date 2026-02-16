"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Loader2, Users, ArrowLeft } from "lucide-react"

const ACHIEVEMENT_LABELS: Record<string, string> = {
  all_american: "All American",
  state_champion: "State Champion",
  state_placer: "State Placer",
  state_qualifier: "State Qualifier",
  na: "N/A",
}

type Submission = {
  id: string
  first_name: string
  last_name: string
  cell_phone: string
  graduation_year: string
  highest_achievement: string
  weight_class: string | null
  high_school: string | null
  club: string | null
  comments: string | null
  created_at: string
}

export default function BlueInterestPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])

  const loadSubmissions = useCallback(async (retryCount = 0) => {
    const maxRetries = 2
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/blue-express-interest", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      })
      const data = await res.json()

      // Retry on auth or server errors (handles cookie/session timing)
      const shouldRetry =
        retryCount < maxRetries &&
        (res.status === 401 || res.status === 403 || res.status === 500 || (res.status === 200 && !data.ok))
      if (shouldRetry) {
        await new Promise((r) => setTimeout(r, 600 + retryCount * 800))
        return loadSubmissions(retryCount + 1)
      }

      if (!data.ok) {
        throw new Error(data.error || "Failed to load")
      }
      const list = Array.isArray(data.submissions) ? data.submissions : []
      setSubmissions(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Brief delay so auth cookies propagate after navigation
    const t = setTimeout(() => loadSubmissions(), 80)
    return () => clearTimeout(t)
  }, [loadSubmissions])

  // Retry on tab focus if previous load failed (fixes intermittent auth timing)
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible" && error && !loading) {
        loadSubmissions()
      }
    }
    window.addEventListener("visibilitychange", onFocus)
    return () => window.removeEventListener("visibilitychange", onFocus)
  }, [loadSubmissions, error, loading])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#13294B] flex items-center gap-2">
                <Users className="h-7 w-7 text-[#D3B574]" />
                Blue Interest Forms
              </h1>
              <p className="text-sm text-gray-600">
                Express interest submissions from the Blue page (State Qualifier Interest form)
              </p>
            </div>
          </div>
          <Button onClick={loadSubmissions} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="mb-4 text-sm text-red-600">{error}</p>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
              </div>
            ) : submissions.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No submissions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>High school</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Cell</TableHead>
                      <TableHead>Grad year</TableHead>
                      <TableHead>Highest achievement</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.first_name} {row.last_name}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate" title={row.high_school ?? ""}>
                          {row.high_school || "—"}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate" title={row.club ?? ""}>
                          {row.club || "—"}
                        </TableCell>
                        <TableCell>{row.weight_class ? `${row.weight_class} lbs` : "—"}</TableCell>
                        <TableCell>{row.cell_phone}</TableCell>
                        <TableCell>{row.graduation_year}</TableCell>
                        <TableCell>
                          {ACHIEVEMENT_LABELS[row.highest_achievement] ?? row.highest_achievement}
                        </TableCell>
                        <TableCell className="min-w-[200px] max-w-[400px] whitespace-normal text-sm align-top">
                          {row.comments || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
