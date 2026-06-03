"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CreditCard,
  BarChart3,
  Link2,
  Ticket,
  Image,
  FileText,
  Trophy,
  Users,
  TrendingUp,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { BlueReportsData } from "@/app/api/admin/blue/reports/route"
import { BlueAdminAuthBanner } from "@/components/blue-admin-auth-banner"

const NAVY = "#03154C"
const GOLD = "#D3B574"

const QUICK_LINKS = [
  { href: "/admin/blue/subscriptions", title: "Subscriptions", desc: "Billing, pause, cancel, Stripe sync", icon: CreditCard },
  { href: "/admin/blue/subscriptions/registrations", title: "Registrations", desc: "Signup pipeline", icon: Users },
  { href: "/admin/blue/reports", title: "Full reports", desc: "Charts, cohorts, billing calendar", icon: BarChart3 },
  { href: "/admin/blue/invites", title: "Invites", desc: "Private registration links", icon: Link2 },
  { href: "/admin/blue/promo-codes", title: "Promo codes", desc: "Scholarships & discounts", icon: Ticket },
  { href: "/admin/blue/interest", title: "Interest", desc: "Lead funnel", icon: FileText },
  { href: "/admin/blue/members-2026", title: "NCHSAA 2026", desc: "Members & placements", icon: Trophy },
  { href: "/admin/blue/images", title: "Page images", desc: "Blue marketing CMS", icon: Image },
]

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

export function BlueCommandCenter() {
  const [data, setData] = useState<BlueReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [authError, setAuthError] = useState(false)
  const { isLoading: authLoading } = useAuth()

  const load = () => {
    setLoading(true)
    fetch("/api/admin/blue/reports", { credentials: "include" })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          setAuthError(true)
          return null
        }
        return r.json()
      })
      .then((d) => d && !d.error && setData(d))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading])

  const runSync = async () => {
    setSyncLoading(true)
    try {
      await fetch("/api/admin/blue/sync-from-stripe", { method: "POST", credentials: "include" })
      load()
    } finally {
      setSyncLoading(false)
    }
  }

  const trend = (data?.membershipTrend ?? []).slice(-8).map((t) => ({
    label: t.month.slice(5),
    mrr: t.estimatedMRR,
    active: t.activeAtEnd,
  }))

  const mrrDisplay = data?.stripeMRR ?? data?.estimatedMRR ?? 0

  return (
    <div className="min-h-screen admin-dark-page bg-[#0A1628] text-white p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Blue Command Center</h1>
            <p className="text-gray-400 mt-1">Memberships, billing, MRR, and registration pipeline</p>
          </div>
          <Button
            variant="outline"
            className="border-[#D3B574]/40 text-white hover:bg-white/10"
            disabled={syncLoading}
            onClick={runSync}
          >
            {syncLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync from Stripe
          </Button>
        </div>

        {authError && <BlueAdminAuthBanner returnTo="/admin/blue" />}

        {(data?.paidSignupsMissingMembership ?? 0) > 0 && (
          <Alert className="border-amber-500/50 bg-amber-950/40 text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Data health</AlertTitle>
            <AlertDescription>
              {data!.paidSignupsMissingMembership} paid signup(s) missing a membership row — run Sync from Stripe or
              Backfill on the Reports page.
            </AlertDescription>
          </Alert>
        )}

        {(data?.pendingPaymentCount ?? 0) > 0 && (
          <Alert className="border-red-500/40 bg-red-950/30 text-red-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed payments ({data!.pendingPaymentCount})</AlertTitle>
            <AlertDescription>
              Review pending memberships in{" "}
              <a href="/admin/blue/subscriptions" className="underline text-[#D3B574]">
                Subscriptions → Pending
              </a>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Active", value: data.currentActive, icon: Users },
                { label: "Paused", value: data.currentPaused, icon: CreditCard },
                { label: "MRR (Stripe)", value: fmtMoney(mrrDisplay), icon: TrendingUp, raw: true },
                {
                  label: "Proj. MRR (post-seniors)",
                  value: fmtMoney(data.projectedMRRAfterSeniorChurn ?? mrrDisplay),
                  icon: BarChart3,
                  raw: true,
                },
              ].map(({ label, value, icon: Icon, raw }) => (
                <Card key={label} className="bg-[#03154C]/80 border-white/10 text-white">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </div>
                    <p className="text-2xl font-bold mt-1">{raw ? value : value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-3">
              <Card className="lg:col-span-2 bg-[#03154C]/60 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">MRR trend</CardTitle>
                  <CardDescription className="text-gray-400">Estimated active seats × $55 (last 8 months)</CardDescription>
                </CardHeader>
                <CardContent className="h-56">
                  {trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          contentStyle={{ background: NAVY, border: "1px solid #ffffff20", color: "#fff" }}
                          formatter={(v: number) => [fmtMoney(v), "MRR"]}
                        />
                        <Line type="monotone" dataKey="mrr" stroke={GOLD} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-sm py-8 text-center">No trend data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-[#03154C]/60 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">This month</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">New subscriptions</span>
                    <span className="font-semibold">{data.newSubsThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Churn (ended)</span>
                    <span className="font-semibold">{data.churnThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Signups paid / total</span>
                    <span className="font-semibold">
                      {data.signupPaid} / {data.signupTotal}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Seniors (anticipated churn)</span>
                    <span className="font-semibold">{data.anticipatedChurnCount}</span>
                  </div>
                  {data.stripeMRR != null && data.estimatedMRR !== data.stripeMRR && (
                    <p className="text-xs text-gray-500 pt-2 border-t border-white/10">
                      Stripe MRR {fmtMoney(data.stripeMRR)} vs flat estimate {fmtMoney(data.estimatedMRR)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {data.failedPaymentMembers && data.failedPaymentMembers.length > 0 && (
              <Card className="bg-[#03154C]/60 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Payment issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    {data.failedPaymentMembers.slice(0, 8).map((m) => (
                      <li key={m.membershipId} className="flex justify-between gap-2">
                        <span>{m.athleteName}</span>
                        <span className="text-gray-400 truncate">{m.payerEmail ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map(({ href, title, desc, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="block rounded-lg border border-white/10 bg-[#03154C]/50 p-4 hover:bg-[#03154C]/80 hover:border-[#D3B574]/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-[#D3B574] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold flex items-center gap-1">
                    {title}
                    <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
