"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HardLink } from "@/components/hard-link"
import {
  EXPENSE_STATUS_LABELS,
  displayExpenseType,
  type ExpenseRequestStatus,
} from "@/lib/athlete-expense-requests"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ExternalLink, Loader2, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type RequestRow = {
  id: string
  user_id: string
  user_email: string | null
  user_display_name: string
  athlete_id: string
  athlete_name: string
  expense_type: string
  amount_cents: number
  amount_approved_cents: number | null
  payment_method: string
  zelle_info: string | null
  venmo_info: string | null
  parent_notes: string | null
  document_url: string | null
  status: ExpenseRequestStatus
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
  paid_at: string | null
}

type Summary = {
  reviewQueueCents: number
  awaitingPayoutCents: number
  totalOpenCents: number
  byUser: { user_id: string; email: string; display_name: string; open_cents: number }[]
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

const STATUSES: ExpenseRequestStatus[] = ["pending", "under_review", "approved", "rejected", "paid"]

function badgeFor(s: ExpenseRequestStatus) {
  if (s === "approved") return "default" as const
  if (s === "paid") return "secondary" as const
  if (s === "rejected") return "destructive" as const
  return "outline" as const
}

export default function AdminExpenseRequestsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<RequestRow[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [tableLoading, setTableLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [active, setActive] = useState<RequestRow | null>(null)
  const [editStatus, setEditStatus] = useState<ExpenseRequestStatus | "">("")
  const [editApproved, setEditApproved] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setTableLoading(true)
    setLoadErr(null)
    try {
      const res = await fetch("/api/admin/expense-requests", { cache: "no-store", credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to load")
      }
      setRows(data.requests ?? [])
      setSummary(data.summary ?? null)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Error")
    } finally {
      setTableLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      window.location.href = `/auth/signin?redirectTo=${encodeURIComponent("/admin/expense-requests")}`
      return
    }
    if (!isAdmin) {
      window.location.href = "/"
      return
    }
    void load()
  }, [user, isAdmin, authLoading, load])

  function openRow(r: RequestRow) {
    setActive(r)
    setEditStatus(r.status)
    setEditNotes(r.admin_notes ?? "")
    if (r.amount_approved_cents != null) {
      setEditApproved((r.amount_approved_cents / 100).toFixed(2))
    } else {
      setEditApproved("")
    }
    setDialogOpen(true)
  }

  async function saveRow() {
    if (!active || !editStatus) return
    setSaving(true)
    try {
      const approvedCents =
        editApproved.trim() === ""
          ? null
          : Math.round(Number.parseFloat(editApproved.replace(/[$,]/g, "")) * 100)
      if (editApproved.trim() !== "" && (approvedCents == null || !Number.isFinite(approvedCents) || approvedCents <= 0)) {
        toast({ title: "Invalid approved amount", variant: "destructive" })
        setSaving(false)
        return
      }

      const res = await fetch(`/api/admin/expense-requests/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: editStatus,
          admin_notes: editNotes,
          amount_approved_cents: approvedCents,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Update failed")
      }
      toast({ title: "Saved" })
      setDialogOpen(false)
      setActive(null)
      void load()
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

  if (authLoading || !user || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-gray-50/80">
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <HardLink href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin home
              </HardLink>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Reimbursement requests</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={tableLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${tableLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>In review (pending + under review)</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(summary.reviewQueueCents)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Approved, awaiting payout</CardDescription>
                <CardTitle className="text-2xl text-amber-800">{formatMoney(summary.awaitingPayoutCents)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total open (all non-paid, non-rejected)</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(summary.totalOpenCents)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {summary && summary.byUser.filter((u) => u.open_cents > 0).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open amount by family</CardTitle>
              <CardDescription>Aggregated requested / approved open balance per account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-w-xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parent</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.byUser
                      .filter((u) => u.open_cents > 0)
                      .map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="text-sm">{u.display_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatMoney(u.open_cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All reimbursement requests</CardTitle>
            <CardDescription>Update status, approved amount, and internal notes. Mark Paid when funds are sent.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadErr && <p className="text-sm text-destructive mb-4">{loadErr}</p>}
            {tableLoading && !rows ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </p>
            ) : (rows ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No reimbursement requests yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rows ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm max-w-[160px]">
                          <div className="font-medium truncate">{r.user_display_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.user_email ?? "—"}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.athlete_name}</TableCell>
                        <TableCell className="text-sm max-w-[140px]">{displayExpenseType(r.expense_type)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatMoney(r.amount_cents)}
                          {r.amount_approved_cents != null && (
                            <div className="text-xs text-muted-foreground">Appr: {formatMoney(r.amount_approved_cents)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px]">
                          {r.payment_method === "zelle" && r.zelle_info ? (
                            <span>Zelle: {r.zelle_info}</span>
                          ) : r.payment_method === "venmo" && r.venmo_info ? (
                            <span>Venmo: {r.venmo_info}</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeFor(r.status)} className="font-normal">
                            {EXPENSE_STATUS_LABELS[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Button size="sm" variant="outline" onClick={() => openRow(r)}>
                              Manage
                            </Button>
                            {r.document_url && (
                              <a
                                href={r.document_url}
                                className="text-xs text-primary flex items-center gap-1"
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Document
                              </a>
                            )}
                          </div>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reimbursement request</DialogTitle>
            <DialogDescription>
              {active ? (
                <>
                  {active.user_display_name} — {active.athlete_name} — {formatMoney(active.amount_cents)} requested
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              {active.parent_notes && (
                <div>
                  <span className="text-muted-foreground">Parent notes: </span>
                  {active.parent_notes}
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editStatus || undefined}
                  onValueChange={(v) => setEditStatus(v as ExpenseRequestStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {EXPENSE_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appr">Approved amount (USD)</Label>
                <Input
                  id="appr"
                  placeholder="Leave blank to use requested amount when approving"
                  value={editApproved}
                  onChange={(e) => setEditApproved(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Stored in cents; overrides requested amount for payout tracking.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adnotes">Admin notes (visible to parent)</Label>
                <Textarea id="adnotes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveRow()} disabled={saving || !editStatus}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
