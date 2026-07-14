"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react"
import { TOC_MEDIA_REQUEST_TYPES } from "@/lib/toc/constants"

type MediaRequest = {
  id: string
  outlet: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  media_type: string | null
  message: string | null
  status: string
  created_at: string
}

const STATUSES = ["new", "contacted", "approved", "declined"] as const

const mediaTypeLabel = (value: string | null) =>
  TOC_MEDIA_REQUEST_TYPES.find((t) => t.value === value)?.label ?? value ?? "—"

export default function TocMediaAdminPage() {
  const [rows, setRows] = useState<MediaRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/media-requests")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setRows(data.requests ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/admin/toc/media-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
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
            <h1 className="text-2xl font-bold">TOC Media Requests</h1>
            <p className="text-sm text-muted-foreground">{rows.length} requests</p>
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
          <CardTitle className="text-base">Media credentials & coverage</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading && rows.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No media requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.outlet}</div>
                      {r.message ? <div className="text-xs mt-1 max-w-xs text-muted-foreground">{r.message}</div> : null}
                    </TableCell>
                    <TableCell>
                      <div>{r.contact_name}</div>
                      <div className="text-xs text-muted-foreground">{r.contact_email}</div>
                      {r.contact_phone ? (
                        <div className="text-xs text-muted-foreground">{r.contact_phone}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{mediaTypeLabel(r.media_type)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => void updateStatus(r.id, v)}>
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
