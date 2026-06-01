"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  COMMITS_BY_COLLEGE_OTHER,
  COMMITS_BY_COLLEGE_TOP,
  COMMITS_BY_DIVISION,
} from "@/lib/content/recruiting-awards-2026"

const NAVY = "#13294B"
const GOLD = "#D3B574"
const BLUE = "#003366"

const COLLEGE_SHORT_NAMES: Record<string, string> = {
  "UNC Pembroke": "UNCP",
  "Appalachian State": "App State",
  "The Citadel": "Citadel",
  "Other programs (1 each)": "Other (17)",
}

const COLLEGE_CHART_ROWS = [
  ...COMMITS_BY_COLLEGE_TOP.map((row) => ({
    fullName: row.college,
    commits: row.commits,
    highlight: row.highlight,
  })),
  {
    fullName: COMMITS_BY_COLLEGE_OTHER.college,
    commits: COMMITS_BY_COLLEGE_OTHER.commits,
    highlight: false,
  },
]

const DIVISION_COLORS = [NAVY, BLUE, "#1a3a5c", "#475569", "#64748b", GOLD]

function useCompactCharts() {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const sync = () => setCompact(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return compact
}

function ChartSkeleton({ heightClass }: { heightClass: string }) {
  return (
    <div
      className={`${heightClass} w-full min-w-0 animate-pulse rounded-lg bg-slate-100`}
      aria-hidden
    />
  )
}

export function RecruitingAwardsCommitsByCollegeChart() {
  const [mounted, setMounted] = useState(false)
  const compact = useCompactCharts()

  useEffect(() => {
    setMounted(true)
  }, [])

  const chartData = useMemo(
    () =>
      COLLEGE_CHART_ROWS.map((row) => ({
        ...row,
        label: compact ? (COLLEGE_SHORT_NAMES[row.fullName] ?? row.fullName) : row.fullName,
      })),
    [compact],
  )

  const yAxisWidth = compact ? 92 : 128
  const chartHeightClass = compact ? "h-[460px]" : "h-[480px]"

  return (
    <div className="not-prose my-8 min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#003366]">Class of 2026 · male commits</p>
      <h3 className="mt-1 text-lg font-bold text-[#13294B]">Who Recruited the Most NC Talent — Class of 2026</h3>
      <p className="mt-2 text-sm text-slate-600">
        Forty-nine verified male commits. Top programs shown; remaining 17 programs landed one commit each.
      </p>
      <div className={`mt-4 w-full min-w-0 ${chartHeightClass}`}>
        {!mounted ? (
          <ChartSkeleton heightClass={chartHeightClass} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 8, right: compact ? 8 : 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" horizontal={false} />
              <XAxis type="number" allowDecimals={false} domain={[0, "dataMax + 1"]} tick={{ fontSize: compact ? 10 : 12 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={yAxisWidth}
                tick={{ fontSize: compact ? 10 : 11 }}
                interval={0}
              />
              <Tooltip
                formatter={(value: number) => [`${value} commit${value === 1 ? "" : "s"}`, "Total"]}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as { fullName?: string } | undefined
                  return row?.fullName ?? _label
                }}
                contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", maxWidth: 280 }}
              />
              <Bar dataKey="commits" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.fullName} fill={entry.highlight ? GOLD : NAVY} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export function RecruitingAwardsDivisionDonutChart() {
  const [mounted, setMounted] = useState(false)
  const compact = useCompactCharts()

  useEffect(() => {
    setMounted(true)
  }, [])

  const innerRadius = compact ? 48 : 60
  const outerRadius = compact ? 78 : 100
  const chartHeightClass = compact ? "h-[280px]" : "h-[360px]"

  return (
    <div className="not-prose my-8 min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#003366]">Division breakdown</p>
      <h3 className="mt-1 text-lg font-bold text-[#13294B]">Where the Class of 2026 Landed</h3>
      <p className="mt-2 text-sm text-slate-600">
        Includes the single Club commit (Andrew Davis, Liberty) so the total reconciles to 49 — the platform division widget
        shows 48 because Club is not bucketed there.
      </p>
      <div className={`mt-4 w-full min-w-0 ${chartHeightClass}`}>
        {!mounted ? (
          <ChartSkeleton heightClass={chartHeightClass} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[...COMMITS_BY_DIVISION]}
                dataKey="commits"
                nameKey="division"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
              >
                {COMMITS_BY_DIVISION.map((_, index) => (
                  <Cell key={COMMITS_BY_DIVISION[index].division} fill={DIVISION_COLORS[index % DIVISION_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, props) => {
                  const label = (props as { payload?: { division?: string } }).payload?.division ?? "Division"
                  return [`${value} (${Math.round((value / 49) * 100)}%)`, label]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-2 px-1 text-xs text-slate-700 sm:gap-x-4 sm:text-sm">
        {COMMITS_BY_DIVISION.map((row, index) => (
          <li key={row.division} className="inline-flex items-center gap-1.5 sm:gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm sm:h-3 sm:w-3"
              style={{ backgroundColor: DIVISION_COLORS[index % DIVISION_COLORS.length] }}
            />
            {row.division}: {row.commits}
          </li>
        ))}
      </ul>
    </div>
  )
}
