"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, ExternalLink, DollarSign } from "lucide-react"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"

type Registration = {
  id: string
  event_slug: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_email: string
  parent_email: string
  /** RecruitNC account email when parent_user_id is set (so you can compare to registration email). */
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
}

export default function AdminBlueNationalTeamPaymentsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [paidCount, setPaidCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all")
  const [error, setError] = useState<string | null>(null)
  const [recordEdits, setRecordEdits] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

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
      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, record: value.trim() || null } : r))
      )
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
            <a href="/admin/blue"><ArrowLeft className="h-4 w-4" /></a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">National team – NHSCA 2026 payments</h1>
            <p className="text-sm text-muted-foreground">Who has paid and who has not. All Stripe purchases are recorded as store products for revenue reporting.</p>
          </div>
        </div>

        {error && isBlueAuthError(error) && (
          <BlueAdminAuthBanner returnTo="/admin/blue/national-team-payments" />
        )}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
              {(error === "Not signed in." || error === "Admin access required.") && (
                <p className="mt-3">
                  <a href="/auth/signin?returnTo=/admin/blue/national-team-payments" className="text-[#003366] font-medium underline">Sign in again</a>
                </p>
              )}
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
                <CardDescription>National and Select teams. Parent email = address they registered with. &quot;✓ same account&quot; or &quot;Login: …&quot; shows RecruitNC login when different.</CardDescription>
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
                          <TableHead className="whitespace-nowrap">Record</TableHead>
                          <TableHead>Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              {r.athlete_first_name} {r.athlete_last_name}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {r.event_slug === "nhsca-duals-2026-select" ? "Select" : "National"}
                            </TableCell>
                            <TableCell className="text-sm">
                              <span title="Email used when they registered">{r.parent_email}</span>
                              {r.linked_account_email != null && r.linked_account_email !== "" && (
                                <>
                                  <br />
                                  <span className="text-muted-foreground text-xs" title="RecruitNC login (if different, they signed in with another account)">
                                    {r.linked_account_email.toLowerCase() === (r.parent_email ?? "").toLowerCase()
                                      ? "✓ same account"
                                      : `Login: ${r.linked_account_email}`}
                                  </span>
                                </>
                              )}
                            </TableCell>
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
                                    (e.target as HTMLInputElement).blur()
                                  }
                                }}
                                disabled={savingId === r.id}
                              />
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
