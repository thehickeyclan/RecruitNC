"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Loader2, ExternalLink, DollarSign, Mail } from "lucide-react"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"
import { useToast } from "@/hooks/use-toast"

type OrderLineItem = {
  name: string
  amount_cents: number
  quantity?: number
}

type Registration = {
  id: string
  event_slug: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_email: string
  parent_email: string
  linked_account_email?: string | null
  high_school: string
  graduation_year: string
  primary_weight: string
  reg_fee_cents: number
  apparel_fee_cents: number
  status: string
  order_id: string | null
  order_number?: string
  record?: string | null
  created_at: string
  fee_receipt_email_sent_at?: string | null
  order_summary?: string
  line_items?: OrderLineItem[]
}

function dateToInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function localDateToNoonIso(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number)
  if (!y || !m || !d) return new Date().toISOString()
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}

function programLabelFromSlug(eventSlug: string) {
  if (eventSlug === "nhsca-duals-2026-select") return "NHSCA Duals 2026 — Select team"
  if (eventSlug === "nhsca-duals-2026") return "NHSCA Duals 2026 — National team"
  return "National Team (NHSCA)"
}

function teamShortLabel(eventSlug: string) {
  return eventSlug === "nhsca-duals-2026-select" ? "Select" : "National"
}

function formatLineItemDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function RegistrationOrderItems({ r }: { r: Registration }) {
  const items = r.line_items ?? []
  if (items.length > 0) {
    return (
      <ul className="space-y-1 text-xs max-w-[280px]">
        {items.map((item, idx) => (
          <li key={`${item.name}-${idx}`} className="leading-snug">
            <span className="font-medium text-[#13294B]">{item.name}</span>
            <span className="text-muted-foreground tabular-nums"> · {formatLineItemDollars(item.amount_cents)}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (r.order_summary?.trim()) {
    return <p className="text-xs text-muted-foreground max-w-[280px] leading-snug">{r.order_summary}</p>
  }
  return <span className="text-muted-foreground text-sm">—</span>
}

function totalCents(r: Registration) {
  return (r.reg_fee_cents || 0) + (r.apparel_fee_cents || 0)
}

function formatCentsCell(cents: number) {
  return (cents / 100).toFixed(2)
}

function parseDollarsToCents(s: string): number | null {
  const n = Number.parseFloat(s.replace(/[$,]/g, ""))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

export default function AdminBlueNationalTeamPaymentsPage() {
  const { toast } = useToast()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [paidCount, setPaidCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all")
  const [error, setError] = useState<string | null>(null)
  const [recordEdits, setRecordEdits] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptRow, setReceiptRow] = useState<Registration | null>(null)
  const [receiptFirstName, setReceiptFirstName] = useState("")
  const [receiptTo, setReceiptTo] = useState("")
  const [receiptAmountDollars, setReceiptAmountDollars] = useState("")
  const [receiptDateStr, setReceiptDateStr] = useState("")
  const [receiptPreviewHtml, setReceiptPreviewHtml] = useState<string | null>(null)
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null)
  const [receiptPreviewBusy, setReceiptPreviewBusy] = useState(false)
  const [receiptSendBusy, setReceiptSendBusy] = useState(false)

  const applyRegistrationPayload = useCallback((data: { registrations?: Registration[]; paidCount?: number; pendingCount?: number }) => {
    setRegistrations(data.registrations ?? [])
    setPaidCount(data.paidCount ?? 0)
    setPendingCount(data.pendingCount ?? 0)
  }, [])

  const loadRegistrations = useCallback(async () => {
    setError(null)
    const r = await fetch("/api/admin/blue/national-team-registrations", { credentials: "include" })
    if (!r.ok) {
      if (r.status === 401) throw new Error("Not signed in.")
      if (r.status === 403) throw new Error("Admin access required.")
      if (r.status === 503) {
        const d = await r.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? "Setup required")
      }
      throw new Error(`Failed to load (${r.status})`)
    }
    const data = await r.json()
    applyRegistrationPayload(data)
  }, [applyRegistrationPayload])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadRegistrations()
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Could not load registrations.")
          setRegistrations([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadRegistrations])

  const filtered =
    filter === "paid"
      ? registrations.filter((r) => r.status === "paid" || r.order_id)
      : filter === "pending"
        ? registrations.filter((r) => r.status !== "paid" && !r.order_id)
        : registrations

  const formatCents = (cents: number) => formatCentsCell(cents)
  const totalPaid = registrations
    .filter((r) => r.status === "paid" || r.order_id)
    .reduce((sum, r) => sum + totalCents(r), 0)

  async function saveRecord(regId: string, value: string) {
    setSavingId(regId)
    try {
      const res = await fetch(`/api/admin/blue/national-team-registrations/${regId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ record: value.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to save")
      setRegistrations((prev) => prev.map((r) => (r.id === regId ? { ...r, record: value.trim() || null } : r)))
      setRecordEdits((e) => {
        const next = { ...e }
        delete next[regId]
        return next
      })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Could not save record")
    } finally {
      setSavingId(null)
    }
  }

  function openReceipt(r: Registration) {
    setReceiptRow(r)
    setReceiptFirstName((r.athlete_first_name ?? "").trim() || "Friend")
    setReceiptTo((r.parent_email ?? "").trim())
    setReceiptAmountDollars((totalCents(r) / 100).toFixed(2))
    setReceiptDateStr(dateToInputValue(r.created_at))
    setReceiptPreviewHtml(null)
    setReceiptMsg(null)
    setReceiptOpen(true)
  }

  async function runReceiptPreview() {
    if (!receiptRow) return
    setReceiptMsg(null)
    const cents = parseDollarsToCents(receiptAmountDollars)
    if (cents == null) {
      setReceiptMsg("Enter a valid amount.")
      return
    }
    if (!receiptDateStr) {
      setReceiptMsg("Choose a payment date.")
      return
    }
    if (!receiptTo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptTo)) {
      setReceiptMsg("Enter a valid recipient email.")
      return
    }
    setReceiptPreviewBusy(true)
    setReceiptPreviewHtml(null)
    try {
      const athleteFull = `${receiptRow.athlete_first_name} ${receiptRow.athlete_last_name}`.trim()
      const res = await fetch("/api/admin/national-team-fee-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "preview",
          firstName: receiptFirstName.trim(),
          amountCents: cents,
          paymentDateIso: localDateToNoonIso(receiptDateStr),
          recipientEmail: receiptTo.trim(),
          athleteFullName: athleteFull,
          programLabel: programLabelFromSlug(receiptRow.event_slug),
        }),
      })
      const j = (await res.json()) as {
        error?: string
        preview?: { html: string; subject: string; to: string; from: string }
      }
      if (!res.ok) throw new Error(j.error || "Preview failed")
      setReceiptMsg(null)
      if (j.preview?.html) setReceiptPreviewHtml(j.preview.html)
      else setReceiptMsg("No preview returned.")
    } catch (e) {
      setReceiptMsg(e instanceof Error ? e.message : "Preview failed")
    } finally {
      setReceiptPreviewBusy(false)
    }
  }

  async function sendReceiptEmail() {
    if (!receiptRow) return
    setReceiptMsg(null)
    const cents = parseDollarsToCents(receiptAmountDollars)
    if (cents == null) {
      setReceiptMsg("Enter a valid amount.")
      return
    }
    if (!receiptDateStr) {
      setReceiptMsg("Choose a payment date.")
      return
    }
    if (cents !== totalCents(receiptRow)) {
      setReceiptMsg("Amount must match registration total (registration + apparel).")
      return
    }
    if (!receiptTo.trim()) {
      setReceiptMsg("Missing email.")
      return
    }
    setReceiptSendBusy(true)
    try {
      const athleteFull = `${receiptRow.athlete_first_name} ${receiptRow.athlete_last_name}`.trim()
      const res = await fetch("/api/admin/national-team-fee-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "send",
          registrationId: receiptRow.id,
          firstName: receiptFirstName.trim(),
          amountCents: cents,
          paymentDateIso: localDateToNoonIso(receiptDateStr),
          recipientEmail: receiptTo.trim(),
          athleteFullName: athleteFull,
          programLabel: programLabelFromSlug(receiptRow.event_slug),
        }),
      })
      const j = (await res.json()) as { error?: string; warning?: string; ok?: boolean }
      if (!res.ok) throw new Error(j.error || "Send failed")
      if (j.warning) {
        toast({ title: "Receipt sent (log issue)", description: j.warning })
        setReceiptMsg(j.warning)
      } else {
        toast({ title: "Receipt sent" })
        setReceiptMsg(null)
      }
      setReceiptOpen(false)
      setReceiptRow(null)
      try {
        await loadRegistrations()
      } catch {
        /* list refresh failed — receipt still sent */
      }
    } catch (e) {
      setReceiptMsg(e instanceof Error ? e.message : "Send failed")
    } finally {
      setReceiptSendBusy(false)
    }
  }

  const isPaid = (r: Registration) => r.status === "paid" || Boolean(r.order_id)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <a href="/admin/blue">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-[#13294B]">National team – NHSCA 2026 payments</h1>
                <p className="text-sm text-muted-foreground">
                  Who has paid and what they ordered (registration, van, hotel, gear, team package). Paid rows can send a
                  payment receipt email (preview first — email must match Stripe checkout).
                </p>
              </div>
              <a
                href="/admin/blue/national-team-orders-report"
                className="text-sm font-medium text-[#03154C] hover:underline shrink-0"
              >
                Full orders report →
              </a>
            </div>
        </div>

        {error && isBlueAuthError(error) && <BlueAdminAuthBanner returnTo="/admin/blue/national-team-payments" />}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
              {(error === "Not signed in." || error === "Admin access required.") && (
                <p className="mt-3">
                  <a
                    href="/auth/signin?returnTo=/admin/blue/national-team-payments"
                    className="text-[#003366] font-medium underline"
                  >
                    Sign in again
                  </a>
                </p>
              )}
              {error.includes("208") && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Run the SQL in{" "}
                  <code className="bg-muted px-1 rounded">scripts/208-national-team-registrations-and-products.sql</code>{" "}
                  in Supabase SQL Editor, then ensure the two products (NHSCA 2026 – Registration, NHSCA 2026 – Apparel)
                  exist under category <code className="bg-muted px-1 rounded">national_team</code>.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#03154C]" />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <Card className="border-t-4 border-t-green-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" /> Paid
                  </CardTitle>
                  <CardDescription>
                    {paidCount} registration{paidCount !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-700">${(totalPaid / 100).toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-red-800">Pending</CardTitle>
                  <CardDescription>{pendingCount} not yet paid</CardDescription>
                </CardHeader>
              </Card>
              <div className="flex gap-2">
                <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
                  All
                </Button>
                <Button variant={filter === "paid" ? "default" : "outline"} size="sm" onClick={() => setFilter("paid")}>
                  Paid
                </Button>
                <Button
                  variant={filter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("pending")}
                >
                  Pending
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Registrations</CardTitle>
                <CardDescription>
                  Parent email is from checkout. &quot;✓ same account&quot; or &quot;Login: …&quot; compares to RecruitNC
                  login when linked.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No registrations match the filter.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Athlete</TableHead>
                          <TableHead>Parent email</TableHead>
                          <TableHead>School</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead className="min-w-[240px]">What they ordered</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="whitespace-nowrap">Receipt</TableHead>
                          <TableHead className="whitespace-nowrap">Record</TableHead>
                          <TableHead>Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              <div>{r.athlete_first_name} {r.athlete_last_name}</div>
                              <div className="text-xs font-normal text-muted-foreground">{teamShortLabel(r.event_slug)} team</div>
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px]">
                              <span title="Email used when they registered">{r.parent_email}</span>
                              {r.linked_account_email != null && r.linked_account_email !== "" && (
                                <>
                                  <br />
                                  <span
                                    className="text-muted-foreground text-xs"
                                    title="RecruitNC login when different from registration email"
                                  >
                                    {r.linked_account_email.toLowerCase() === (r.parent_email ?? "").toLowerCase()
                                      ? "✓ same account"
                                      : `Login: ${r.linked_account_email}`}
                                  </span>
                                </>
                              )}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {r.high_school} ({r.graduation_year})
                            </TableCell>
                            <TableCell>{r.primary_weight}</TableCell>
                            <TableCell>
                              <RegistrationOrderItems r={r} />
                            </TableCell>
                            <TableCell className="font-medium">${formatCents(totalCents(r))}</TableCell>
                            <TableCell>
                              {isPaid(r) ? (
                                <Badge className="border-0 bg-green-600 text-white hover:bg-green-600">Paid</Badge>
                              ) : (
                                <Badge className="border-0 bg-red-600 text-white hover:bg-red-600">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {isPaid(r) && totalCents(r) > 0 ? (
                                <div className="flex flex-col gap-1 items-start">
                                  {r.fee_receipt_email_sent_at ? (
                                    <Badge className="border-0 bg-green-600 text-[10px] font-medium text-white hover:bg-green-600">
                                      Receipt sent
                                    </Badge>
                                  ) : (
                                    <Badge className="border-0 bg-red-600 text-[10px] font-medium text-white hover:bg-red-600">
                                      Receipt not sent
                                    </Badge>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1 text-xs"
                                    onClick={() => openReceipt(r)}
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                    Email receipt
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8 w-20 font-mono text-sm"
                                placeholder="0-0"
                                value={recordEdits[r.id] ?? r.record ?? ""}
                                onChange={(e) => setRecordEdits((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                onBlur={(e) => {
                                  if (savingId === r.id) return
                                  const trimmed = (e.target.value ?? "").trim()
                                  const current = (r.record ?? "").trim()
                                  if (trimmed !== current) saveRecord(r.id, trimmed)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    ;(e.target as HTMLInputElement).blur()
                                  }
                                }}
                                disabled={savingId === r.id}
                              />
                            </TableCell>
                            <TableCell>
                              {r.order_id ? (
                                <a
                                  href={`/admin/orders/${r.order_id}`}
                                  className="text-[#03154C] hover:underline inline-flex items-center gap-1 text-sm"
                                >
                                  View order <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  Optional: create <code className="rounded bg-muted px-1">national_team_fee_receipt_emails</code> in
                  Supabase (see SQL comment in{" "}
                  <code className="rounded bg-muted px-1">app/api/admin/national-team-fee-receipt/route.ts</code>) to show
                  &quot;Sent&quot; badges after successful sends.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>National Team payment receipt</DialogTitle>
              <DialogDescription>
                Preview and send the official receipt via Resend. Recipient email must match the Stripe Checkout payer for
                this registration.
              </DialogDescription>
            </DialogHeader>
            {receiptRow && (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1">
                  <p>
                    <span className="text-muted-foreground">Athlete: </span>
                    {receiptRow.athlete_first_name} {receiptRow.athlete_last_name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Program: </span>
                    {programLabelFromSlug(receiptRow.event_slug)}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nt-rcpt-first">First name (greeting)</Label>
                  <Input
                    id="nt-rcpt-first"
                    value={receiptFirstName}
                    onChange={(e) => setReceiptFirstName(e.target.value)}
                    placeholder="Parent or payer first name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nt-rcpt-to">To (must match Stripe checkout email)</Label>
                  <Input
                    id="nt-rcpt-to"
                    type="email"
                    value={receiptTo}
                    onChange={(e) => setReceiptTo(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nt-rcpt-amt">Amount (USD, must match total)</Label>
                  <Input
                    id="nt-rcpt-amt"
                    inputMode="decimal"
                    value={receiptAmountDollars}
                    onChange={(e) => setReceiptAmountDollars(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nt-rcpt-date">Payment date (shown in email)</Label>
                  <Input
                    id="nt-rcpt-date"
                    type="date"
                    value={receiptDateStr}
                    onChange={(e) => setReceiptDateStr(e.target.value)}
                  />
                </div>
                {receiptPreviewHtml ? (
                  <div className="rounded-md border bg-white p-3">
                    <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase">Preview</p>
                    <iframe
                      title="Email preview"
                      className="h-[min(280px,40vh)] w-full rounded border-0 bg-white text-black"
                      srcDoc={receiptPreviewHtml}
                    />
                  </div>
                ) : null}
                {receiptMsg && (
                  <p className="text-destructive text-sm" role="alert">
                    {receiptMsg}
                  </p>
                )}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void runReceiptPreview()}
                disabled={receiptPreviewBusy || !receiptRow}
              >
                {receiptPreviewBusy ? "Preview…" : "Preview"}
              </Button>
              <Button
                type="button"
                onClick={() => void sendReceiptEmail()}
                disabled={receiptSendBusy || !receiptRow || !receiptPreviewHtml}
              >
                {receiptSendBusy ? "Sending…" : "Send email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
