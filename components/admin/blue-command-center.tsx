"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  RefreshCw,
  ChevronDown,
  X,
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
import type { BlueSubscriptionRow } from "@/app/api/admin/blue/subscriptions/route"
import type { BlueWiqSubscriptionRow } from "@/app/api/admin/blue/wiq-subscriptions/route"
import { BlueAdminAuthBanner } from "@/components/blue-admin-auth-banner"
import { cn } from "@/lib/utils"

const NAVY = "#03154C"
const GOLD = "#D3B574"

export type DashPanel =
  | "recruitnc-active"
  | "recruitnc-paused"
  | "recruitnc-pending"
  | "recruitnc-cancelled"
  | "wiq-active"
  | "wiq-billable"
  | "wiq-paused"
  | "combined"
  | null

const PANEL_LABELS: Record<Exclude<DashPanel, null>, string> = {
  "recruitnc-active": "RecruitNC — Active",
  "recruitnc-paused": "RecruitNC — Paused",
  "recruitnc-pending": "RecruitNC — Past due",
  "recruitnc-cancelled": "RecruitNC — Churned / ending",
  "wiq-active": "WrestlingIQ — Paid",
  "wiq-billable": "WrestlingIQ — Billable",
  "wiq-paused": "WrestlingIQ — Paused",
  combined: "Combined Blue members",
}

const QUICK_LINKS: {
  panel?: Exclude<DashPanel, null>
  href?: string
  title: string
  desc: string
  icon: typeof CreditCard
}[] = [
  { panel: "recruitnc-active", title: "Subscriptions", desc: "RecruitNC Stripe billing", icon: CreditCard },
  { panel: "recruitnc-cancelled", title: "Churned", desc: "Canceled & ending subscriptions", icon: CreditCard },
  { panel: "wiq-billable", title: "WrestlingIQ (WIQ)", desc: "External billing roster", icon: Users },
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

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return "—"
  }
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  selected,
  onClick,
  clickable = true,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  icon: typeof Users
  selected?: boolean
  onClick?: () => void
  clickable?: boolean
  accent?: "gold" | "indigo"
}) {
  const Wrapper = clickable ? "button" : "div"
  return (
    <Wrapper
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      className={cn(
        "rounded-lg border bg-[#03154C]/80 border-white/10 text-white text-left w-full transition-colors",
        clickable && "cursor-pointer hover:bg-[#03154C] hover:border-white/20",
        selected && "ring-2 ring-[#D3B574] border-[#D3B574]/40 bg-[#03154C]",
        accent === "indigo" && !selected && "border-indigo-500/25",
      )}
    >
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide">
          <Icon className={cn("h-3.5 w-3.5", accent === "indigo" && "text-indigo-300")} />
          {label}
          {clickable && selected && <ChevronDown className="h-3 w-3 ml-auto text-[#D3B574]" />}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </Wrapper>
  )
}

function recruitncStatusBadge(status: string) {
  if (status === "active")
    return <Badge className="bg-emerald-500/25 text-emerald-300 border-0">Active</Badge>
  if (status === "paused")
    return <Badge className="bg-white/15 text-white/80 border-0">Paused</Badge>
  if (status === "pending_payment")
    return <Badge className="bg-amber-500/25 text-amber-200 border-0">Past due</Badge>
  return <Badge variant="outline" className="border-white/25 text-white/50">{status}</Badge>
}

function wiqStatusBadge(status: string) {
  if (status === "active")
    return <Badge className="bg-emerald-500/25 text-emerald-300 border-0">Paid</Badge>
  if (status === "paused")
    return <Badge className="bg-violet-500/25 text-violet-200 border-0">Paused</Badge>
  if (status === "past_due")
    return <Badge className="bg-amber-500/25 text-amber-200 border-0">Overdue</Badge>
  if (status === "grace")
    return <Badge className="bg-sky-500/25 text-sky-200 border-0">Grace</Badge>
  return <Badge variant="outline" className="border-white/25 text-white/50">Canceled</Badge>
}

