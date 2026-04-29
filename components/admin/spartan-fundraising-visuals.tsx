"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trophy, Maximize2, BarChart3, PieChart as PieChartIcon, Camera } from "lucide-react"
import { cn } from "@/lib/utils"

type SpartanDonationRow = {
  sessionId: string
  createdIso: string
  createdUnix: number
  amountCents: number
  currency: string
  athleteCode: string | null
  athleteDisplayName: string | null
  manualCreditName: string | null
  attribution: "athlete" | "general_nc_united" | "manual_name"
}

type SpartanAthleteAggregate = {
  athleteCode: string
  totalCents: number
  donationCount: number
  raceSignupCount: number
  reimbursementsPaidCents?: number
  netAfterReimbursementsCents?: number
  guildAllocationsCents?: number
}

function notionalAfterGuildCents(a: SpartanAthleteAggregate): number {
  const net = a.netAfterReimbursementsCents ?? a.totalCents - (a.reimbursementsPaidCents ?? 0)
  return net - (a.guildAllocationsCents ?? 0)
}

const CHART_COLORS = ["#003366", "#C8102E", "#D3B574", "#0e7490", "#7c3aed", "#ea580c", "#15803d", "#be185d"]

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

function buildCodeToLabel(donations: SpartanDonationRow[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const d of donations) {
    const code = d.athleteCode?.trim()
    if (!code) continue
    if (m.has(code)) continue
    const label =
      d.athleteDisplayName?.trim() ||
      d.manualCreditName?.trim() ||
      code
    m.set(code, label)
  }
  return m
}

type IgFormat = "feed" | "story" | "square" | "ratio56"

const IG_META: Record<IgFormat, { label: string; aspect: string; hint: string }> = {
  feed: { label: "Feed 4:5", aspect: "aspect-[4/5]", hint: "Classic portrait feed (~1080×1350)" },
  story: { label: "Story 9:16", aspect: "aspect-[9/16]", hint: "Full-screen story" },
  square: { label: "Square 1:1", aspect: "aspect-square", hint: "Grid / carousel" },
  ratio56: { label: "5:6", aspect: "aspect-[5/6]", hint: "Tall portrait (5×6 style)" },
}

