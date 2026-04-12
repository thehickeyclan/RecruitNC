"use client"

import { useEffect, useState } from "react"
import { HardLink } from "@/components/hard-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Loader2, ArrowLeft, Store, Dumbbell, Droplets, Flame } from "lucide-react"

type Period = "today" | "this_week" | "this_month" | "this_year"

const PERIODS: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
]

type RevenuePayload = {
  period: Period
  grandTotal: number
  blue: { total: number; newMembers: number; totalActive: number }
  guild: {
    total: number
    count: number
    bySessionType: Record<string, unknown>
    dataAvailable: boolean
  }
  store: {
    total: number
    count: number
    products: unknown[]
    dataAvailable: boolean
  }
  dropIn: { total: number; count: number }
  spartan: { total: number; byAthlete: { name: string; total: number }[] }
}

export default function AdminRevenuePage() {
  const [period, setPeriod] = useState<Period>("this_month")
  const [data, setData] = useState<RevenuePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/revenue?period=${encodeURIComponent(period)}`, { credentials: "include" })
      .then(async (r) => {
        const json = (await r.json()) as { error?: string } & Partial<RevenuePayload>
        if (!r.ok) {
          setError(typeof json.error === "string" ? json.error : `Request failed (${r.status})`)
          setData(null)
          return
        }
        setData(json as RevenuePayload)
      })
      .catch(() => {
        setError("Network error loading revenue.")
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [period])

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <HardLink
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin home
          </HardLink>
          <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-emerald-700" />
            Cross-business revenue
          </h1>
          <p className="text-muted-foreground mt-1">
            Combined snapshot (Blue new seats × $55, Guild, Store, Drop-ins, Spartan) for the selected window.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              type="button"
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={period === p.value ? "bg-[#003366]" : ""}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading revenue…
        </div>
      )}

      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-red-800">{error}</CardContent>
        </Card>
      )}

      {!loading && data && (
        <>
          <Card className="border-2 border-emerald-700/30 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader>
              <CardTitle className="text-lg text-emerald-900">Grand total</CardTitle>
              <CardDescription>Sum of all segments below for {data.period.replace(/_/g, " ")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold tracking-tight text-emerald-900">{fmt(data.grandTotal)}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Flame className="h-4 w-4 text-blue-700" />
                  Blue (new seats × $55)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(data.blue.total)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.blue.newMembers} new in period · {data.blue.totalActive} active / paused total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Wrestling Guild
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(data.guild.total)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.guild.count} bookings
                  {!data.guild.dataAvailable && " · external data unavailable"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(data.store.total)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.store.count} orders
                  {!data.store.dataAvailable && " · external data unavailable"}
                </p>
                {Array.isArray(data.store.products) && data.store.products.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-auto rounded border text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2">Product</th>
                          <th className="p-2 text-right">$</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.store.products.map((row, i) => {
                          const r = row as Record<string, unknown>
                          const name = String(r.name ?? r.title ?? r.sku ?? "Item")
                          const rev = Number(r.revenue ?? r.total ?? 0)
                          return (
                            <tr key={i} className="border-b border-muted last:border-0">
                              <td className="p-2">{name}</td>
                              <td className="p-2 text-right">{fmt(rev)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Drop-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(data.dropIn.total)}</p>
                <p className="text-sm text-muted-foreground mt-1">{data.dropIn.count} paid requests</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Spartan fundraising</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-3">{fmt(data.spartan.total)}</p>
                {data.spartan.byAthlete.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No paid donations in this period.</p>
                ) : (
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="p-2 font-medium">Athlete / fund</th>
                          <th className="p-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.spartan.byAthlete.map((row, i) => (
                          <tr key={i} className="border-b border-muted last:border-0">
                            <td className="p-2">{row.name}</td>
                            <td className="p-2 text-right">{fmt(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            For period-over-period trends and deltas, use{" "}
            <HardLink href="/admin/dashboard" className="text-[#003366] underline underline-offset-2">
              Executive Dashboard
            </HardLink>
            .
          </p>
        </>
      )}
    </div>
  )
}
