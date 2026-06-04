"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Loader2, Search } from "lucide-react"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"
import {
  aauRosterPaymentMatrixToCsv,
  formatAauPaymentCell,
  type AauRosterPaymentMatrix,
} from "@/lib/aau-scholastic-roster-payment-matrix"

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function PaymentCell({ cents }: { cents: number | undefined | null }) {
  if (!cents || cents <= 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return <span className="tabular-nums font-medium text-[#13294B]">{formatAauPaymentCell(cents)}</span>
}

export default function AdminAauDualsRosterPaymentsPage() {
  const [matrix, setMatrix] = useState<AauRosterPaymentMatrix | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const r = await fetch("/api/admin/blue/aau-duals-roster-payments", { credentials: "include" })
    if (!r.ok) {
      if (r.status === 401) throw new Error("Not signed in.")
      if (r.status === 403) throw new Error("Admin access required.")
      const d = await r.json().catch(() => ({}))
      throw new Error((d as { error?: string }).error ?? `Failed to load (${r.status})`)
    }
    const data = (await r.json()) as AauRosterPaymentMatrix
    setMatrix(data)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void load()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load roster payments.")
          setMatrix(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const filteredRoster = useMemo(() => {
    if (!matrix) return []
    const q = search.trim().toLowerCase()
    return matrix.roster.filter((row) => {
      const filled = row.wrestler.trim() && !row.openSlot
      if (showUnpaidOnly && (!filled || (row.payments?.total_cents ?? 0) > 0)) return false
      if (!q) return true
      const hay = [row.wrestler, row.weightLabel, row.payments?.parent_email ?? ""].join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [matrix, search, showUnpaidOnly])

  const filteredExtras = useMemo(() => {
    if (!matrix) return []
    const q = search.trim().toLowerCase()
    if (!q) return matrix.extras
    return matrix.extras.filter((row) => {
      const hay = [row.athlete_name, row.primary_weight, row.payments.parent_email ?? ""].join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [matrix, search])

  function downloadCsv() {
    if (!matrix) return
    const csv = aauRosterPaymentMatrixToCsv(matrix)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `aau-duals-roster-payments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const summary = matrix?.summary

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
              <h1 className="text-2xl font-bold text-[#13294B]">AAU Duals roster payments</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Full starter roster with dollars paid per category — tournament reg, apparel, flight, and hotel.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!matrix}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
            <a
              href="/admin/blue/national-team-payments"
              className="text-sm font-medium text-[#03154C] hover:underline self-center"
            >
              All registrations →
            </a>
          </div>
        </div>

        {error && isBlueAuthError(error) && <BlueAdminAuthBanner returnTo="/admin/blue/aau-duals-roster-payments" />}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#03154C]" />
          </div>
        ) : matrix ? (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card className="border-t-4 border-t-green-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Paid on roster</CardTitle>
                  <CardDescription>
                    {summary?.paidOnRoster ?? 0} of {summary?.filledSlots ?? 0} filled slots
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-t-4 border-t-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-red-800">Not paid</CardTitle>
                  <CardDescription>{summary?.unpaidOnRoster ?? 0} roster spots</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Column totals</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Reg {formatDollars(summary?.columnTotals.tournament_reg_cents ?? 0)} · Apparel{" "}
                    {formatDollars(summary?.columnTotals.apparel_cents ?? 0)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  Flight {formatDollars(summary?.columnTotals.flight_cents ?? 0)} · Hotel{" "}
                  {formatDollars(summary?.columnTotals.hotel_cents ?? 0)}
                </CardContent>
              </Card>
              <Card className="sm:col-span-2 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Grand total collected</CardTitle>
                  <CardDescription>{formatDollars(summary?.columnTotals.total_cents ?? 0)}</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative max-w-xs flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search wrestler or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant={showUnpaidOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowUnpaidOnly((v) => !v)}
              >
                {showUnpaidOnly ? "Showing unpaid only" : "Show unpaid only"}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Starter roster</CardTitle>
                <CardDescription>
                  Dollar amounts reflect paid hub checkouts only. Hotel column includes hotel &amp; team van.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Weight</TableHead>
                        <TableHead>Wrestler</TableHead>
                        <TableHead className="text-right">Tournament reg</TableHead>
                        <TableHead className="text-right">Apparel</TableHead>
                        <TableHead className="text-right">Flight</TableHead>
                        <TableHead className="text-right">Hotel</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Parent email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoster.map((row) => {
                        const open = row.openSlot || !row.wrestler.trim()
                        const paid = (row.payments?.total_cents ?? 0) > 0
                        const p = row.payments
                        return (
                          <TableRow
                            key={row.weightLabel}
                            className={!open && !paid ? "bg-red-50/80" : undefined}
                          >
                            <TableCell className="font-medium tabular-nums whitespace-nowrap">{row.weightLabel}</TableCell>
                            <TableCell className="font-medium">
                              {open ? (
                                <span className="text-muted-foreground italic">Open — TBD</span>
                              ) : (
                                row.wrestler
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <PaymentCell cents={p?.tournament_reg_cents} />
                            </TableCell>
                            <TableCell className="text-right">
                              <PaymentCell cents={p?.apparel_cents} />
                            </TableCell>
                            <TableCell className="text-right">
                              <PaymentCell cents={p?.flight_cents} />
                            </TableCell>
                            <TableCell className="text-right">
                              <PaymentCell cents={p?.hotel_cents} />
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              <PaymentCell cents={p?.total_cents} />
                            </TableCell>
                            <TableCell>
                              {open ? (
                                <Badge variant="outline">Open slot</Badge>
                              ) : paid ? (
                                <Badge className="border-0 bg-green-600 text-white hover:bg-green-600">Paid</Badge>
                              ) : (
                                <Badge className="border-0 bg-red-600 text-white hover:bg-red-600">Unpaid</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate" title={p?.parent_email ?? undefined}>
                              {p?.parent_email ?? "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {filteredExtras.length > 0 ? (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Paid — not on roster</CardTitle>
                  <CardDescription>
                    Registrations that matched a payment but are not on the published starter lineup (
                    {matrix.extras.length} total).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Athlete</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead className="text-right">Tournament reg</TableHead>
                          <TableHead className="text-right">Apparel</TableHead>
                          <TableHead className="text-right">Flight</TableHead>
                          <TableHead className="text-right">Hotel</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Parent email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExtras.map((row) => {
                          const p = row.payments
                          return (
                            <TableRow key={row.wrestlerKey}>
                              <TableCell className="font-medium">{row.athlete_name}</TableCell>
                              <TableCell>{row.primary_weight || "—"}</TableCell>
                              <TableCell className="text-right">
                                <PaymentCell cents={p.tournament_reg_cents} />
                              </TableCell>
                              <TableCell className="text-right">
                                <PaymentCell cents={p.apparel_cents} />
                              </TableCell>
                              <TableCell className="text-right">
                                <PaymentCell cents={p.flight_cents} />
                              </TableCell>
                              <TableCell className="text-right">
                                <PaymentCell cents={p.hotel_cents} />
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                <PaymentCell cents={p.total_cents} />
                              </TableCell>
                              <TableCell className="text-sm">{p.parent_email ?? "—"}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
