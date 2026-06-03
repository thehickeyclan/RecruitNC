"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts"
import { ArrowLeft, Loader2, TrendingUp, Users, GraduationCap, DollarSign } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BlueReportsData } from "@/app/api/admin/blue/reports/route"
import { BlueAdminAuthBanner } from "@/components/blue-admin-auth-banner"

const NAVY = "#13294B"
const GOLD = "#D3B574"
const BLUE_DATA_RETRY_MS = 2000

type BillingView = "week" | "month"

export default function AdminBlueReportsPage() {
  const [data, setData] = useState<BlueReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [backfilling, setBackfilling] = useState(false)
  const [syncDropInsLoading, setSyncDropInsLoading] = useState(false)
  const [syncDropInsResult, setSyncDropInsResult] = useState<string | null>(null)
  const [authError, setAuthError] = useState(false)
  const [billingView, setBillingView] = useState<BillingView>("month")
  const { isLoading: authLoading } = useAuth()
  const retryCountRef = useRef(0)

  const loadReports = () => {
    setLoading(true)
    fetch("/api/admin/blue/reports", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && !d.error && setData(d))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    document.title = "Blue Reports | Admin"
  }, [])

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setAuthError(false)

    const load = () => {
      setLoading(true)
      fetch("/api/admin/blue/reports", { credentials: "include" })
        .then((r) => {
          if (r.status === 401 || r.status === 403) {
            if (!cancelled) {
              setAuthError(true)
              if (retryCountRef.current < 1) {
                retryCountRef.current += 1
                setTimeout(load, BLUE_DATA_RETRY_MS)
              }
            }
            return null
          }
          return r.json()
        })
        .then((d) => {
          if (cancelled) return
          if (d && !d.error) setData(d)
          else if (d?.error && (d.error === "Unauthorized" || d.error === "Admin required")) {
            setAuthError(true)
            if (retryCountRef.current < 1) {
              retryCountRef.current += 1
              setTimeout(load, BLUE_DATA_RETRY_MS)
            }
          } else setData(null)
        })
        .catch(() => {
          if (!cancelled) setData(null)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()
    return () => { cancelled = true }
  }, [authLoading])

  const paidSignups = data?.signupPaid ?? 0
  const activePlusPaused = (data?.currentActive ?? 0) + (data?.currentPaused ?? 0)
  const needsBackfill = paidSignups > 0 && paidSignups > activePlusPaused

  const runBackfill = async () => {
    setBackfilling(true)
    try {
      const r = await fetch("/api/admin/blue/backfill-memberships-from-signups", {
        method: "POST",
        credentials: "include",
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        loadReports()
      } else {
        console.error("[RecruitNC] Backfill failed:", j.error || r.statusText)
      }
    } finally {
      setBackfilling(false)
    }
  }

  const runSyncDropInsFromStripe = async () => {
    setSyncDropInsLoading(true)
    setSyncDropInsResult(null)
    try {
      const r = await fetch("/api/admin/blue/sync-drop-ins-from-stripe", { method: "POST", credentials: "include" })
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        setSyncDropInsResult(j.message ?? `Synced: ${j.synced ?? 0}, skipped: ${j.skipped ?? 0}`)
        loadReports()
      } else {
        setSyncDropInsResult(j.error ?? `Failed (${r.status})`)
      }
    } finally {
      setSyncDropInsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Loader2 className="h-10 w-10 animate-spin text-[#13294B]" />
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <BlueAdminAuthBanner returnTo="/admin/blue/reports" />
        <Button variant="outline" asChild className="mt-4">
          <Link href="/admin/blue" prefetch={false}>Back to Blue</Link>
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-600">Failed to load reports.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/admin/blue" prefetch={false}>Back to Blue</Link>
        </Button>
      </div>
    )
  }

  const hasTrend = data.membershipTrend && data.membershipTrend.length > 0

  const trendChartData = (data.membershipTrend ?? []).map((t) => ({
    ...t,
    monthLabel: t.month.slice(0, 7).replace("-", " "),
  }))

  const classChartData = data.byClass.map((c) => ({
    name: `Class of ${c.graduationYear}`,
    count: c.count,
    fill: c.isAnticipatedChurn ? "#ef4444" : NAVY,
    isChurn: c.isAnticipatedChurn,
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/blue" prefetch={false}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">Blue Reports</h1>
            <p className="text-sm text-gray-600">Blue MRR (subscriptions only), drop-ins, and class distribution. Store/orders tracks all orders (apparel, tournaments, etc.).</p>
          </div>
        </div>

        {data.signupsError && (
          <Card className="mb-6 border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-800">Signup funnel data: {data.signupsError}</p>
            </CardContent>
          </Card>
        )}

        {needsBackfill && (
          <Card className="mb-6 border-[#003366]/30 bg-[#003366]/5">
            <CardContent className="pt-6">
              <p className="text-sm text-[#13294B] mb-2">
                Paid signups ({paidSignups}) is higher than active members ({activePlusPaused}). People who paid via the Blue signup form may not have a membership row yet, so MRR and active count are understated.
              </p>
              <Button onClick={runBackfill} disabled={backfilling} className="bg-[#003366] hover:bg-[#003366]/90">
                {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span className="ml-2">{backfilling ? "Syncing…" : "Sync paid signups to memberships"}</span>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Summary cards: MRR (Blue subs only), churn, new customers, active base */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">MRR</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">
                ${(data.stripeMRR ?? data.estimatedMRR ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {data.stripeMRR != null
                  ? "Stripe subscription amounts (promo-aware)"
                  : "Active + paused × $55/mo estimate"}
              </p>
              {data.projectedMRRAfterSeniorChurn != null && (
                <p className="text-xs text-amber-700 mt-1">
                  After senior churn (12 mo): ${data.projectedMRRAfterSeniorChurn.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">New MRR (this month)</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">${(data.newMRRThisMonth ?? 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">{(data.newSubsThisMonth ?? 0)} new Blue subs × $55</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <span className="text-sm font-medium text-red-700">Churn (this month)</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">{data.churnThisMonth ?? 0}</p>
              <p className="text-xs text-gray-500">Ended subscriptions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <span className="text-sm text-gray-600">Churn (last 12 mo)</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">{data.churnLast12Months ?? 0}</p>
              <p className="text-xs text-gray-500">Total ended</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Active members</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">{data.currentActive ?? 0}</p>
              {(data.currentPaused ?? 0) > 0 && <p className="text-xs text-gray-500">+ {data.currentPaused} paused</p>}
              <p className="text-xs text-gray-500">Paid subscriptions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <GraduationCap className="h-4 w-4" />
                <span className="text-sm">Anticipated churn</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">{data.anticipatedChurnCount ?? 0}</p>
              <p className="text-xs text-gray-500">Class of {new Date().getFullYear()} (graduating)</p>
            </CardContent>
          </Card>
        </div>

        {/* Signup funnel (form submissions vs paid) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Paid signups</span>
              </div>
              <p className="text-2xl font-bold text-[#13294B]">{data.signupPaid ?? 0}</p>
              <p className="text-xs text-gray-500">Form + payment completed</p>
              {(data.signupPending ?? 0) > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">{data.signupPending} pending (no payment yet)</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Total signups (form)</div>
              <p className="text-2xl font-bold text-[#13294B]">{data.signupTotal ?? 0}</p>
              <p className="text-xs text-gray-500">All blue_signups rows</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">New subs (24 mo)</div>
              <p className="text-2xl font-bold text-[#13294B]">
                {hasTrend ? (data.membershipTrend ?? []).reduce((s, t) => s + t.newCount, 0) : "—"}
              </p>
              <p className="text-xs text-gray-500">From memberships table</p>
            </CardContent>
          </Card>
        </div>

        {/* Drop-ins: from orders only; not MRR. Sync from Stripe pulls full history into orders. */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button
              variant="outline"
              size="sm"
              disabled={syncDropInsLoading}
              onClick={runSyncDropInsFromStripe}
              className="gap-2"
            >
              {syncDropInsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {syncDropInsLoading ? "Syncing…" : "Sync drop-ins from Stripe"}
            </Button>
            {syncDropInsResult && (
              <span className="text-sm text-[#13294B]">{syncDropInsResult}</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-[#13294B]/20">
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Drop-ins (this month)</div>
                <p className="text-2xl font-bold text-[#13294B]">{(data.dropInCountThisMonth ?? 0).toLocaleString()}</p>
                <p className="text-sm text-[#13294B]">${(data.dropInRevenueThisMonth ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} revenue</p>
                <p className="text-xs text-gray-500">Practice drop-ins from orders. Not MRR.</p>
              </CardContent>
            </Card>
            <Card className="border-[#13294B]/20">
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Drop-ins (last 12 mo)</div>
                <p className="text-2xl font-bold text-[#13294B]">{(data.dropInCountLast12Months ?? 0).toLocaleString()}</p>
                <p className="text-sm text-[#13294B]">${(data.dropInRevenueLast12Months ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} revenue</p>
                <p className="text-xs text-gray-500">Use “Sync drop-ins from Stripe” to pull in full history.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Membership over time */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Memberships over time</CardTitle>
            <CardDescription>New vs ended per month and active count at end of month (last 24 months).</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasTrend ? (
              <p className="py-8 text-center text-gray-500">No trend data. Ensure blue_memberships exists and has rows.</p>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => [value, ""]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.month ?? ""}
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="activeAtEnd" name="Active at end of month" stroke={NAVY} fill={NAVY} fillOpacity={0.3} />
                    <Bar yAxisId="left" dataKey="newCount" name="New" fill={GOLD} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="endedCount" name="Churn (ended)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estimated MRR over time */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>MRR over time</CardTitle>
            <CardDescription>Estimated MRR at end of each month (active + paused × $55). Actual amounts may vary with promos.</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasTrend ? (
              <p className="py-8 text-center text-gray-500">No trend data.</p>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(value: number) => [`$${Number(value).toLocaleString()}`, "MRR"]} />
                    <Line type="monotone" dataKey="estimatedMRR" name="MRR" stroke={NAVY} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projected MRR from renewal dates — by week or by month */}
        {(data.billingByMonth?.length ?? 0) > 0 || (data.billingByWeek?.length ?? 0) > 0 ? (
          <Card className="mb-8">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Projected MRR (from renewal dates)</CardTitle>
                <CardDescription>
                  Each bar = revenue from members whose <strong>next billing date</strong> falls in that month. New signups (e.g. today 3/5) appear in the month of their <strong>first renewal</strong>, not the signup month. Synced from Stripe.
                </CardDescription>
              </div>
              <Select value={billingView} onValueChange={(v) => setBillingView(v as BillingView)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">By week</SelectItem>
                  <SelectItem value="month">By month</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={billingView === "week" ? (data.billingByWeek ?? []) : (data.billingByMonth ?? [])}
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value: number, name: string, props: { payload?: { count: number } }) => [
                        `$${Number(value).toLocaleString()} (${props.payload?.count ?? 0} members)`,
                        "Amount",
                      ]}
                    />
                    <Bar dataKey="amount" name="Amount" fill={GOLD} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (data.currentActive ?? 0) + (data.currentPaused ?? 0) > 0 ? (
          <Card className="mb-8 border-dashed">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">
                To see <strong>expected billing by month</strong> and <strong>upcoming billing dates</strong>, run the migration in <code className="bg-gray-100 px-1 rounded">docs/blue-membership-tables.md</code> (section &quot;Next billing date&quot;) and ensure Stripe webhooks for <code className="bg-gray-100 px-1 rounded">customer.subscription.updated</code> and <code className="bg-gray-100 px-1 rounded">customer.subscription.deleted</code> are enabled.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Upcoming billing: table of next billing dates */}
        {((data.upcomingBillingRows?.length ?? 0) > 0 || (data.upcomingBilling?.length ?? 0) > 0) && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Upcoming billing</CardTitle>
              <CardDescription>Next billing dates (next 90 days). Churn and new signups sync from Stripe in real time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(data.upcomingBillingRows?.length ?? 0) > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="pb-2 pr-4">Athlete</th>
                        <th className="pb-2 pr-4">Next billing date</th>
                        <th className="pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.upcomingBillingRows ?? []).slice(0, 30).map((row) => (
                        <tr key={row.membershipId} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium">{row.athleteName}</td>
                          <td className="py-2 pr-4 text-gray-600">
                            {new Date(row.nextBillingAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2">${(row.amountCents / 100).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(data.upcomingBillingRows?.length ?? 0) > 30 && (
                    <p className="text-xs text-gray-500 mt-2">Showing first 30 of {(data.upcomingBillingRows ?? []).length}.</p>
                  )}
                </div>
              )}
              {(data.upcomingBilling?.length ?? 0) > 0 && (data.upcomingBillingRows?.length ?? 0) === 0 && (
                <p className="text-sm text-gray-600">
                  {(data.upcomingBilling ?? []).reduce((s, d) => s + d.count, 0)} billing events in the next 90 days.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {(data.cohortRetention?.length ?? 0) > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Cohort retention</CardTitle>
              <CardDescription>Members still active or paused by signup month (Stripe-backed only)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">Signup month</th>
                      <th className="py-2 pr-4">Started</th>
                      <th className="py-2">Still active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohortRetention!.map((c) => (
                      <tr key={c.signupMonth} className="border-b border-gray-100">
                        <td className="py-2 pr-4">{c.signupMonth}</td>
                        <td className="py-2 pr-4">{c.started}</td>
                        <td className="py-2">{c.stillActive}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {(data.seniorChurnByMonth?.length ?? 0) > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Senior graduation impact (MRR)</CardTitle>
              <CardDescription>Assumes churn in June of graduation year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(data.seniorChurnByMonth ?? []).filter((b) => b.count > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: number, name: string) => [name === "mrrImpact" ? `$${v}` : v, name === "mrrImpact" ? "MRR impact" : "Members"]} />
                    <Bar dataKey="mrrImpact" name="MRR impact" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {(data.failedPaymentMembers?.length ?? 0) > 0 && (
          <Card className="mb-8 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800">Failed / pending payment</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                {data.failedPaymentMembers!.map((m) => (
                  <li key={m.membershipId}>
                    <strong>{m.athleteName}</strong>
                    {m.payerEmail ? ` — ${m.payerEmail}` : ""}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Class distribution (graduation year) */}
        <Card>
          <CardHeader>
            <CardTitle>Members by class (graduation year)</CardTitle>
            <CardDescription>Anticipated churn: Class of {new Date().getFullYear()} will graduate this year. Plan invites to offset.</CardDescription>
          </CardHeader>
          <CardContent>
            {classChartData.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No active/paused members with graduation year on file.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [value, "Members"]} />
                    <Bar dataKey="count" name="Members" radius={[0, 4, 4, 0]}>
                      {classChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
