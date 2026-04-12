"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Period = "today" | "this_week" | "this_month" | "this_year"

const PERIODS: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
]

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

function Section({ title, total, children }: {
  title: string; total: number; children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <span className="text-lg font-bold">{fmt(total)}</span>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2">Item</th>
              <th className="text-right py-2">Count</th>
              <th className="text-right py-2">Revenue</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function Row({ label, count, revenue }: { label: string; count: number | string; revenue: number }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 font-medium">{label}</td>
      <td className="py-2 text-right text-muted-foreground">{count}</td>
      <td className="py-2 text-right">{fmt(revenue)}</td>
    </tr>
  )
}

export default function RevenuePage() {
  const [period, setPeriod] = useState<Period>("this_month")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/revenue?period=${period}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue</h1>
          <p className="text-muted-foreground">All businesses — every dollar in one place</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
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
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : data ? (
        <>
          {/* Grand Total */}
          <Card className="border-2 border-primary">
            <CardContent className="py-6 flex items-center justify-between">
              <p className="text-lg font-semibold">Total Revenue — All Businesses</p>
              <p className="text-3xl font-bold">{fmt(data.grandTotal)}</p>
            </CardContent>
          </Card>

          {/* Blue */}
          <Section title="Blue Program" total={data.blue.total}>
            <Row label="New members this period" count={data.blue.newMembers} revenue={data.blue.total} />
            <tr className="text-muted-foreground text-xs">
              <td colSpan={3} className="py-1">{data.blue.totalActive} total active members @ $55/mo</td>
            </tr>
          </Section>

          {/* Guild */}
          <Section title="Guild Bookings" total={data.guild.total}>
            {Object.entries(data.guild.bySessionType ?? {}).map(([type, vals]: any) => (
              <Row key={type} label={type} count={vals.count} revenue={vals.revenue} />
            ))}
          </Section>

          {/* Store */}
          <Section title="Apparel Store" total={data.store.total}>
            {data.store.products?.length > 0 ? (
              data.store.products.map((p: any) => (
                <Row key={p.name} label={p.name} count={p.units} revenue={p.revenue} />
              ))
            ) : (
              <tr><td colSpan={3} className="py-2 text-muted-foreground text-sm">No product breakdown available</td></tr>
            )}
          </Section>

          {/* Drop-In */}
          <Section title="Drop-In" total={data.dropIn.total}>
            <Row label="Practice drop-ins" count={data.dropIn.count} revenue={data.dropIn.total} />
          </Section>

          {/* Spartan */}
          <Section title="Spartan Donations" total={data.spartan.total}>
            {data.spartan.byAthlete?.length > 0 ? (
              data.spartan.byAthlete.map((a: any) => (
                <Row key={a.name} label={a.name} count="—" revenue={a.total} />
              ))
            ) : (
              <tr><td colSpan={3} className="py-2 text-muted-foreground text-sm">No donations this period</td></tr>
            )}
          </Section>
        </>
      ) : (
        <p className="text-muted-foreground">Failed to load revenue data.</p>
      )}
    </div>
  )
}
