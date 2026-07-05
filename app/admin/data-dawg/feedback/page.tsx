"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { HardLink } from "@/components/hard-link"
import {
  DATA_DAWG_FEEDBACK_STATUS_LABELS,
  type DataDawgFeedbackRow,
  type DataDawgFeedbackStatus,
} from "@/lib/data-dawg-feedback"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Bot, Check, Loader2, RefreshCw, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function badgeVariant(status: DataDawgFeedbackStatus) {
  if (status === "approved") return "default" as const
  if (status === "dismissed") return "secondary" as const
  return "outline" as const
}

function formatWhen(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

export default function AdminDataDawgFeedbackPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<DataDawgFeedbackRow[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [tableMissing, setTableMissing] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | DataDawgFeedbackStatus>("pending")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [active, setActive] = useState<DataDawgFeedbackRow | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadErr(null)
    try {
      const qs = statusFilter === "all" ? "" : `?status=${statusFilter}`
      const res = await fetch(`/api/admin/data-dawg/feedback${qs}`, {
        cache: "no-store",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to load")
      }
      setItems(data.items ?? [])
      setPendingCount(typeof data.pendingCount === "number" ? data.pendingCount : 0)
      setTableMissing(Boolean(data.tableMissing))
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      window.location.href = `/auth/signin?redirectTo=${encodeURIComponent("/admin/data-dawg/feedback")}`
      return
    }
    if (!isAdmin) {
      window.location.href = "/"
      return
    }
    void load()
  }, [user, isAdmin, authLoading, load])

  const pendingCountDisplay = pendingCount

  const openReview = (row: DataDawgFeedbackRow) => {
    setActive(row)
    setAdminNotes(row.admin_notes ?? "")
    setDialogOpen(true)
  }

  async function saveReview(status: DataDawgFeedbackStatus) {
    if (!active) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/data-dawg/feedback/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, adminNotes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Update failed")
      }
      setItems((prev) => prev.map((row) => (row.id === active.id ? data.item : row)))
      if (status !== "pending") {
        setPendingCount((c) => Math.max(0, c - (active.status === "pending" ? 1 : 0)))
      }
      toast({
        title: status === "approved" ? "Marked approved" : status === "dismissed" ? "Dismissed" : "Updated",
      })
      setDialogOpen(false)
      setActive(null)
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#003366] text-white py-8">
        <div className="container mx-auto px-4">
          <HardLink href="/admin" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 text-sm">
            <ArrowLeft className="h-4 w-4" />
            Admin dashboard
          </HardLink>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Bot className="h-8 w-8 text-[#D3B574]" />
                Data Dawg feedback
              </h1>
              <p className="text-blue-200 mt-1">
                Review &quot;Hey Data Dawg&quot; reports when users flag incorrect answers.
              </p>
            </div>
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AdminHeader />

        {tableMissing ? (
          <Card className="mb-6 border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-900">Database table not found</CardTitle>
              <CardDescription className="text-amber-800">
                Run <code className="text-xs">scripts/data-dawg-feedback.sql</code> in Supabase SQL Editor to enable
                feedback storage.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-gray-600">Pending review</p>
              <p className="text-3xl font-bold text-[#C8102E]">{pendingCountDisplay}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-gray-600">Showing</p>
              <p className="text-3xl font-bold text-[#003366]">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center justify-center h-full">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending only</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {loadErr ? <p className="text-destructive mb-4">{loadErr}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Newest first. Approve when you&apos;ll fix the underlying data; dismiss if not actionable.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No feedback reports for this filter.</p>
            ) : (
              <div className="space-y-4">
                {items.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border p-4 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="space-y-1">
                        <Badge variant={badgeVariant(row.status)}>{DATA_DAWG_FEEDBACK_STATUS_LABELS[row.status]}</Badge>
                        <p className="text-xs text-gray-500">{formatWhen(row.created_at)}</p>
                      </div>
                      <Button size="sm" onClick={() => openReview(row)}>
                        Review
                      </Button>
                    </div>
                    <p className="font-medium text-[#003366] mb-2">{row.correction_notes}</p>
                    {row.user_query ? (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Question:</span> {row.user_query}
                      </p>
                    ) : null}
                    {row.submitter_name || row.submitter_email ? (
                      <p className="text-xs text-gray-500">
                        From: {[row.submitter_name, row.submitter_email].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review feedback</DialogTitle>
            <DialogDescription>
              {active ? formatWhen(active.created_at) : ""}
            </DialogDescription>
          </DialogHeader>

          {active ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500">User correction</Label>
                <p className="mt-1 font-medium">{active.correction_notes}</p>
              </div>
              {active.user_query ? (
                <div>
                  <Label className="text-xs text-gray-500">Question asked</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{active.user_query}</p>
                </div>
              ) : null}
              {active.assistant_response ? (
                <div>
                  <Label className="text-xs text-gray-500">Data Dawg answer</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap bg-gray-50 rounded-md p-3 border max-h-48 overflow-y-auto">
                    {active.assistant_response}
                  </p>
                </div>
              ) : null}
              {active.page_url ? (
                <p className="text-xs">
                  <a href={active.page_url} className="text-[#003366] underline break-all">
                    {active.page_url}
                  </a>
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin notes</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="What you changed, or why dismissed…"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={saving || !active} onClick={() => void saveReview("dismissed")}>
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
              <Button disabled={saving || !active} onClick={() => void saveReview("approved")}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
