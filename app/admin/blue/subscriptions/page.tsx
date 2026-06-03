"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, ExternalLink, Pause, Ban, Trash2, Play, RefreshCw } from "lucide-react"
import type { BlueSubscriptionRow } from "@/app/api/admin/blue/subscriptions/route"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"

const BLUE_DATA_RETRY_MS = 2000

type Tab = "good_standing" | "pending" | "paused" | "canceled"

const STRIPE_DASHBOARD_SUB = "https://dashboard.stripe.com/subscriptions"
const stripeCustomer = (id: string) => `https://dashboard.stripe.com/customers/${id}`

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return "—"
  }
}

export default function AdminBlueSubscriptionsBillingPage() {
  const [subscriptions, setSubscriptions] = useState<BlueSubscriptionRow[]>([])
  const [stats, setStats] = useState({ active: 0, paused: 0, cancelled: 0, pending_payment: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("good_standing")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [membershipsError, setMembershipsError] = useState<string | null>(null)
  const [syncFromStripeLoading, setSyncFromStripeLoading] = useState(false)
  const [syncFromStripeResult, setSyncFromStripeResult] = useState<string | null>(null)
  const [actionSub, setActionSub] = useState<BlueSubscriptionRow | null>(null)
  const [actionType, setActionType] = useState<"pause" | "cancel" | "delete" | null>(null)
  const [resumeAt, setResumeAt] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [retryLoading, setRetryLoading] = useState<string | null>(null)
  const [retryResult, setRetryResult] = useState<Record<string, { ok: boolean; message: string }>>({})
  const { isLoading: authLoading } = useAuth()
  const retryCountRef = useRef(0)

  const reload = async () => {
    const res = await fetch("/api/admin/blue/subscriptions", { credentials: "include" })
    if (res.ok) {
      const d = await res.json()
      if (d?.subscriptions !== undefined) setSubscriptions(d.subscriptions ?? [])
      if (d?.stats) setStats(d.stats ?? { active: 0, paused: 0, cancelled: 0, pending_payment: 0 })
    }
  }

  const runSubscriptionAction = async () => {
    if (!actionSub || !actionType) return
    setActionLoading(true)
    setActionError(null)
    try {
      if (actionType === "pause") {
        if (!resumeAt || !/^\d{4}-\d{2}-\d{2}$/.test(resumeAt)) {
          setActionError("Enter a resume date (YYYY-MM-DD)")
          return
        }
        const r = await fetch(`/api/admin/blue/subscriptions/${encodeURIComponent(actionSub.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "pause", resumeAt }),
        })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          setActionError(data.error || "Failed")
          return
        }
      } else if (actionType === "cancel") {
        const r = await fetch(`/api/admin/blue/subscriptions/${encodeURIComponent(actionSub.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "cancel", atPeriodEnd: true }),
        })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          setActionError(data.error || "Failed")
          return
        }
      } else if (actionType === "delete") {
        const r = await fetch(`/api/admin/blue/subscriptions/${encodeURIComponent(actionSub.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "delete" }),
        })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          setActionError(data.error || "Failed")
          return
        }
      }
      setActionSub(null)
      setActionType(null)
      setResumeAt("")
      await reload()
    } finally {
      setActionLoading(false)
    }
  }

  const runResume = async (sub: BlueSubscriptionRow) => {
    setActionLoading(true)
    setBannerError(null)
    try {
      const r = await fetch(`/api/admin/blue/subscriptions/${encodeURIComponent(sub.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "resume" }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setBannerError(data.error || "Failed to resume")
        return
      }
      await reload()
    } finally {
      setActionLoading(false)
    }
  }

  const runRetry = async (sub: BlueSubscriptionRow) => {
    setRetryLoading(sub.id)
    setRetryResult((prev) => {
      const next = { ...prev }
      delete next[sub.id]
      return next
    })
    try {
      const r = await fetch(`/api/admin/blue/subscriptions/${encodeURIComponent(sub.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "retry-payment" }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok) {
        setRetryResult((prev) => ({
          ...prev,
          [sub.id]: { ok: true, message: data.message ?? "Payment retry submitted." },
        }))
        await reload()
      } else {
        setRetryResult((prev) => ({
          ...prev,
          [sub.id]: { ok: false, message: data.error ?? "Retry failed." },
        }))
      }
    } catch {
      setRetryResult((prev) => ({
        ...prev,
        [sub.id]: { ok: false, message: "Something went wrong." },
      }))
    } finally {
      setRetryLoading(null)
    }
  }

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setLoadError(null)

    const load = () => {
      if (!cancelled) setLoading(true)
      fetch("/api/admin/blue/subscriptions", { credentials: "include" })
        .then((r) => {
          if (!r.ok) {
            const msg =
              r.status === 401
                ? "Not signed in."
                : r.status === 403
                  ? "Admin access required."
                  : `Could not load (${r.status}).`
            throw new Error(msg)
          }
          return r.json()
        })
        .then((data) => {
          if (cancelled) return
          if (data?.error) {
            setLoadError(data.error)
            return
          }
          setSubscriptions(data.subscriptions ?? [])
          setMembershipsError(data.membershipsError ?? null)
          setStats(data.stats ?? { active: 0, paused: 0, cancelled: 0, pending_payment: 0 })
        })
        .catch((err) => {
          if (!cancelled) {
            const msg = err?.message ?? "Could not load subscriptions."
            setLoadError(msg)
            setSubscriptions([])
            if (isBlueAuthError(msg) && retryCountRef.current < 1) {
              retryCountRef.current += 1
              setTimeout(load, BLUE_DATA_RETRY_MS)
            }
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  const runSyncFromStripe = async () => {
    setSyncFromStripeLoading(true)
    setSyncFromStripeResult(null)
    try {
      const r = await fetch("/api/admin/blue/sync-from-stripe", { method: "POST", credentials: "include" })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setSyncFromStripeResult(data?.error ?? `Failed (${r.status})`)
        return
      }
      setSyncFromStripeResult(data?.message ?? `Synced: ${data.synced ?? 0}, skipped: ${data.skipped ?? 0}, failed: ${data.failed ?? 0}`)
      if ((data.synced ?? 0) > 0) {
        setLoadError(null)
        await reload()
      }
    } finally {
      setSyncFromStripeLoading(false)
    }
  }

  const filtered =
    tab === "good_standing"
      ? subscriptions.filter((s) => s.status === "active")
      : tab === "pending"
        ? subscriptions.filter((s) => s.status === "pending_payment")
        : tab === "paused"
          ? subscriptions.filter((s) => s.status === "paused")
          : subscriptions.filter((s) => s.status === "cancelled" || s.status === "alumni")

  const statusBadge = (s: BlueSubscriptionRow) => {
    if (s.status === "pending_payment")
      return <Badge className="bg-amber-500/25 text-amber-200 hover:bg-amber-500/25 border-0">Past due</Badge>
    if (s.status === "active")
      return <Badge className="bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 border-0">Active</Badge>
    if (s.status === "paused")
      return <Badge className="bg-white/15 text-white/80 hover:bg-white/15 border-0">Paused</Badge>
    if (s.status === "cancelled" || s.status === "alumni")
      return <Badge variant="outline" className="border-white/25 text-white/60">{s.status === "alumni" ? "Alumni" : "Churned"}</Badge>
    return <Badge variant="secondary">{s.status}</Badge>
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-medium text-emerald-300">
            Active {stats.active}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">Paused {stats.paused}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">Churned {stats.cancelled}</span>
          {stats.pending_payment > 0 && (
            <span className="rounded-full bg-amber-500/25 px-3 py-1 font-medium text-amber-200">
              Past due {stats.pending_payment}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={syncFromStripeLoading}
          onClick={runSyncFromStripe}
          className="shrink-0 gap-2 border-white/20 bg-transparent text-white hover:bg-white/10"
        >
          {syncFromStripeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync Stripe
        </Button>
      </div>

      {syncFromStripeResult && (
        <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80">{syncFromStripeResult}</div>
      )}

      {bannerError && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">{bannerError}</div>
      )}

      {loadError && isBlueAuthError(loadError) && <BlueAdminAuthBanner returnTo="/admin/blue/subscriptions" />}
      {loadError && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3">
          <p className="font-medium text-red-200">Could not load data</p>
          <p className="mt-1 text-sm text-red-300/90">{loadError}</p>
          {(loadError === "Not signed in." || loadError?.includes("401") || loadError === "Admin access required.") && (
            <p className="mt-3">
              <a href="/auth/signin?returnTo=/admin/blue/subscriptions" className="font-medium text-[#D3B574] underline">
                Sign in again
              </a>
            </p>
          )}
        </div>
      )}

      {membershipsError && !loading && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">{membershipsError}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#03154C]/40">
        <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3">
          {(
            [
              ["good_standing", "Active"],
              ["pending", "Past due"],
              ["paused", "Paused"],
              ["canceled", "Churned"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === key ? "bg-[#D3B574] text-[#03154C]" : "bg-white/10 text-white/75 hover:bg-white/15",
              ].join(" ")}
            >
              {label}
              {key === "pending" && stats.pending_payment > 0 && (
                <span className="ml-1 opacity-80">({stats.pending_payment})</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/60">
              <Loader2 className="h-10 w-10 animate-spin text-[#D3B574]" />
              <p className="text-sm">Loading members…</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/50">
              {tab === "good_standing" && "No active members."}
              {tab === "pending" && "No past-due subscriptions."}
              {tab === "paused" && "No paused members."}
              {tab === "canceled" && "No churned members."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-medium text-white/50">Wrestler</TableHead>
                    <TableHead className="font-medium text-white/50">Parent</TableHead>
                    <TableHead className="font-medium text-white/50">Last payment</TableHead>
                    <TableHead className="font-medium text-white/50">Next bill</TableHead>
                    <TableHead className="font-medium text-white/50 hidden lg:table-cell">Paid</TableHead>
                    <TableHead className="font-medium text-white/50">Status</TableHead>
                    <TableHead className="text-right font-medium text-white/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => (
                    <TableRow key={sub.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="align-top">
                        {sub.athlete_id ? (
                          <a
                            href={`/admin/blue/members/${encodeURIComponent(sub.athlete_id)}`}
                            className="font-medium text-white hover:text-[#D3B574] hover:underline"
                          >
                            {sub.athlete_name}
                          </a>
                        ) : (
                          <span className="font-medium text-white">{sub.athlete_name}</span>
                        )}
                        <span className="mt-0.5 block text-xs text-white/45">{sub.amount_display}</span>
                        {sub.cancel_at_period_end && sub.status === "active" && (
                          <span className="mt-1 block text-xs text-amber-300/90">Cancels at period end</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <span className="text-white/90">{sub.payer_name}</span>
                        {sub.payer_email && <span className="mt-0.5 block text-xs text-white/45">{sub.payer_email}</span>}
                      </TableCell>
                      <TableCell className="align-top text-sm text-white/80">
                        {fmtDate(sub.last_payment_at)}
                        {sub.paid_invoice_count > 0 && (
                          <span className="mt-0.5 block text-xs text-white/40 tabular-nums">
                            {sub.paid_invoice_count} payment{sub.paid_invoice_count === 1 ? "" : "s"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm text-white/80">
                        {sub.status === "paused" ? (
                          sub.resume_at ? (
                            <span className="text-amber-200/90">Resume {fmtDate(sub.resume_at)}</span>
                          ) : (
                            "—"
                          )
                        ) : (
                          fmtDate(sub.next_billing_at)
                        )}
                        {sub.card_display && (
                          <span className="mt-0.5 block text-xs text-white/40">{sub.card_display}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm text-white/80 hidden lg:table-cell tabular-nums">
                        {sub.lifetime_paid_display ?? "—"}
                      </TableCell>
                      <TableCell className="align-top">{statusBadge(sub)}</TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {sub.stripe_subscription_id && (sub.status === "active" || sub.status === "pending_payment") && (
                            <>
                              {sub.status === "pending_payment" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-white/20 bg-transparent text-white/90 hover:bg-white/10"
                                disabled={retryLoading === sub.id || actionLoading}
                                onClick={() => runRetry(sub)}
                              >
                                  {retryLoading === sub.id ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : null}
                                  Retry
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-white/20 bg-transparent text-white/90 hover:bg-white/10"
                                disabled={actionLoading}
                                onClick={() => {
                                  setActionSub(sub)
                                  setActionType("pause")
                                  setResumeAt("")
                                  setActionError(null)
                                }}
                              >
                                <Pause className="mr-1 h-3 w-3" /> Pause
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-white/20 bg-transparent text-white/90 hover:bg-white/10"
                                disabled={actionLoading}
                                onClick={() => {
                                  setActionSub(sub)
                                  setActionType("cancel")
                                  setActionError(null)
                                }}
                              >
                                <Ban className="mr-1 h-3 w-3" /> Cancel
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-red-400/40 bg-transparent text-red-300 hover:bg-red-950/40"
                                disabled={actionLoading}
                                onClick={() => {
                                  setActionSub(sub)
                                  setActionType("delete")
                                  setActionError(null)
                                }}
                              >
                                <Trash2 className="mr-1 h-3 w-3" /> Delete
                              </Button>
                            </>
                          )}
                          {sub.stripe_subscription_id && sub.status === "paused" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-emerald-400/40 text-emerald-300 hover:bg-emerald-950/30"
                              disabled={actionLoading}
                              onClick={() => runResume(sub)}
                            >
                              <Play className="mr-1 h-3 w-3" /> Resume
                            </Button>
                          )}
                          {sub.stripe_subscription_id && (
                            <a
                              href={`${STRIPE_DASHBOARD_SUB}/${sub.stripe_subscription_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center rounded-md border border-white/20 bg-transparent px-2 text-xs font-medium text-white/80 hover:bg-white/10"
                            >
                              Sub <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          )}
                          {sub.stripe_customer_id && (
                            <a
                              href={stripeCustomer(sub.stripe_customer_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center rounded-md border border-white/20 bg-transparent px-2 text-xs font-medium text-white/80 hover:bg-white/10"
                            >
                              Cust <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          )}
                          {sub.athlete_id && (
                            <a
                              href={`/admin/athletes/edit?id=${encodeURIComponent(sub.athlete_id)}`}
                              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-[#D3B574] hover:underline"
                            >
                              Athlete
                            </a>
                          )}
                        </div>
                        {retryResult[sub.id] && (
                          <p
                            className={[
                              "mt-1.5 text-right text-[11px]",
                              retryResult[sub.id].ok ? "text-emerald-700" : "text-red-600",
                            ].join(" ")}
                          >
                            {retryResult[sub.id].message}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={actionType === "pause" && !!actionSub} onOpenChange={(open) => { if (!open) { setActionSub(null); setActionType(null); setActionError(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause subscription</DialogTitle>
            <DialogDescription>
              {actionSub && <>Pause billing for {actionSub.athlete_name}. Choose the date billing resumes.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="admin-resumeAt">Resume on date</Label>
            <Input
              id="admin-resumeAt"
              type="date"
              value={resumeAt}
              onChange={(e) => setResumeAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionSub(null); setActionType(null) }}>
              Back
            </Button>
            <Button onClick={runSubscriptionAction} disabled={actionLoading || !resumeAt}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm pause"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={(actionType === "cancel" || actionType === "delete") && !!actionSub} onOpenChange={(open) => { if (!open) { setActionSub(null); setActionType(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionType === "cancel" ? "Cancel at period end?" : "Delete subscription?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionSub && actionType === "cancel" && (
                <>Subscription for {actionSub.athlete_name} will stop renewing after the current period.</>
              )}
              {actionSub && actionType === "delete" && <>Cancel {actionSub.athlete_name}&apos;s subscription immediately.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setActionSub(null); setActionType(null) }}>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={runSubscriptionAction} disabled={actionLoading} className={actionType === "delete" ? "bg-red-600 hover:bg-red-700" : ""}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : actionType === "cancel" ? "Cancel at period end" : "Delete now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
