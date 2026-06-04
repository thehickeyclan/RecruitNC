"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, ExternalLink, DollarSign } from "lucide-react"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"
import {
  NationalTeamFeeReceiptSendButton,
  useNationalTeamFeeReceiptDialog,
} from "@/components/admin/national-team-fee-receipt-dialog"
import {
  formatCentsDollars,
  nationalTeamReceiptTotalCents,
  nationalTeamRegistrationIsPaid,
  type NationalTeamFeeReceiptRegistration,
} from "@/lib/national-team-fee-receipt-ui"
import { nationalTeamEventShortLabel } from "@/lib/nhsca-duals-2026-registrations"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"

type OrderLineItem = {
  name: string
  amount_cents: number
  quantity?: number
}

type Registration = NationalTeamFeeReceiptRegistration & {
  athlete_email: string
  athlete_dob?: string | null
  linked_account_email?: string | null
  high_school: string
  graduation_year: string
  primary_weight: string
  order_number?: string
  record?: string | null
  order_summary?: string
  line_items?: OrderLineItem[]
}

function teamShortLabel(eventSlug: string) {
  return nationalTeamEventShortLabel(eventSlug)
}

type EventFilter = "all" | "nhsca" | "aau"

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

export default function AdminBlueNationalTeamPaymentsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [paidCount, setPaidCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all")
  const [eventFilter, setEventFilter] = useState<EventFilter>("all")
  const [error, setError] = useState<string | null>(null)
  const [recordEdits, setRecordEdits] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

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
    const list: Registration[] = Array.isArray(data.registrations) ? data.registrations : []
    setRegistrations(list)
    setPaidCount(list.filter((row) => nationalTeamRegistrationIsPaid(row)).length)
    setPendingCount(list.filter((row) => !nationalTeamRegistrationIsPaid(row)).length)
  }, [])

  const { openReceipt, dialog: receiptDialog } = useNationalTeamFeeReceiptDialog(loadRegistrations)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadRegistrations()
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Could not load registrations.")
          setRegistrations([])
          setPaidCount(0)
          setPendingCount(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadRegistrations])

  const filteredByEvent =
    eventFilter === "aau"
      ? registrations.filter((r) => r.event_slug === AAU_SCHOLASTIC_EVENT_SLUG)
      : eventFilter === "nhsca"
        ? registrations.filter((r) => r.event_slug !== AAU_SCHOLASTIC_EVENT_SLUG)
        : registrations

  const filtered =
    filter === "paid"
      ? filteredByEvent.filter((r) => nationalTeamRegistrationIsPaid(r))
      : filter === "pending"
        ? filteredByEvent.filter((r) => !nationalTeamRegistrationIsPaid(r))
        : filteredByEvent

  const totalPaid = filteredByEvent
    .filter((r) => nationalTeamRegistrationIsPaid(r))
    .reduce((sum, r) => sum + nationalTeamReceiptTotalCents(r), 0)

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <a href="/admin/national-team">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-2 flex-1">
            <div>
              <h1 className="text-2xl font-bold text-[#13294B]">National team payments</h1>
              <p className="text-sm text-muted-foreground">
                NHSCA Duals and AAU Scholastic Duals registrations. Paid rows auto-email receipts; use{" "}
                <strong>Send receipt</strong> to resend.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <a
                href="/admin/blue/aau-duals-roster-payments"
                className="text-sm font-medium text-[#03154C] hover:underline"
              >
                AAU roster payment matrix →
              </a>
              <a
                href="/admin/blue/national-team-orders-report"
                className="text-sm font-medium text-[#03154C] hover:underline"
              >
                Full orders report →
              </a>
            </div>
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
                  <p className="text-2xl font-bold text-green-700">${formatCentsDollars(totalPaid)}</p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-red-800">Pending</CardTitle>
                  <CardDescription>{pendingCount} not yet paid</CardDescription>
                </CardHeader>
              </Card>
              <div className="flex flex-wrap gap-2">
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
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button
                  variant={eventFilter === "all" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setEventFilter("all")}
                >
                  All events
                </Button>
                <Button
                  variant={eventFilter === "nhsca" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setEventFilter("nhsca")}
                >
                  NHSCA
                </Button>
                <Button
                  variant={eventFilter === "aau" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setEventFilter("aau")}
                >
                  AAU Scholastic
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Registrations</CardTitle>
                <CardDescription>
                  Filter to Paid, find the athlete, click <strong>Send receipt</strong>. Preview is optional.
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
                          <TableHead className="whitespace-nowrap min-w-[120px]">Receipt</TableHead>
                          <TableHead className="whitespace-nowrap">Record</TableHead>
                          <TableHead>Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              <div>
                                {r.athlete_first_name} {r.athlete_last_name}
                              </div>
                              {r.athlete_dob?.trim() ? (
                                <div className="text-xs font-normal text-muted-foreground">DOB {r.athlete_dob}</div>
                              ) : null}
                              <div className="text-xs font-normal text-muted-foreground">
                                {teamShortLabel(r.event_slug)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px]">
                              <span title="Email used when they registered">{r.parent_email}</span>
                              {r.linked_account_email != null && r.linked_account_email !== "" && (
                                <>
                                  <br />
                                  <span className="text-muted-foreground text-xs">
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
                            <TableCell className="font-medium">
                              ${formatCentsDollars(nationalTeamReceiptTotalCents(r))}
                            </TableCell>
                            <TableCell>
                              {nationalTeamRegistrationIsPaid(r) ? (
                                <Badge className="border-0 bg-green-600 text-white hover:bg-green-600">Paid</Badge>
                              ) : (
                                <Badge className="border-0 bg-red-600 text-white hover:bg-red-600">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <NationalTeamFeeReceiptSendButton
                                registration={r}
                                onClick={() => openReceipt(r)}
                              />
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
              </CardContent>
            </Card>
          </>
        )}

        {receiptDialog}
      </div>
    </div>
  )
}
