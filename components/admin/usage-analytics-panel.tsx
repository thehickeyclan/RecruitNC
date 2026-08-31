"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, BarChart3, Sparkles, TrendingDown, TrendingUp, Users } from "lucide-react"
import { SECTION_LABELS, type SectionKey } from "@/lib/admin/usage-analytics"

const INK = "#0A1628"
const SURFACE = "#0f1c2e"
const GOLD = "#D3B574"
const LINE = "rgba(255,255,255,0.10)"

type Totals = { views: number; people: number }
type DailyPoint = { day: string; views: number; people: number }
type Insight = { tone: "up" | "down" | "flat" | "note"; text: string }
type Section = { section: SectionKey; label: string; views: number; people: number; topPaths: { path: string; views: number }[] }
type PowerUser = { userId: string; name: string; email: string | null; views: number; activeDays: number; lastSeen: string; topSection: SectionKey }

type Usage = {
  totalEvents: number
  daily: DailyPoint[]
  insights: Insight[]
  windows: Record<string, Totals>
  months: { thisMonth: Totals & { label: string }; lastMonth: Totals & { label: string }; viewChangePct: number | null }
  sections: Section[]
  powerUsers: PowerUser[]
}

const RANGES = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "ytd", label: "YTD", days: null },
  { key: "all", label: "All", days: null },
] as const

type RangeKey = (typeof RANGES)[number]["key"]
type ChartKind = "area" | "line" | "bar"

function shortDay(day: string): string {
  const [, month, date] = day.split("-")
  return `${month}/${date}`
}

/**
 * How the site is being used.
 *
 * Built to sit with the rest of the admin — the same ink and gold as the store analytics, not the
 * white cards the first version shipped with.
 *
 * The whole daily series arrives once and every control filters it in the browser. Switching range
 * or chart type is instant, and an admin comparing thirty days against ninety is not waiting on a
 * round trip to do it.
 */
