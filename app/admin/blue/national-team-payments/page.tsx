"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, ExternalLink, DollarSign } from "lucide-react"

type Registration = {
  id: string
  event_slug: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_email: string
  parent_email: string
  high_school: string
  graduation_year: string
  primary_weight: string
  reg_fee_cents: number
  apparel_fee_cents: number
  status: string
  order_id: string | null
  order_number?: string
  created_at: string
}

export default function AdminBlueNationalTeamPaymentsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [paidCount, setPaidCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch("/api/admin/blue/national-team-registrations", { credentials: "include" })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401) throw new Error("Not signed in.")
          if (r.status === 403) throw new Error("Admin access required.")
          if (r.status === 503) return r.json().then((d) => { throw new Error(d?.error ?? "Setup required") })
          throw new Error(`Failed to load (${r.status})`)
        }
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        setRegistrations(data.registrations ?? [])
        setPaidCount(data.paidCount ?? 0)
        setPendingCount(data.pendingCount ?? 0)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Could not load registrations.")
          setRegistrations([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filtered =
    filter === "paid"
      ? registrations.filter((r) => r.status === "paid" || r.order_id)
      : filter === "pending"
        ? registrations.filter((r) => r.status !== "paid" && !r.order_id)
        : registrations

  const formatCents = (cents: number) => (cents / 100).toFixed(2)
  const totalPaid = registrations
    .filter((r) => r.status === "paid" || r.order_id)
    .reduce((sum, r) => sum + (r.reg_fee_cents || 0) + (r.apparel_fee_cents || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <a href="/admin/blue"><ArrowLeft className="h-4 w-4" /></a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">National team – NHSCA 2026 payments</h1>
            <p className="text-sm text-muted-foreground">Who has paid and who has not. All Stripe purchases are recorded as store products for revenue reporting.</p>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
              {error.includes("208") && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Run the SQL in <code className="bg-muted px-1 rounded">scripts/208-national-team-registrations-and-products.sql</code> in Supabase SQL Editor, then ensure the two products (NHSCA 2026 – Registration, NHSCA 2026 – Apparel) exist under category <code className="bg-muted px-1 rounded">national_team</code>.
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
                  <CardDescription>{paidCount} registration{paidCount !== 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-700">${(totalPaid / 100).toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Pending</CardTitle>
                  <CardDescription>{pendingCount} not yet paid</CardDescription>
                </CardHeader>
              </Card>
              <div className="flex gap-2">
                <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
                <Button variant={filter === "paid" ? "default" : "outline"} size="sm" onClick={() => setFilter("paid")}>Paid</Button>
                <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>Pending</Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Registrations</CardTitle>
                <CardDescription>NHSCA Duals 2026. Order link goes to store order for revenue by product.</CardDescription>
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
                          <TableHead>Reg</TableHead>
                          <TableHead>Apparel</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              {r.athlete_first_name} {r.athlete_last_name}
                            </TableCell>
                            <TableCell className="text-sm">{r.parent_email}</TableCell>
                            <TableCell className="text-sm">{r.high_school} ({r.graduation_year})</TableCell>
                            <TableCell>{r.primary_weight}</TableCell>
                            <TableCell>${formatCents(r.reg_fee_cents || 0)}</TableCell>
                            <TableCell>${formatCents(r.apparel_fee_cents || 0)}</TableCell>
                            <TableCell>
                              {r.status === "paid" || r.order_id ? (
                                <Badge className="bg-green-600">Paid</Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.order_id ? (
                                <a href={`/admin/orders/${r.order_id}`} className="text-[#03154C] hover:underline inline-flex items-center gap-1 text-sm">
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
      </div>
    </div>
  )
}