function IgShareCard({
  format,
  totalCents,
  giftCount,
  topRows,
  campaignLabel,
}: {
  format: IgFormat
  totalCents: number
  giftCount: number
  topRows: { rank: number; label: string; cents: number }[]
  campaignLabel: string
}) {
  const meta = IG_META[format]
  return (
    <div
      className={cn(
        "relative w-full max-w-[420px] overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl",
        meta.aspect,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#021a33] via-[#0a3566] to-[#1a0a0c]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(200,16,46,0.25),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(211,181,116,0.12),_transparent_50%)]" />
      <div className="relative flex h-full flex-col p-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#D3B574]/90">NC United × Spartan</p>
        <h2 className="mt-2 font-[family-name:var(--font-barlow-spartan,system-ui)] text-2xl font-black uppercase leading-tight tracking-tight md:text-3xl">
          {campaignLabel}
        </h2>
        <p className="mt-1 text-xs text-white/70">Campaign snapshot</p>

        <div className="mt-6 rounded-xl border border-white/15 bg-black/25 px-4 py-5 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#D3B574]">Net (after reimb.)</p>
          <p className="mt-1 text-4xl font-black tabular-nums tracking-tight text-white md:text-5xl">{formatMoney(totalCents)}</p>
          <p className="mt-2 text-xs text-white/60">{giftCount} gifts in window · team snapshot</p>
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-hidden">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Top supporters by athlete</p>
          <ul className="mt-3 space-y-2.5">
            {topRows.slice(0, 5).map((row) => (
              <li
                key={row.rank}
                className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 text-sm last:border-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-[#D3B574]">
                    {row.rank}
                  </span>
                  <span className="truncate font-medium">{row.label}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums text-[#D3B574]">{formatMoney(row.cents)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="text-center text-[11px] font-medium text-white/55">
            app.ncwrestlingunited.com/spartan · EIN: 99-3757238
          </p>
          <p className="text-center text-[10px] text-white/40">501(c)(3) · NC United Wrestling</p>
        </div>
      </div>
    </div>
  )
}

export type SpartanFundraisingVisualsProps = {
  donations: SpartanDonationRow[] | null
  byAthlete: SpartanAthleteAggregate[] | null
  generalTotalCents: number
  /** Sum of athlete reimbursements marked paid in the same lookback window as donations */
  reimbursementsPaidTotalCents?: number
  /** Same as sum of session amounts; defaults derived from donations if omitted */
  grossSessionTotalCents?: number
  /** grossSessionTotalCents - reimbursementsPaidTotalCents */
  netAfterReimbursementsCents?: number
  onPickAthlete: (code: string) => void
  selectedAthleteFilter: string
  /** When wrapped by Admin Fundraising outer card — lighter nested chrome and shorter titles. */
  embedded?: boolean
}

export function SpartanFundraisingVisuals({
  donations,
  byAthlete,
  generalTotalCents,
  reimbursementsPaidTotalCents = 0,
  grossSessionTotalCents,
  netAfterReimbursementsCents,
  onPickAthlete,
  selectedAthleteFilter,
  embedded = false,
}: SpartanFundraisingVisualsProps) {
  const [igFormat, setIgFormat] = useState<IgFormat>("feed")

  const codeToLabel = useMemo(() => (donations ? buildCodeToLabel(donations) : new Map<string, string>()), [donations])

  const topAthletesChart = useMemo(() => {
    if (!byAthlete?.length) return []
    const sorted = [...byAthlete]
      .sort((a, b) => notionalAfterGuildCents(b) - notionalAfterGuildCents(a))
      .slice(0, 12)
    return sorted.map((a) => {
      const netC = notionalAfterGuildCents(a)
      return {
      name:
        (codeToLabel.get(a.athleteCode) ?? a.athleteCode).length > 22
          ? `${(codeToLabel.get(a.athleteCode) ?? a.athleteCode).slice(0, 20)}…`
          : codeToLabel.get(a.athleteCode) ?? a.athleteCode,
      fullName: codeToLabel.get(a.athleteCode) ?? a.athleteCode,
      code: a.athleteCode,
      total: Math.round(netC / 100),
      cents: netC,
      raised: a.totalCents,
      reimb: a.reimbursementsPaidCents ?? 0,
      gifts: a.donationCount,
    }})
  }, [byAthlete, codeToLabel])

  const pieSlices = useMemo(() => {
    if (!donations?.length) return []
    let athleteCents = 0
    let generalCents = 0
    for (const d of donations) {
      if (d.attribution === "general_nc_united" && !d.athleteCode?.trim() && !d.manualCreditName?.trim()) {
        generalCents += d.amountCents
      } else {
        athleteCents += d.amountCents
      }
    }
    const out = []
    if (athleteCents > 0) out.push({ name: "Credited to wrestlers", value: athleteCents, key: "athlete" })
    if (generalCents > 0) out.push({ name: "NC United (general)", value: generalCents, key: "general" })
    if (out.length === 0 && donations.length)
      out.push({ name: "All gifts", value: donations.reduce((s, d) => s + d.amountCents, 0), key: "all" })
    return out
  }, [donations])

  const dailySeries = useMemo(() => {
    if (!donations?.length) return []
    const dayMap = new Map<string, number>()
    for (const d of donations) {
      const day = d.createdIso.slice(0, 10)
      dayMap.set(day, (dayMap.get(day) ?? 0) + d.amountCents)
    }
    const days = [...dayMap.keys()].sort()
    return days.map((date) => ({
      date: date.slice(5),
      dollars: Math.round((dayMap.get(date) ?? 0) / 100),
    }))
  }, [donations])

  const totals = useMemo(() => {
    if (!donations) return { totalCents: 0, count: 0, avgCents: 0 }
    const totalCents = donations.reduce((s, d) => s + d.amountCents, 0)
    const count = donations.length
    return { totalCents, count, avgCents: count ? Math.round(totalCents / count) : 0 }
  }, [donations])

  const grossCents = typeof grossSessionTotalCents === "number" ? grossSessionTotalCents : totals.totalCents
  const netCents = typeof netAfterReimbursementsCents === "number" ? netAfterReimbursementsCents : grossCents - reimbursementsPaidTotalCents

  const leaderboardRows = useMemo(() => {
    if (!byAthlete?.length) return []
    return [...byAthlete]
      .sort((a, b) => notionalAfterGuildCents(b) - notionalAfterGuildCents(a))
      .map((a, i) => ({
        rank: i + 1,
        code: a.athleteCode,
        label: codeToLabel.get(a.athleteCode) ?? a.athleteCode,
        cents: notionalAfterGuildCents(a),
        raised: a.totalCents,
        reimb: a.reimbursementsPaidCents ?? 0,
        gifts: a.donationCount,
        races: a.raceSignupCount,
      }))
  }, [byAthlete, codeToLabel])

  const igTopRows = useMemo(() => leaderboardRows.slice(0, 8), [leaderboardRows])

  if (!donations) {
    return (
      <div
        className={
          embedded
            ? "rounded-lg border border-dashed py-10 text-center text-muted-foreground"
            : "rounded-xl border border-dashed py-10 text-center text-muted-foreground"
        }
      >
        <BarChart3 className="mx-auto mb-2 h-10 w-10 opacity-40" />
        <p className="text-sm">Load donations to show KPIs, charts, leaderboard, and social export.</p>
      </div>
    )
  }

  if (donations.length === 0) {
    return (
      <div className={embedded ? "rounded-lg border py-8 text-center text-sm text-muted-foreground" : ""}>
        {embedded ? (
          <p>No paid sessions in this window.</p>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No paid sessions in this window — nothing to chart yet.
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const campaignLabel = "Spartan Fayetteville 2026"

  const nestCard = embedded ? "border-muted/60 shadow-none" : ""

  return (
    <div className={cn("space-y-6", embedded && "space-y-5")}>
      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Gross in window", value: formatMoney(grossCents), sub: "All paid checkouts (Stripe)", accent: "from-[#003366] to-[#0c4a6e]" },
          { label: "Reimbursements paid", value: formatMoney(reimbursementsPaidTotalCents), sub: "Out; same lookback as gifts", accent: "from-[#9f1239] to-[#7f1d1d]" },
          { label: "Net (after reimb.)", value: formatMoney(netCents), sub: "Gross − paid reimbursements", accent: "from-[#0f766e] to-[#115e59]" },
          { label: "Gifts", value: String(totals.count), sub: "Paid sessions", accent: "from-[#C8102E] to-[#9f0c24]" },
          {
            label: "NC United fund",
            value: formatMoney(generalTotalCents),
            sub: "Community (same roll-up as /spartan)",
            accent: "from-[#0e7490] to-[#0f5c73]",
          },
          { label: "Average gift", value: formatMoney(totals.avgCents), sub: "Per checkout", accent: "from-[#6d28d9] to-[#5b21b6]" },
        ].map((k) => (
          <div
            key={k.label}
            className={cn(
              "rounded-xl bg-gradient-to-br p-4 text-white shadow-lg",
              k.accent,
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{k.label}</p>
            <p className="mt-2 text-2xl font-black tabular-nums">{k.value}</p>
            <p className="mt-1 text-xs text-white/70">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={nestCard}>
          <CardHeader className={embedded ? "py-3" : undefined}>
            <CardTitle className={cn("flex items-center gap-2 text-[#003366]", embedded && "text-base")}>
              <BarChart3 className="h-5 w-5 shrink-0" />
              {embedded ? "Top athletes by net" : "Top athletes (click a bar to filter the table)"}
            </CardTitle>
            <CardDescription className={embedded ? "text-xs" : undefined}>
              {embedded
                ? "Click a bar to filter the donation list — net per wrestler after reimb. (window)."
                : (
                  <>
                    Horizontal bars — <strong>net</strong> per wrestler (raised minus reimb. paid in window), top 12.
                  </>
                )}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[340px] pl-0">
            {topAthletesChart.length === 0 ? (
              <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-sm">
                No per-athlete totals yet (gifts may all be general fund).
              </p>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAthletesChart} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(v) => `$${v}`} fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Net"]}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { fullName?: string; raised?: number; reimb?: number } | undefined
                    return p ? `${p.fullName ?? ""} · raised $${(p.raised / 100).toFixed(0)} · reimb $${(p.reimb / 100).toFixed(0)}` : ""
                  }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar
                  dataKey="total"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data: unknown, index?: number) => {
                    const row = data as { code?: string; payload?: { code?: string } }
                    const code = row?.code ?? row?.payload?.code
                    if (code) {
                      onPickAthlete(code)
                      return
                    }
                    if (typeof index === "number" && topAthletesChart[index]?.code) {
                      onPickAthlete(topAthletesChart[index].code)
                    }
                  }}
                >
                  {topAthletesChart.map((entry, i) => (
                    <Cell
                      key={entry.code}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      opacity={selectedAthleteFilter && entry.code === selectedAthleteFilter ? 1 : 0.85}
                      stroke={selectedAthleteFilter === entry.code ? "#111827" : "none"}
                      strokeWidth={2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className={nestCard}>
          <CardHeader className={embedded ? "py-3" : undefined}>
            <CardTitle className={cn("flex items-center gap-2 text-[#003366]", embedded && "text-base")}>
              <PieChartIcon className="h-5 w-5 shrink-0" />
              Where gifts go
            </CardTitle>
            <CardDescription className={embedded ? "text-xs" : undefined}>
              Wrestler-attributed vs NC United general pool (metadata).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
            {pieSlices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieSlices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {pieSlices.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground flex h-full items-center justify-center text-sm">No split data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {dailySeries.length > 1 && (
        <Card className={nestCard}>
          <CardHeader className={embedded ? "py-3" : undefined}>
            <CardTitle className={cn("text-[#003366]", embedded && "text-base")}>Gifts by day</CardTitle>
            <CardDescription className={embedded ? "text-xs" : undefined}>Running total dollars per calendar day.</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis tickFormatter={(v) => `$${v}`} fontSize={11} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Day total"]} />
                <Line type="monotone" dataKey="dollars" stroke="#003366" strokeWidth={3} dot={{ fill: "#C8102E", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className={nestCard}>
        <CardHeader className={embedded ? "py-3" : undefined}>
          <CardTitle className={cn("flex items-center gap-2 text-[#003366]", embedded && "text-base")}>
            <Trophy className={cn("h-6 w-6 text-[#D3B574]", embedded && "h-5 w-5")} />
            {embedded ? "Rankings (click → filter)" : "Full leaderboard"}
          </CardTitle>
          <CardDescription className={embedded ? "text-xs" : undefined}>
            Same net logic as Totals by athlete.{" "}
            {selectedAthleteFilter ? (
              <button
                type="button"
                className="text-primary font-medium underline underline-offset-2"
                onClick={() => onPickAthlete("")}
              >
                Clear filter
              </button>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboardRows.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No athlete-level rollup in this window.</p>
          ) : (
          <div className="max-h-[420px] overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/95 backdrop-blur">
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Athlete</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-right">Raised</th>
                  <th className="px-3 py-2 text-right">Reimb</th>
                  <th className="px-3 py-2 text-right">Gifts</th>
                  <th className="px-3 py-2 text-right">Race path</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardRows.map((row) => (
                  <tr
                    key={row.code}
                    className={cn(
                      "border-b border-border/60 cursor-pointer transition-colors hover:bg-[#003366]/8",
                      selectedAthleteFilter === row.code && "bg-[#003366]/12",
                    )}
                    onClick={() => onPickAthlete(row.code)}
                  >
                    <td className="px-3 py-2.5 font-bold text-[#D3B574]">{row.rank}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{row.label}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{row.code}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-green-800">{formatMoney(row.cents)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatMoney(row.raised)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.reimb > 0 ? formatMoney(row.reimb) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{row.gifts}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{row.races}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      <Card
        className={cn(
          nestCard,
          "overflow-hidden border-2 border-[#003366]/20 bg-gradient-to-b from-slate-50 to-white",
        )}
      >
        <CardHeader className={embedded ? "py-3" : undefined}>
          <CardTitle className={cn("flex items-center gap-2 text-[#003366]", embedded && "text-base")}>
            <Camera className="h-5 w-5 shrink-0" />
            {embedded ? "Social layouts (screenshot)" : "Instagram graphics"}
          </CardTitle>
          <CardDescription className={embedded ? "text-xs" : undefined}>
            Aspect presets — fullscreen dialog for a clean capture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={igFormat} onValueChange={(v) => setIgFormat(v as IgFormat)}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {(Object.keys(IG_META) as IgFormat[]).map((k) => (
                <TabsTrigger key={k} value={k} className="text-xs">
                  {IG_META[k].label}
                </TabsTrigger>
              ))}
            </TabsList>
            {(Object.keys(IG_META) as IgFormat[]).map((k) => (
              <TabsContent key={k} value={k} className="mt-4">
                <p className="text-muted-foreground mb-4 text-xs">{IG_META[k].hint}</p>
                <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                  <IgShareCard
                    format={k}
                    totalCents={netCents}
                    giftCount={totals.count}
                    topRows={igTopRows.map((r) => ({ rank: r.rank, label: r.label, cents: r.cents }))}
                    campaignLabel={campaignLabel}
                  />
                  <div className="flex max-w-xs flex-col gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" className="gap-2 bg-[#003366] hover:bg-[#004080]">
                          <Maximize2 className="h-4 w-4" />
                          Open fullscreen ({IG_META[k].label})
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[95vh] overflow-y-auto border-none bg-black/95 p-6 sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-white">Screenshot this slide</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center py-4">
                          <IgShareCard
                            format={k}
                            totalCents={netCents}
                            giftCount={totals.count}
                            topRows={igTopRows.map((r) => ({ rank: r.rank, label: r.label, cents: r.cents }))}
                            campaignLabel={campaignLabel}
                          />
                        </div>
                        <p className="text-center text-xs text-white/60">
                          Use your phone or desktop screenshot tool. For best quality, zoom page to 100% before capture.
                        </p>
                      </DialogContent>
                    </Dialog>
                    <p className="text-muted-foreground text-xs">
                      Tip: hide browser UI (F11) or use mobile Safari full-page screenshot for Stories.
                    </p>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