export function UsageAnalyticsPanel() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>("30d")
  const [chart, setChart] = useState<ChartKind>("area")
  const [metric, setMetric] = useState<"views" | "people">("views")

  useEffect(() => {
    fetch("/api/admin/analytics/usage", { cache: "no-store", credentials: "include" })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? "Could not load usage.")
        setUsage(data)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load usage."))
  }, [])

  const series = useMemo(() => {
    if (!usage) return []
    const chosen = RANGES.find((r) => r.key === range)
    if (!chosen) return usage.daily
    if (chosen.key === "all") return usage.daily
    if (chosen.key === "ytd") {
      const year = usage.daily[usage.daily.length - 1]?.day.slice(0, 4) ?? ""
      return usage.daily.filter((p) => p.day.startsWith(year))
    }
    return usage.daily.slice(-(chosen.days ?? 30))
  }, [usage, range])

  const rangeTotals = useMemo(
    () => series.reduce((sum, p) => ({ views: sum.views + p.views, peak: Math.max(sum.peak, p.people) }), { views: 0, peak: 0 }),
    [series],
  )

  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
    )
  }
  if (!usage) {
    return <div className="mb-6 rounded-xl border border-white/10 bg-[#0f1c2e] px-4 py-6 text-sm text-white/60">Loading usage…</div>
  }

  const { months } = usage
  const up = months.viewChangePct !== null && months.viewChangePct >= 0
  const maxSection = Math.max(...usage.sections.map((s) => s.views), 1)

  const chartColour = metric === "views" ? GOLD : "#6ea8ff"
  const chartData = series.map((p) => ({ ...p, label: shortDay(p.day) }))

  const axis = { stroke: "rgba(255,255,255,0.35)", fontSize: 11 }
  const tooltip = {
    contentStyle: { background: INK, border: `1px solid ${LINE}`, borderRadius: 12, color: "white" },
    labelStyle: { color: "rgba(255,255,255,0.6)" },
  }

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-[#0A1628] p-5 text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D3B574]">Product analytics</p>
          <h2 className="mt-1 text-2xl font-extrabold">How the site is being used</h2>
          <p className="mt-1 text-sm text-white/55">
            Signed-in page views · {usage.totalEvents.toLocaleString()} recorded
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <TabsList className="border border-white/10 bg-[#0f1c2e]">
              {RANGES.map((r) => (
                <TabsTrigger
                  key={r.key}
                  value={r.key}
                  className="text-white/60 data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628]"
                >
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Tabs value={chart} onValueChange={(v) => setChart(v as ChartKind)}>
            <TabsList className="border border-white/10 bg-[#0f1c2e]">
              {(["area", "line", "bar"] as ChartKind[]).map((kind) => (
                <TabsTrigger
                  key={kind}
                  value={kind}
                  className="capitalize text-white/60 data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628]"
                >
                  {kind}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as "views" | "people")}>
            <TabsList className="border border-white/10 bg-[#0f1c2e]">
              <TabsTrigger value="views" className="text-white/60 data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628]">
                Views
              </TabsTrigger>
              <TabsTrigger value="people" className="text-white/60 data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628]">
                People
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Insights: computed from the rows, never estimated. */}
      <ul className="mt-5 grid gap-2 md:grid-cols-2">
        {usage.insights.map((insight) => (
          <li
            key={insight.text}
            className="flex items-start gap-2 rounded-xl border border-white/10 bg-[#0f1c2e] px-3 py-2 text-sm text-white/80"
          >
            {insight.tone === "up" ? (
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : insight.tone === "down" ? (
              <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            ) : (
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#D3B574]" />
            )}
            <span>{insight.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-white/70">
              {metric === "views" ? "Views" : "People"} per day
            </h3>
            <span className="text-xs text-white/45">
              {rangeTotals.views.toLocaleString()} views over {series.length} days
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            {chart === "area" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColour} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={chartColour} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={LINE} vertical={false} />
                <XAxis dataKey="label" {...axis} tickLine={false} minTickGap={24} />
                <YAxis {...axis} tickLine={false} axisLine={false} width={38} />
                <Tooltip {...tooltip} />
                <Area type="monotone" dataKey={metric} stroke={chartColour} strokeWidth={2} fill="url(#usageFill)" />
              </AreaChart>
            ) : chart === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid stroke={LINE} vertical={false} />
                <XAxis dataKey="label" {...axis} tickLine={false} minTickGap={24} />
                <YAxis {...axis} tickLine={false} axisLine={false} width={38} />
                <Tooltip {...tooltip} />
                <Line type="monotone" dataKey={metric} stroke={chartColour} strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid stroke={LINE} vertical={false} />
                <XAxis dataKey="label" {...axis} tickLine={false} minTickGap={24} />
                <YAxis {...axis} tickLine={false} axisLine={false} width={38} />
                <Tooltip {...tooltip} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                <Bar dataKey={metric} fill={chartColour} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Activity className="h-4 w-4 text-[#D3B574]" />
            This month against last
          </h3>
          <p className="mt-3 text-4xl font-extrabold leading-none">{months.thisMonth.views.toLocaleString()}</p>
          <p className="mt-1 text-sm text-white/55">{months.thisMonth.people} people this month</p>
          <div className="mt-3 flex items-center gap-2">
            {months.viewChangePct !== null ? (
              <span
                className={`rounded-full px-2.5 py-1 text-sm font-bold ${up ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}
              >
                {up ? "+" : ""}
                {months.viewChangePct}%
              </span>
            ) : null}
            <span className="text-sm text-white/45">
              vs {months.lastMonth.views.toLocaleString()} last month
            </span>
          </div>
          <p className="mt-3 text-xs text-white/40">
            The current month is still running, so it only compares like for like at month end.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["today", "week", "month", "quarter", "year", "all"] as const).map((key) => (
              <div key={key} className="rounded-lg border border-white/10 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{key}</p>
                <p className="text-lg font-bold leading-tight">{usage.windows[key]?.views.toLocaleString() ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <BarChart3 className="h-4 w-4 text-[#D3B574]" />
            Where people go
          </h3>
          <ul className="mt-3 flex flex-col gap-3">
            {usage.sections.map((section) => (
              <li key={section.section}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">
                    {section.label}
                    {section.section === "admin" ? (
                      <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white/50">
                        your team
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-white/55">
                    {section.views.toLocaleString()} · {section.people}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, Math.round((section.views / maxSection) * 100))}%`,
                      background: section.section === "admin" ? "rgba(255,255,255,0.25)" : GOLD,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Users className="h-4 w-4 text-[#D3B574]" />
            Most engaged
          </h3>
          <p className="mt-1 text-xs text-white/40">
            By days active, not clicks — somebody here every week matters more than one long session.
          </p>
          <ul className="mt-3 flex flex-col">
            {usage.powerUsers.slice(0, 12).map((user) => (
              <li
                key={user.userId}
                className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1.5 text-sm last:border-0"
              >
                <div className="min-w-0">
                  <span className="font-semibold">{user.name}</span>
                  <span className="block truncate text-xs text-white/40">
                    mostly {SECTION_LABELS[user.topSection]}
                  </span>
                </div>
                <span className="shrink-0 text-white/60">
                  <span className="font-bold text-[#D3B574]">{user.activeDays}d</span> · {user.views.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