function DashMemberPanel({
  panel,
  onClose,
  wiqLastImportAt,
}: {
  panel: Exclude<DashPanel, null>
  onClose: () => void
  wiqLastImportAt?: string | null
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recruitnc, setRecruitnc] = useState<BlueSubscriptionRow[]>([])
  const [wiq, setWiq] = useState<BlueWiqSubscriptionRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const needsRecruitnc =
        panel.startsWith("recruitnc") || panel === "combined"
      const needsWiq = panel.startsWith("wiq") || panel === "combined"

      const wiqFilter =
        panel === "wiq-active"
          ? "active"
          : panel === "wiq-paused"
            ? "paused"
            : "billable"

      const [subRes, wiqRes] = await Promise.all([
        needsRecruitnc
          ? fetch("/api/admin/blue/subscriptions", { credentials: "include" })
          : Promise.resolve(null),
        needsWiq
          ? fetch(`/api/admin/blue/wiq-subscriptions?filter=${wiqFilter}`, { credentials: "include" })
          : Promise.resolve(null),
      ])

      if (subRes) {
        const d = await subRes.json()
        if (!subRes.ok) throw new Error(d.error || "Failed to load RecruitNC subs")
        let rows: BlueSubscriptionRow[] = d.subscriptions ?? []
        if (panel === "recruitnc-active") rows = rows.filter((r) => r.status === "active")
        else if (panel === "recruitnc-paused") rows = rows.filter((r) => r.status === "paused")
        else if (panel === "recruitnc-pending")
          rows = rows.filter((r) => r.status === "pending_payment")
        else if (panel === "recruitnc-cancelled")
          rows = rows.filter(
            (r) =>
              r.status === "cancelled" ||
              r.status === "alumni" ||
              (r.status === "active" && r.cancel_at_period_end),
          )
        else if (panel === "combined") rows = rows.filter((r) => r.status === "active")
        rows.sort((a, b) => a.athlete_name.localeCompare(b.athlete_name))
        setRecruitnc(rows)
      } else {
        setRecruitnc([])
      }

      if (wiqRes) {
        const d = await wiqRes.json()
        if (!wiqRes.ok) throw new Error(d.error || "Failed to load WIQ subs")
        const rows = [...(d.subscriptions ?? [])].sort((a, b) =>
          a.wrestler_name.localeCompare(b.wrestler_name),
        )
        setWiq(rows)
      } else {
        setWiq([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setRecruitnc([])
      setWiq([])
    } finally {
      setLoading(false)
    }
  }, [panel])

  useEffect(() => {
    load()
  }, [load])

  const count = panel === "combined" ? recruitnc.length + wiq.length : panel.startsWith("wiq") ? wiq.length : recruitnc.length

  return (
    <Card className="bg-[#03154C]/90 border-[#D3B574]/30 text-white animate-in fade-in slide-in-from-top-2 duration-200">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">{PANEL_LABELS[panel]}</CardTitle>
          <CardDescription className="text-gray-400">
            {count} member{count === 1 ? "" : "s"}
            {panel.startsWith("wiq") && wiqLastImportAt && (
              <> · Last WIQ import {fmtDate(wiqLastImportAt)}</>
            )}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {panel.startsWith("wiq") && (
            <a
              href="/admin/blue/wiq"
              className="text-xs text-[#D3B574] hover:underline"
            >
              Import WIQ
            </a>
          )}
          {panel.startsWith("recruitnc") && (
            <a
              href="/admin/blue/subscriptions"
              className="text-xs text-[#D3B574] hover:underline"
            >
              Full admin
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#D3B574]" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-300 py-4">{error}</p>
        ) : panel === "combined" ? (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                RecruitNC Stripe ({recruitnc.length})
              </p>
              <RecruitncTable rows={recruitnc} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-300/80 mb-2">
                WrestlingIQ ({wiq.length})
              </p>
              <WiqTable rows={wiq} />
            </div>
          </div>
        ) : panel.startsWith("wiq") ? (
          <WiqTable rows={wiq} />
        ) : (
          <RecruitncTable rows={recruitnc} />
        )}
      </CardContent>
    </Card>
  )
}

