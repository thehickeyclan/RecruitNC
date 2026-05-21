"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Download, ExternalLink, Loader2, Search } from "lucide-react"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"
import type { NhscaOrderLineDisplay } from "@/lib/nhsca-hub-checkout-pricing"
import {
  formatLineItemsForCell,
  ordersReportToCsv,
  reportSummary,
  rowIncludesCategory,
  toOrdersReportRow,
  type NhscaOrderIncludesFilter,
  type NhscaOrdersReportRow,
} from "@/lib/nhsca-duals-2026-orders-report"

type ApiRegistration = NhscaOrdersReportRow

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function LineItemsCell({ items }: { items?: NhscaOrderLineDisplay[] }) {
  if (!items?.length) return <span className="text-muted-foreground text-sm">—</span>
  return (
    <ul className="space-y-0.5 text-xs max-w-[320px]">
      {items.map((item, idx) => (
        <li key={`${item.name}-${idx}`} className="leading-snug">
          <span className="font-medium text-[#13294B]">{item.name}</span>
          <span className="text-muted-foreground tabular-nums"> · {formatDollars(item.amount_cents)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function NationalTeamOrdersReportPage() {
  const [rows, setRows] = useState<ApiRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [teamFilter, setTeamFilter] = useState<"all" | "National" | "Select">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all")
  const [includesFilter, setIncludesFilter] = useState<NhscaOrderIncludesFilter>("all")
  const [receiptFilter, setReceiptFilter] = useState<"all" | "sent" | "not_sent">("all")

  const load = useCallback(async () => {
    setError(null)
    const r = await fetch("/api/admin/blue/national-team-registrations", { credentials: "include" })
    if (!r.ok) {
      if (r.status === 401) throw new Error("Not signed in.")
      if (r.status === 403) throw new Error("Admin access required.")
      const d = await r.json().catch(() => ({}))
      throw new Error((d as { error?: string }).error ?? `Failed to load (${r.status})`)
    }
    const data = await r.json()
    const list = ((data.registrations ?? []) as ApiRegistration[]).map((reg) => toOrdersReportRow(reg))
    setRows(list)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void load()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load report.")
          setRows([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (teamFilter !== "all" && r.team !== teamFilter) return false
      if (statusFilter === "paid" && !r.is_paid) return false
      if (statusFilter === "pending" && r.is_paid) return false
      if (!rowIncludesCategory(r, includesFilter)) return false
      if (receiptFilter === "sent" && !r.fee_receipt_email_sent_at) return false
      if (receiptFilter === "not_sent" && (r.fee_receipt_email_sent_at || !r.is_paid)) return false
      if (!q) return true
      const hay = [
        r.athlete_name,
        r.parent_email,
        r.order_number ?? "",
        r.order_summary ?? "",
        formatLineItemsForCell(r.line_items),
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, teamFilter, statusFilter, includesFilter, receiptFilter])

  const summary = useMemo(() => reportSummary(filtered), [filtered])
  const allSummary = useMemo(() => reportSummary(rows), [rows])

  function downloadCsv() {
    const csv = ordersReportToCsv(filtered)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `nhsca-orders-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <a href="/admin/blue/national-team-payments">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#13294B]">NHSCA orders report</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Every hub checkout with line-item detail — filter by team, status, van, hotel, gear, and export CSV.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/blue/national-team-payments">Payments & receipts</a>
            </Button>
            <Button size="sm" onClick={downloadCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV ({filtered.length})
            </Button>
          </div>
        </div>

        {error && isBlueAuthError(error) && (
          <BlueAdminAuthBanner returnTo="/admin/blue/national-team-orders-report" />
        )}
        {error ? (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#03154C]" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Paid (filtered)</CardDescription>
                  <CardTitle className="text-2xl">{summary.paidCount}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-green-700 font-semibold">
                  {formatDollars(summary.paidTotalCents)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending</CardDescription>
                  <CardTitle className="text-2xl">{summary.pendingCount}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {allSummary.pendingCount} total in system
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>National / Select (paid)</CardDescription>
                  <CardTitle className="text-2xl">
                    {summary.nationalPaidCount} / {summary.selectPaidCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Van {summary.withVan} · Hotel {summary.withHotel} · Package {summary.withTeamPackage}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Rows shown</CardDescription>
                  <CardTitle className="text-2xl">
                    {filtered.length}
                    <span className="text-base font-normal text-muted-foreground"> / {rows.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">Gear orders: {summary.withGear}</CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filters</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Athlete, parent, order #, items…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v as typeof teamFilter)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All teams</SelectItem>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="Select">Select</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={includesFilter} onValueChange={(v) => setIncludesFilter(v as NhscaOrderIncludesFilter)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Includes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any items</SelectItem>
                    <SelectItem value="team_package">Team package</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                    <SelectItem value="van">Van travel</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="gear">Gear / apparel</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={receiptFilter} onValueChange={(v) => setReceiptFilter(v as typeof receiptFilter)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Receipt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All receipts</SelectItem>
                    <SelectItem value="sent">Receipt sent</SelectItem>
                    <SelectItem value="not_sent">Receipt not sent</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setTeamFilter("all")
                    setStatusFilter("all")
                    setIncludesFilter("all")
                    setReceiptFilter("all")
                  }}
                >
                  Clear
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All registrations</CardTitle>
                <CardDescription>
                  Line items are decoded from Stripe checkout when available; placeholder store labels are ignored.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">No rows match your filters.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Athlete</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead className="min-w-[280px]">What they ordered</TableHead>
                          <TableHead>Sizes</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              <div>{r.athlete_name}</div>
                              <div className="text-xs font-normal text-muted-foreground">{r.team} team</div>
                            </TableCell>
                            <TableCell className="text-sm max-w-[180px] break-all">{r.parent_email}</TableCell>
                            <TableCell>
                              <LineItemsCell items={r.line_items} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px]">
                              {[r.singlet_size && `Singlet ${r.singlet_size}`, r.shorts_size && `Shorts ${r.shorts_size}`, r.shirt_size && `Tees ${r.shirt_size}`]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                              {formatDollars(r.total_cents)}
                            </TableCell>
                            <TableCell>
                              {r.is_paid ? (
                                <Badge className="border-0 bg-green-600 text-white hover:bg-green-600">Paid</Badge>
                              ) : (
                                <Badge className="border-0 bg-amber-600 text-white hover:bg-amber-600">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.order_id ? (
                                <a
                                  href={`/admin/orders/${r.order_id}`}
                                  className="text-[#03154C] hover:underline inline-flex items-center gap-1 text-xs"
                                >
                                  {r.order_number ?? "View"}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
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
      </div>
    </div>
  )
}
