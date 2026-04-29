"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { AlertTriangle, ArrowLeft, Download, ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react"
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
  updated_at: string
  reviewed_at: string | null
  paid_at: string | null
}

type Summary = {
  reviewQueueCents: number
  awaitingPayoutCents: number
  totalOpenCents: number
  byUser: { user_id: string; email: string; display_name: string; open_cents: number }[]
}

type ParentAthleteRollup = {
  campaign: string
  lookbackDays: number
  athletes: {
    athleteId: string
    name: string
    fundraisingCode: string | null
    raisedCents: number
    giftCount: number
    raceSignupCount: number
    reimbursementsPaidWindowCents: number
    reimbursementsPaidAllTimeCents: number
    guildAllocationsCents: number
    netAfterReimbursementsWindowCents: number
    remainingNotionalCents: number
    codeUnavailable?: boolean
  }[]
  totalsForLinkedAthletes: {
    raisedCents: number
    reimbursementsPaidWindowCents: number
    reimbursementsPaidAllTimeCents: number
    guildAllocationsCents: number
    remainingNotionalCents: number
  }
  globalReimbursementsPaidAllTimeCents: number
  /** Full Fayetteville Stripe window gross — ties to Admin → Fundraising. */
  fayettevilleGross120dCents: number
  raisedOutsideLinkedAthleteRows120dCents: number
  reimbursementsPaidAllTimeOutsideLinkedRowsCents: number
  ncUnitedCommunityFund120dCents: number
  raisedAthleteAttributedOutsideParentLinks120dCents: number
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
  const [parentAthleteRollup, setParentAthleteRollup] = useState<ParentAthleteRollup | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [tableLoading, setTableLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [active, setActive] = useState<RequestRow | null>(null)
  const [editStatus, setEditStatus] = useState<ExpenseRequestStatus | "">("")
  const [editApproved, setEditApproved] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [tableFilter, setTableFilter] = useState<"all" | "paid" | "missing_receipt">("all")
  const [exportLoading, setExportLoading] = useState(false)

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
      setParentAthleteRollup(data.parentAthleteRollup ?? null)
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

  const auditStats = useMemo(() => {
    if (!rows?.length) {
      return {
        total: 0,
        paidCount: 0,
        paidCents: 0,
        paidMissingReceipt: 0,
        anyMissingReceipt: 0,
      }
    }
    const paid = rows.filter((r) => r.status === "paid")
    const paidCents = paid.reduce((s, r) => s + (r.amount_approved_cents ?? r.amount_cents), 0)
    return {
      total: rows.length,
      paidCount: paid.length,
      paidCents,
      paidMissingReceipt: paid.filter((r) => !r.document_url).length,
      anyMissingReceipt: rows.filter((r) => !r.document_url).length,
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    if (!rows) return []
    if (tableFilter === "paid") return rows.filter((r) => r.status === "paid")
    if (tableFilter === "missing_receipt") return rows.filter((r) => !r.document_url)
    return rows
  }, [rows, tableFilter])

  async function downloadAuditCsv() {
    setExportLoading(true)
    try {
      const res = await fetch("/api/admin/expense-requests/audit-export", {
        cache: "no-store",
        credentials: "include",
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "Export failed")
      }
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition")
      const m = cd?.match(/filename="([^"]+)"/)
      const filename = m?.[1] ?? `nc-united-reimbursement-audit-${new Date().toISOString().slice(0, 10)}.csv`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: "Audit export downloaded" })
    } catch (e) {
      toast({
        title: "Could not export",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setExportLoading(false)
    }
  }

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

        {parentAthleteRollup && (
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Spartan &amp; payouts — parent-linked athletes</CardTitle>
                <CardDescription className="text-sm max-w-3xl">
                  Each row is an athlete with a parent link or a parent profile{" "}
                  <code className="text-xs bg-muted px-1 rounded">athlete_id</code>. Goal: wrestler dollars appear on a row OR are
                  classified as NC United pool — use{" "}
                  <HardLink href="/admin/fundraising" className="text-primary underline-offset-4 hover:underline">
                    Admin → Fundraising
                  </HardLink>{" "}
                  <strong className="font-normal">Profile / parent link coverage</strong> until athlete-coded gaps hit $0.
                  <strong className="font-normal"> Fayetteville gross</strong> matches Admin session sum;{" "}
                  <strong className="font-normal">NC United fund</strong> is pooled checkouts only (no wrestler credit).
                  <strong className="font-normal"> Athlete $ outside parent links</strong> should trend to $0 after links + directory fixes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                  <Card className="bg-emerald-50/80 border-emerald-200/80">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-emerald-950/80">Total paid out (all reimbursements)</CardDescription>
                      <CardTitle className="text-2xl text-emerald-950 tabular-nums">
                        {formatMoney(parentAthleteRollup.globalReimbursementsPaidAllTimeCents)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-emerald-900/85">
                      Sum of every request marked <span className="font-medium">Paid</span> (all athletes).
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Fayetteville gross ({parentAthleteRollup.lookbackDays}d, all sessions)</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {formatMoney(parentAthleteRollup.fayettevilleGross120dCents)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      Same total as Admin → Fundraising session sum (paid checkouts).
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>NC United fund ({parentAthleteRollup.lookbackDays}d)</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {formatMoney(parentAthleteRollup.ncUnitedCommunityFund120dCents ?? 0)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      Pooled gifts (Stripe attribution — no wrestler credit); expected without parent-athlete rows.
                    </CardContent>
                  </Card>
                  <Card
                    className={
                      (parentAthleteRollup.raisedAthleteAttributedOutsideParentLinks120dCents ?? 0) > 0
                        ? "border-amber-400/70 bg-amber-50/50"
                        : ""
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardDescription>Athlete $ outside parent links ({parentAthleteRollup.lookbackDays}d)</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {formatMoney(parentAthleteRollup.raisedAthleteAttributedOutsideParentLinks120dCents ?? 0)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      Gross minus linked rows minus NC United pool — drive this to $0 via Admin → Fundraising parent coverage.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Reimb. paid outside this table (all-time)</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {formatMoney(parentAthleteRollup.reimbursementsPaidAllTimeOutsideLinkedRowsCents)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      Global paid total minus sum of reimb. on rows above (if athletes lack parent links).
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Spartan raised ({parentAthleteRollup.lookbackDays}d, linked rows only)</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {formatMoney(parentAthleteRollup.totalsForLinkedAthletes.raisedCents)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Guild reserved (linked athletes)</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {formatMoney(parentAthleteRollup.totalsForLinkedAthletes.guildAllocationsCents)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Notional remaining (linked athletes)</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {formatMoney(parentAthleteRollup.totalsForLinkedAthletes.remainingNotionalCents)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-dashed border-slate-200 bg-slate-50/50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-slate-600">Check: gross ≈ linked + NC United + athlete gap</CardDescription>
                      <CardTitle className="text-base font-normal text-slate-700 tabular-nums leading-snug">
                        {formatMoney(parentAthleteRollup.fayettevilleGross120dCents)} ≈{" "}
                        {formatMoney(parentAthleteRollup.totalsForLinkedAthletes.raisedCents)} +{" "}
                        {formatMoney(parentAthleteRollup.ncUnitedCommunityFund120dCents ?? 0)} +{" "}
                        {formatMoney(parentAthleteRollup.raisedAthleteAttributedOutsideParentLinks120dCents ?? 0)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {parentAthleteRollup.athletes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No athletes are linked to parent accounts yet. Totals above still include global paid-out if any
                    reimbursements exist.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Athlete</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead className="text-right">Raised ({parentAthleteRollup.lookbackDays}d)</TableHead>
                          <TableHead className="text-right">Reimb paid ({parentAthleteRollup.lookbackDays}d)</TableHead>
                          <TableHead className="text-right">Guild</TableHead>
                          <TableHead className="text-right">Spent (reimb+Guild)</TableHead>
                          <TableHead className="text-right">Net ({parentAthleteRollup.lookbackDays}d)</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead className="text-right">Reimb paid (all-time)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parentAthleteRollup.athletes.map((a) => {
                          const spentWindowPlusGuild =
                            a.reimbursementsPaidWindowCents + a.guildAllocationsCents
                          return (
                            <TableRow key={a.athleteId}>
                              <TableCell className="text-sm font-medium">{a.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {a.fundraisingCode ?? "—"}
                                {a.codeUnavailable ? (
                                  <span className="block text-xs text-amber-700">No directory code</span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatMoney(a.raisedCents)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">
                                {formatMoney(a.reimbursementsPaidWindowCents)}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums">
                                {formatMoney(a.guildAllocationsCents)}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatMoney(spentWindowPlusGuild)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">
                                {formatMoney(a.netAfterReimbursementsWindowCents)}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums font-medium">
                                {formatMoney(a.remainingNotionalCents)}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums">
                                {formatMoney(a.reimbursementsPaidAllTimeCents)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-amber-950 flex flex-wrap items-center gap-2">
              Reimbursement audit package
              <Badge variant="outline" className="font-normal border-amber-300 text-amber-900">
                Admin export
              </Badge>
            </CardTitle>
            <CardDescription className="text-amber-950/80 text-sm leading-relaxed max-w-3xl">
              Download a single CSV with every request: timestamps (submitted, updated, reviewed, paid), parent and athlete
              IDs, expense category, requested and approved amounts, Zelle/Venmo payout details, parent and staff notes, and{" "}
              <strong>direct URLs to uploaded receipts or invoices</strong>. Store this file with your books; retrieve
              attachments from the links (or archive them separately) for examiner review.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-amber-950/85 space-y-1">
              {rows && rows.length > 0 ? (
                <>
                  <p>
                    <span className="font-medium text-amber-950">{auditStats.total}</span> total requests ·{" "}
                    <span className="font-medium text-amber-950">{auditStats.paidCount}</span> marked paid (
                    {formatMoney(auditStats.paidCents)}) ·{" "}
                    <span className="font-medium text-amber-950">{auditStats.paidMissingReceipt}</span> paid without an
                    uploaded attachment
                  </p>
                  {auditStats.paidMissingReceipt > 0 ? (
                    <p className="flex items-start gap-1.5 text-amber-900">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      Follow up for receipts on paid rows before filing — examiner-ready documentation usually requires
                      substantiation.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">No requests in the system yet. You can still download a header-only CSV.</p>
              )}
            </div>
            <Button
              type="button"
              className="shrink-0 bg-amber-950 hover:bg-amber-900 text-white"
              disabled={exportLoading}
              onClick={() => void downloadAuditCsv()}
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download full CSV
            </Button>
          </CardContent>
        </Card>

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
          <CardHeader className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>All reimbursement requests</CardTitle>
                <CardDescription>
                  Update status, approved amount, and notes. Mark Paid when funds are sent. Use filters to find gaps in
                  documentation.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-1.5 sm:items-end">
                <Label className="text-xs text-muted-foreground">Table filter</Label>
                <Select value={tableFilter} onValueChange={(v) => setTableFilter(v as typeof tableFilter)}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All requests</SelectItem>
                    <SelectItem value="paid">Paid only (audit focus)</SelectItem>
                    <SelectItem value="missing_receipt">Missing attachment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rows match this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Payout</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r) => (
                      <TableRow
                        key={r.id}
                        className={!r.document_url && r.status === "paid" ? "bg-amber-50/60" : undefined}
                      >
                        <TableCell className="whitespace-nowrap text-xs align-top">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm max-w-[160px] align-top">
                          <div className="font-medium truncate">{r.user_display_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.user_email ?? "—"}</div>
                        </TableCell>
                        <TableCell className="text-sm align-top">{r.athlete_name}</TableCell>
                        <TableCell className="text-sm max-w-[140px] align-top">{displayExpenseType(r.expense_type)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap align-top">
                          {formatMoney(r.amount_cents)}
                          {r.amount_approved_cents != null && (
                            <div className="text-xs text-muted-foreground">Appr: {formatMoney(r.amount_approved_cents)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px] align-top">
                          {r.payment_method === "zelle" && r.zelle_info ? (
                            <span>Zelle: {r.zelle_info}</span>
                          ) : r.payment_method === "venmo" && r.venmo_info ? (
                            <span>Venmo: {r.venmo_info}</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {r.document_url ? (
                            <a
                              href={r.document_url}
                              className="inline-flex items-center gap-1 text-sm text-primary font-medium underline-offset-2 hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              Open
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant={badgeFor(r.status)} className="font-normal">
                            {EXPENSE_STATUS_LABELS[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <Button size="sm" variant="outline" onClick={() => openRow(r)}>
                            Manage
                          </Button>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs space-y-1 font-mono text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Request ID:</span> {active.id}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Submitted:</span>{" "}
                  {new Date(active.created_at).toLocaleString()}
                </div>
                {active.updated_at ? (
                  <div>
                    <span className="font-semibold text-foreground">Last updated:</span>{" "}
                    {new Date(active.updated_at).toLocaleString()}
                  </div>
                ) : null}
                {active.reviewed_at ? (
                  <div>
                    <span className="font-semibold text-foreground">Reviewed:</span>{" "}
                    {new Date(active.reviewed_at).toLocaleString()}
                  </div>
                ) : null}
                {active.paid_at ? (
                  <div>
                    <span className="font-semibold text-foreground">Paid:</span>{" "}
                    {new Date(active.paid_at).toLocaleString()}
                  </div>
                ) : null}
              </div>
              {active.document_url ? (
                <a
                  href={active.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 px-3 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  <FileText className="h-4 w-4" />
                  Open receipt / attachment
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  No file uploaded with this request. For audit purposes, collect and retain substantiation outside the
                  app if needed.
                </div>
              )}
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