function RecruitncTable({ rows }: { rows: BlueSubscriptionRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">No members in this group.</p>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-white/50">Athlete</TableHead>
            <TableHead className="text-white/50">Payer</TableHead>
            <TableHead className="text-white/50">Status</TableHead>
            <TableHead className="text-white/50">Amount</TableHead>
            <TableHead className="text-white/50">Next bill</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((sub) => (
            <TableRow key={sub.id} className="border-white/10 hover:bg-white/5">
              <TableCell className="font-medium text-white">{sub.athlete_name}</TableCell>
              <TableCell className="text-sm text-white/70">
                <span className="block truncate max-w-[160px]">{sub.payer_name}</span>
                {sub.payer_email && (
                  <span className="block text-xs text-white/40 truncate max-w-[160px]">{sub.payer_email}</span>
                )}
              </TableCell>
              <TableCell>{recruitncStatusBadge(sub.status)}</TableCell>
              <TableCell className="text-sm tabular-nums">
                {sub.amount_display}
                {sub.cancel_at_period_end && sub.status === "active" && (
                  <span className="block text-[10px] text-amber-300/90 mt-0.5">Cancels at period end</span>
                )}
                {sub.collection_paused && sub.status === "paused" && (
                  <span className="block text-[10px] text-sky-300/90 mt-0.5">Collection paused</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-white/70">{fmtDate(sub.next_billing_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function WiqTable({ rows }: { rows: BlueWiqSubscriptionRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">No members in this group.</p>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-white/50">Wrestler</TableHead>
            <TableHead className="text-white/50">Billed to</TableHead>
            <TableHead className="text-white/50">Status</TableHead>
            <TableHead className="text-white/50">Amount</TableHead>
            <TableHead className="text-white/50">Next due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((sub) => (
            <TableRow key={sub.id} className="border-white/10 hover:bg-white/5">
              <TableCell className="font-medium text-white">
                {sub.wrestler_name}
                <Badge className="ml-2 bg-indigo-500/30 text-indigo-200 border-0 text-[10px]">WIQ</Badge>
              </TableCell>
              <TableCell className="text-sm text-white/70">{sub.billed_to ?? "—"}</TableCell>
              <TableCell>{wiqStatusBadge(sub.status)}</TableCell>
              <TableCell className="text-sm tabular-nums">{sub.amount_display ?? "—"}</TableCell>
              <TableCell className="text-sm text-white/70">
                {sub.status === "grace" ? fmtDate(sub.active_until) : fmtDate(sub.next_due_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function BlueCommandCenter() {
  const [data, setData] = useState<BlueReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [panel, setPanel] = useState<DashPanel>(null)
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
      const r = await fetch("/api/admin/blue/sync-from-stripe", { method: "POST", credentials: "include" })
      const d = await r.json().catch(() => ({}))
      if (d.statusReconciled > 0) {
        setPanel(null)
      }
      load()
    } finally {
      setSyncLoading(false)
    }
  }

  const togglePanel = (next: Exclude<DashPanel, null>) => {
    setPanel((p) => (p === next ? null : next))
  }

  const trend = (data?.membershipTrend ?? []).slice(-8).map((t) => ({
    label: t.month.slice(5),
    mrr: t.estimatedMRR,
    active: t.activeAtEnd,
  }))

  const mrrDisplay = data?.stripeMRR ?? data?.estimatedMRR ?? 0
  const hasWiq = (data?.wiqBillable ?? 0) > 0

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
              <button
                type="button"
                className="underline text-[#D3B574] hover:text-[#e5c989]"
                onClick={() => togglePanel("recruitnc-pending")}
              >
                View pending memberships below
              </button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
          </div>
        ) : data ? (
          <>
            <p className="text-xs text-gray-500 -mb-3">
              Click a tile to show members below
              {data.recruitncCountsFromStripe && (
                <span className="text-emerald-400/80"> · RecruitNC counts live from Stripe</span>
              )}
              {(data.stripeTestAccountsExcluded ?? 0) > 0 && (
                <span className="text-gray-500">
                  {" "}
                  · {data.stripeTestAccountsExcluded} test account
                  {data.stripeTestAccountsExcluded === 1 ? "" : "s"} excluded
                </span>
              )}
            </p>
            <div className={cn("grid grid-cols-2 gap-3", hasWiq ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-4")}>
              <StatTile
                label="Active (RecruitNC)"
                value={data.currentActive}
                sub={
                  data.stripeRecruitncTotal != null
                    ? `${data.stripeRecruitncTotal} Blue subs in Stripe`
                    : undefined
                }
                icon={Users}
                selected={panel === "recruitnc-active"}
                onClick={() => togglePanel("recruitnc-active")}
              />
              <StatTile
                label="Paused (RecruitNC)"
                value={data.currentPaused}
                icon={CreditCard}
                selected={panel === "recruitnc-paused"}
                onClick={() => togglePanel("recruitnc-paused")}
              />
              <StatTile
                label="Churned (RecruitNC)"
                value={data.currentCancelled}
                sub={
                  (data.currentCanceling ?? 0) > 0
                    ? `${data.currentCanceling} ending at period end`
                    : "Canceled · click for ending too"
                }
                icon={CreditCard}
                selected={panel === "recruitnc-cancelled"}
                onClick={() => togglePanel("recruitnc-cancelled")}
              />
              {hasWiq && (
                <>
                  <StatTile
                    label="WIQ Paid"
                    value={data.wiqActive ?? 0}
                    sub={
                      data.wiqPaused
                        ? `${data.wiqPaused} paused · $50/mo standard`
                        : "$50/mo standard"
                    }
                    icon={Users}
                    accent="indigo"
                    selected={panel === "wiq-active"}
                    onClick={() => togglePanel("wiq-active")}
                  />
                  <StatTile
                    label="WIQ Billable"
                    value={data.wiqBillable ?? 0}
                    sub={
                      data.wiqStandardMrr != null
                        ? `${fmtMoney(data.wiqStandardMrr)}/mo · incl. overdue/grace`
                        : undefined
                    }
                    icon={CreditCard}
                    accent="indigo"
                    selected={panel === "wiq-billable"}
                    onClick={() => togglePanel("wiq-billable")}
                  />
                  {(data.wiqPaused ?? 0) > 0 && (
                    <StatTile
                      label="WIQ Paused"
                      value={data.wiqPaused ?? 0}
                      icon={CreditCard}
                      accent="indigo"
                      selected={panel === "wiq-paused"}
                      onClick={() => togglePanel("wiq-paused")}
                    />
                  )}
                </>
              )}
              <StatTile
                label="MRR (Stripe)"
                value={fmtMoney(mrrDisplay)}
                icon={TrendingUp}
                clickable={false}
              />
              <StatTile
                label="Proj. MRR (post-seniors)"
                value={fmtMoney(data.projectedMRRAfterSeniorChurn ?? mrrDisplay)}
                icon={BarChart3}
                clickable={false}
              />
            </div>

            {data.combinedBillable != null && hasWiq && (
              <button
                type="button"
                onClick={() => togglePanel("combined")}
                className={cn(
                  "w-full rounded-lg border bg-[#03154C]/80 text-white text-left transition-colors",
                  panel === "combined"
                    ? "ring-2 ring-[#D3B574] border-[#D3B574]/40"
                    : "border-[#D3B574]/30 hover:bg-[#03154C] hover:border-[#D3B574]/50",
                )}
              >
                <div className="px-4 py-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400 flex items-center gap-2">
                      Combined Blue (RecruitNC + WIQ)
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 transition-transform", panel === "combined" && "rotate-180")}
                      />
                    </p>
                    <p className="text-3xl font-bold mt-1">{data.combinedBillable} billable</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {data.recruitncBillable ?? data.currentActive} RecruitNC @ $55/mo · {data.wiqBillable} WIQ @
                      $50/mo standard
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Combined MRR (standard rates)</p>
                    <p className="text-2xl font-bold text-[#D3B574]">
                      {fmtMoney(data.combinedStandardMrr ?? 0)}/mo
                    </p>
                  </div>
                </div>
              </button>
            )}

            {panel && (
              <DashMemberPanel
                panel={panel}
                onClose={() => setPanel(null)}
                wiqLastImportAt={data.wiqLastImportAt}
              />
            )}

            {(data.wiqMissingFromReport ?? 0) > 0 && (
              <Alert className="border-amber-500/50 bg-amber-950/40 text-amber-100">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>WIQ reconcile</AlertTitle>
                <AlertDescription>
                  {data.wiqMissingFromReport} WIQ subscription(s) were billable last time but missing from the latest
                  import —{" "}
                  <a href="/admin/blue/wiq" className="underline text-[#D3B574]">
                    re-import in WIQ admin
                  </a>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid lg:grid-cols-3 gap-3">
              <Card className="lg:col-span-2 bg-[#03154C]/60 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">MRR trend</CardTitle>
                  <CardDescription className="text-gray-400">
                    RecruitNC seats × $55 (last 8 months; WIQ excluded)
                  </CardDescription>
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between gap-2">
                    Payment issues
                    <button
                      type="button"
                      className="text-xs font-normal text-[#D3B574] hover:underline"
                      onClick={() => togglePanel("recruitnc-pending")}
                    >
                      View all
                    </button>
                  </CardTitle>
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
          {QUICK_LINKS.map(({ panel: linkPanel, href, title, desc, icon: Icon }) =>
            linkPanel ? (
              <button
                key={title}
                type="button"
                onClick={() => togglePanel(linkPanel)}
                className={cn(
                  "text-left rounded-lg border border-white/10 bg-[#03154C]/50 p-4 hover:bg-[#03154C]/80 hover:border-[#D3B574]/30 transition-colors",
                  panel === linkPanel && "ring-1 ring-[#D3B574]/50 border-[#D3B574]/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-[#D3B574] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              </button>
            ) : (
              <a
                key={href}
                href={href}
                className="block rounded-lg border border-white/10 bg-[#03154C]/50 p-4 hover:bg-[#03154C]/80 hover:border-[#D3B574]/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-[#D3B574] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              </a>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
