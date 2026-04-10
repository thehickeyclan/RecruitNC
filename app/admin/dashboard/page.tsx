"use client"

import { useEffect, useState, type ComponentType } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingBag, Calendar, Flame } from "lucide-react"

type Period = "today" | "this_week" | "this_month" | "this_year"

type Category = "all" | "blue" | "store" | "guild" | "drop_in" | "spartan"

const PERIODS: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
]

const CATEGORIES: { label: string; value: Category }[] = [
  { label: "All", value: "all" },
  { label: "Blue", value: "blue" },
  { label: "Store", value: "store" },
  { label: "Guild", value: "guild" },
  { label: "Drop-In", value: "drop_in" },
  { label: "Spartan", value: "spartan" },
]

function Delta({ value, unit = "%" }: { value: number; unit?: string }) {
  const positive = value >= 0
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${positive ? "text-green-600" : "text-red-600"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value}
      {unit} vs prior
    </span>
  )
}

function KpiCard({
  title,
  icon: Icon,
  primary,
  secondary,
  delta,
  deltaUnit,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  primary: string
  secondary?: string
  delta: number
  deltaUnit?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{primary}</p>
        {secondary && <p className="text-sm text-muted-foreground">{secondary}</p>}
        <div className="mt-2">
          <Delta value={delta} unit={deltaUnit} />
        </div>
      </CardContent>
    </Card>
  )
}

function isDashboardPayload(d: unknown): d is {
  blue: Record<string, unknown>
  store: Record<string, unknown>
  guild: Record<string, unknown>
  dropIn: Record<string, unknown>
  spartan: Record<string, unknown>
} {
  if (!d || typeof d !== "object" || Array.isArray(d)) return false
  const o = d as Record<string, unknown>
  if ("error" in o) return false
  const blocks = [o.blue, o.store, o.guild, o.dropIn, o.spartan]
  return blocks.every((x) => x != null && typeof x === "object" && !Array.isArray(x))
}

