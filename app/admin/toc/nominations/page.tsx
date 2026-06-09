"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCw, ArrowLeft, Check } from "lucide-react"

type Nomination = {
  id: string
  athlete_name: string
  school: string | null
  club?: string | null
  weight_class: number | null
  graduation_year: number | null
  submitted_by_email: string
  notes: string | null
  reviewed: boolean
  created_at: string
}

export default function TocNominationsAdminPage() {
  const [rows, setRows] = useState<Nomination[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/nominations")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setRows(data.nominations ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const markReviewed = async (id: string, reviewed: boolean) => {
    const res = await fetch("/api/admin/toc/nominations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reviewed }),
    })
    if (res.ok) void load()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/toc">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">TOC prospect interest</h1>
            <p className="text-sm text-muted-foreground">{rows.length} athlete submissions</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Athlete interest forms</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading && rows.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Wt</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.athlete_name}</TableCell>
                    <TableCell className="text-sm">{r.submitted_by_email}</TableCell>
                    <TableCell>{r.school ?? "—"}</TableCell>
                    <TableCell>{r.club ?? "—"}</TableCell>
                    <TableCell>{r.weight_class ?? "—"}</TableCell>
                    <TableCell>{r.graduation_year ?? "—"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {r.reviewed ? (
                        <Badge variant="secondary">Reviewed</Badge>
                      ) : (
                        <Badge>New</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!r.reviewed ? (
                        <Button size="sm" variant="outline" onClick={() => void markReviewed(r.id, true)}>
                          <Check className="h-3 w-3 mr-1" />
                          Mark reviewed
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
