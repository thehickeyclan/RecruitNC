"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HardLink } from "@/components/hard-link"
import { Loader2, RefreshCw, ArrowLeft, Check, Users, Eye } from "lucide-react"

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

function formatSubmittedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function TocNominationsAdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<Nomination[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableMissing, setTableMissing] = useState(false)
  const [setupHint, setSetupHint] = useState<string | null>(null)
  const [openNote, setOpenNote] = useState<Nomination | null>(null)

  const newCount = useMemo(() => rows.filter((r) => !r.reviewed).length, [rows])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/nominations", {
        cache: "no-store",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Failed to load (${res.status})`)
      }
      setRows(data.nominations ?? [])
      setTableMissing(Boolean(data.tableMissing))
      setSetupHint(typeof data.setupHint === "string" ? data.setupHint : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      window.location.href = `/auth/signin?returnTo=${encodeURIComponent("/admin/toc/nominations")}`
      return
    }
    if (!isAdmin) {
      window.location.href = "/"
      return
    }
    void load()
  }, [user, isAdmin, authLoading, load])

  const markReviewed = async (id: string) => {
    const res = await fetch("/api/admin/toc/nominations", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reviewed: true }),
    })
    if (res.ok) void load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#003366] text-white py-8">
        <div className="container mx-auto px-4">
          <HardLink href="/admin/toc" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 text-sm">
            <ArrowLeft className="h-4 w-4" />
            TOC admin
          </HardLink>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Users className="h-8 w-8 text-[#D3B574]" />
                TOC prospect interest
              </h1>
              <p className="text-blue-200 mt-1">
                Athlete interest forms from the public Tournament of Champions page.
              </p>
            </div>
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <AdminHeader />

        {tableMissing ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-900">Database table not found</CardTitle>
              <CardDescription className="text-amber-800">
                {setupHint ??
                  "Run docs/sql/toc-phase-1.sql.txt in Supabase SQL Editor to create toc_nominations."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="pt-6 text-sm text-red-800">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-gray-600">Total submissions</p>
              <p className="text-3xl font-bold text-[#003366]">{rows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-gray-600">New (unreviewed)</p>
              <p className="text-3xl font-bold text-[#C8102E]">{newCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-gray-600">Public form</p>
              <HardLink href="/tournament-of-champions#athlete-interest" className="text-sm font-medium text-[#B31B1B]">
                View on TOC page →
              </HardLink>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Athlete interest forms</CardTitle>
            <CardDescription>
              {loading && rows.length === 0
                ? "Loading submissions…"
                : rows.length === 0
                  ? "No submissions yet — they appear here when wrestlers submit the form on /tournament-of-champions."
                  : `${rows.length} submission${rows.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading && rows.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nothing here yet. Share the{" "}
                <HardLink href="/tournament-of-champions#athlete-interest" className="text-[#B31B1B] font-medium">
                  athlete interest form
                </HardLink>{" "}
                on the public TOC page to collect prospects.
              </p>
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
                    <TableHead>Notes</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">{r.athlete_name}</TableCell>
                      <TableCell className="text-sm">{r.submitted_by_email}</TableCell>
                      <TableCell>{r.school ?? "—"}</TableCell>
                      <TableCell>{r.club ?? "—"}</TableCell>
                      <TableCell>{r.weight_class ?? "—"}</TableCell>
                      <TableCell>{r.graduation_year ?? "—"}</TableCell>
                      <TableCell className="min-w-[260px] max-w-[380px] align-top">
                        {r.notes ? (
                          <div className="space-y-2">
                            <p className="line-clamp-2 whitespace-normal text-sm leading-relaxed text-muted-foreground">
                              {r.notes}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-auto px-0 text-[#B31B1B] hover:bg-transparent hover:text-[#8f1515]"
                              onClick={() => setOpenNote(r)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View full note
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatSubmittedAt(r.created_at)}</TableCell>
                      <TableCell>
                        {r.reviewed ? <Badge variant="secondary">Reviewed</Badge> : <Badge>New</Badge>}
                      </TableCell>
                      <TableCell>
                        {!r.reviewed ? (
                          <Button size="sm" variant="outline" onClick={() => void markReviewed(r.id)}>
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

      <Dialog open={Boolean(openNote)} onOpenChange={(open) => !open && setOpenNote(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{openNote?.athlete_name ?? "Nomination note"}</DialogTitle>
            <DialogDescription>
              {openNote ? (
                <>
                  {openNote.school ?? "School TBD"}
                  {openNote.weight_class ? ` · ${openNote.weight_class} lbs` : ""}
                  {openNote.graduation_year ? ` · Class of ${openNote.graduation_year}` : ""}
                  {" · "}
                  Submitted {formatSubmittedAt(openNote.created_at)} by {openNote.submitted_by_email}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {openNote?.notes ?? "No notes submitted."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