export default function UnifiedDashboardPage() {
  const [period, setPeriod] = useState<Period>("this_week")
  const [category, setCategory] = useState<Category>("all")
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    fetch(`/api/admin/dashboard?period=${period}`, { credentials: "include" })
      .then(async (r) => {
        const d = (await r.json()) as { error?: string }
        if (!r.ok) {
          setLoadError(typeof d?.error === "string" ? d.error : `Request failed (${r.status})`)
          setData(null)
          setLoading(false)
          return
        }
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setLoadError("Network error loading dashboard.")
        setLoading(false)
      })
  }, [period])

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

  const payload = data as {
    blue?: { mrr: number; mrrDelta: number; subscribers: number; newThisPeriod: number; subscribersDelta: number }
    store?: {
      orderRevenue: number
      orderCount: number
      orderDelta: number
      dataAvailable?: boolean
      message?: string
    }
    guild?: {
      dataAvailable?: boolean
      message?: string
      bookingRevenue: number
      bookingCount: number
      bookingDelta: number
      bySessionType: Record<string, { count: number; revenue: number }>
    }
    dropIn?: { count: number; revenue: number; revenueDelta: number }
    spartan?: {
      total: number
      totalDelta: number
      donorCount: number
      byAthlete: { name: string; total: number }[]
    }
  } | null

  const showBlue = category === "all" || category === "blue"
  const showStore = category === "all" || category === "store"
  const showGuild = category === "all" || category === "guild"
  const showDropIn = category === "all" || category === "drop_in"
  const showSpartan = category === "all" || category === "spartan"

  const kpiCount = (showBlue ? 2 : 0) + (showStore ? 1 : 0) + (showGuild ? 1 : 0) + (showDropIn ? 1 : 0)
  const gridCols =
    kpiCount >= 5
      ? "lg:grid-cols-5"
      : kpiCount >= 4
        ? "lg:grid-cols-4"
        : kpiCount === 3
          ? "lg:grid-cols-3"
          : kpiCount === 2
            ? "lg:grid-cols-2"
            : "lg:grid-cols-1"

  const dashboardOk = isDashboardPayload(data)

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Dashboard</h1>
          <p className="text-muted-foreground">Revenue across all businesses</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === p.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  category === c.value
                    ? "bg-secondary text-secondary-foreground ring-1 ring-border"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {payload?.guild?.dataAvailable === false && payload.guild.message && showGuild ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          {payload.guild.message}
        </p>
      ) : null}

      {payload?.store?.dataAvailable === false && payload.store.message && showStore ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          {payload.store.message}
        </p>
      ) : null}

      {loadError ? (
        <p className="text-destructive">{loadError}</p>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="h-32 animate-pulse bg-muted rounded-md mt-4" />
            </Card>
          ))}
        </div>
      ) : dashboardOk ? (
        <>
          {(showBlue || showStore || showGuild || showDropIn) && (
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${gridCols}`}>
              {showBlue ? (
                <>
                  <KpiCard
                    title="Blue MRR"
                    icon={DollarSign}
                    primary={fmt(payload.blue!.mrr)}
                    secondary={`${payload.blue!.subscribers} subscribers`}
                    delta={payload.blue!.mrrDelta}
                  />
                  <KpiCard
                    title="Blue Subscribers"
                    icon={Users}
                    primary={payload.blue!.subscribers.toString()}
                    secondary={`+${payload.blue!.newThisPeriod} new this period`}
                    delta={payload.blue!.subscribersDelta}
                    deltaUnit=""
                  />
                </>
              ) : null}
              {showStore ? (
                <KpiCard
                  title="Store Orders"
                  icon={ShoppingBag}
                  primary={fmt(payload.store!.orderRevenue)}
                  secondary={`${payload.store!.orderCount} orders`}
                  delta={payload.store!.orderDelta}
                />
              ) : null}
              {showGuild ? (
                <KpiCard
                  title="Guild Bookings"
                  icon={Calendar}
                  primary={fmt(payload.guild!.bookingRevenue)}
                  secondary={`${payload.guild!.bookingCount} sessions`}
                  delta={payload.guild!.bookingDelta}
                />
              ) : null}
              {showDropIn && payload.dropIn ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Drop-In</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{fmt(payload.dropIn.revenue)}</p>
                    <p className="text-sm text-muted-foreground">{payload.dropIn.count} sessions</p>
                    <div className="mt-2">
                      <Delta value={payload.dropIn.revenueDelta} />
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}

          {showGuild ? (
            <Card>
              <CardHeader>
                <CardTitle>Guild — Session Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2">Session Type</th>
                      <th className="text-right py-2">Count</th>
                      <th className="text-right py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(payload.guild!.bySessionType).map(([type, vals]) => (
                      <tr key={type} className="border-b last:border-0">
                        <td className="py-3 font-medium capitalize">{type}</td>
                        <td className="py-3 text-right">{vals.count}</td>
                        <td className="py-3 text-right">{fmt(vals.revenue)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-3">Total</td>
                      <td className="py-3 text-right">{payload.guild!.bookingCount}</td>
                      <td className="py-3 text-right">{fmt(payload.guild!.bookingRevenue)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}

          {showSpartan && payload.spartan ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-red-600" />
                  Spartan Donations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-8">
                  <div>
                    <p className="text-2xl font-bold">{fmt(payload.spartan.total)}</p>
                    <p className="text-sm text-muted-foreground">Total donations</p>
                    <Delta value={payload.spartan.totalDelta} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{payload.spartan.donorCount}</p>
                    <p className="text-sm text-muted-foreground">Donors</p>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2">Athlete</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.spartan.byAthlete.map((a, idx) => (
                      <tr key={`${a.name}-${idx}`} className="border-b last:border-0">
                        <td className="py-2 font-medium">{a.name}</td>
                        <td className="py-2 text-right">{fmt(a.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
      )}
    </div>
  )
}
