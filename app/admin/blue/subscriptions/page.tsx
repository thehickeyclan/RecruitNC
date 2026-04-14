"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Loader2, ExternalLink, Pause, Ban, Trash2, Play, RefreshCw, Users, Wallet } from "lucide-react"
import type { BlueSubscriptionRow } from "@/app/api/admin/blue/subscriptions/route"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"

const BLUE_DATA_RETRY_MS = 2000

type Tab = "good_standing" | "paused" | "canceled"

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
      ? subscriptions.filter((s) => s.status === "active" || s.status === "pending_payment")
      : tab === "paused"
        ? subscriptions.filter((s) => s.status === "paused")
        : subscriptions.filter((s) => s.status === "cancelled" || s.status === "alumni")

  const statusBadge = (s: BlueSubscriptionRow) => {
    if (s.status === "pending_payment") return <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Pending payment</Badge>
    if (s.status === "active") return <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Active</Badge>
    if (s.status === "paused") return <Badge className="bg-slate-200 text-slate-900 hover:bg-slate-200">Paused</Badge>
    if (s.status === "cancelled" || s.status === "alumni")
      return <Badge variant="outline">{s.status === "alumni" ? "Alumni" : "Cancelled"}</Badge>
    return <Badge variant="secondary">{s.status}</Badge>
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#03154C]">Subscriptions & billing</h2>
          <p className="text-sm text-slate-600">
            Live Stripe data when available. Use Sync if a paid member is missing from the list.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={syncFromStripeLoading}
          onClick={runSyncFromStripe}
          className="shrink-0 gap-2 border-[#03154C]/20"
        >
          {syncFromStripeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncFromStripeLoading ? "Syncing…" : "Sync from Stripe"}
        </Button>
      </div>

      {syncFromStripeResult && (
        <div className="rounded-lg border border-[#03154C]/15 bg-[#03154C]/5 px-4 py-3 text-sm text-[#03154C]">{syncFromStripeResult}</div>
      )}

      {bannerError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{bannerError}</div>
      )}

      {loadError && isBlueAuthError(loadError) && <BlueAdminAuthBanner returnTo="/admin/blue/subscriptions" />}
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="font-medium text-red-800">Could not load data</p>
          <p className="mt-1 text-sm text-red-700">{loadError}</p>
          {(loadError === "Not signed in." || loadError?.includes("401") || loadError === "Admin access required.") && (
            <p className="mt-3">
              <a href="/auth/signin?returnTo=/admin/blue/subscriptions" className="font-medium text-[#03154C] underline">
                Sign in again
              </a>
            </p>
          )}
        </div>
      )}

      {membershipsError && !loading && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Setup required</CardTitle>
            <CardDescription className="text-amber-800">{membershipsError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#03154C]/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
            <Users className="h-4 w-4 text-[#03154C]/70" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#03154C]">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="border-[#03154C]/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Paused</CardTitle>
            <Pause className="h-4 w-4 text-amber-600/80" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-700">{stats.paused}</p>
          </CardContent>
        </Card>
        <Card className="border-[#03154C]/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Cancelled / alumni</CardTitle>
            <Wallet className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-700">{stats.cancelled}</p>
          </CardContent>
        </Card>
        {stats.pending_payment > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-900">Pending payment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-800">{stats.pending_payment}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-[#03154C]/10 shadow-md">
        <CardHeader>
          <CardTitle className="text-[#03154C]">Memberships</CardTitle>
          <CardDescription>Per-athlete subscription (deduped). Last / next payment from Stripe when connected.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
            <Button
              variant={tab === "good_standing" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("good_standing")}
              className={tab === "good_standing" ? "bg-[#03154C] hover:bg-[#03154C]/90" : ""}
            >
              Good standing
            </Button>
            <Button variant={tab === "paused" ? "default" : "ghost"} size="sm" onClick={() => setTab("paused")} className={tab === "paused" ? "bg-[#03154C] hover:bg-[#03154C]/90" : ""}>
              Paused
            </Button>
            <Button
              variant={tab === "canceled" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("canceled")}
              className={tab === "canceled" ? "bg-[#03154C] hover:bg-[#03154C]/90" : ""}
            >
              Cancelled
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-[#03154C]" />
              <p className="text-sm text-slate-600">Loading subscriptions…</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-slate-500">
              {tab === "good_standing" && "No active or pending subscriptions."}
              {tab === "paused" && "No paused subscriptions."}
              {tab === "canceled" && "No cancelled subscriptions."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                    <TableHead className="font-semibold text-slate-700">Wrestler</TableHead>
                    <TableHead className="font-semibold text-slate-700">Billed to</TableHead>
                    <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                    <TableHead className="font-semibold text-slate-700">Last payment</TableHead>
                    <TableHead className="font-semibold text-slate-700">Next payment</TableHead>
                    <TableHead className="font-semibold text-slate-700">Card</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-slate-50/40">
                      <TableCell className="align-top font-medium text-[#03154C]">
                        {sub.athlete_id ? (
                          <a
                            href={`/admin/blue/members/${encodeURIComponent(sub.athlete_id)}`}
                            className="hover:underline"
                          >
                            {sub.athlete_name}
                          </a>
                        ) : (
                          sub.athlete_name
                        )}
                        {sub.cancel_at_period_end && sub.status === "active" && (
                          <span className="mt-1 block text-xs font-normal text-amber-800">Cancels at period end</span>
                        )}
                        {sub.stripe_enrichment_error && (
                          <span className="mt-1 block text-xs text-amber-700">{sub.stripe_enrichment_error}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <span className="font-medium text-slate-900">{sub.payer_name}</span>
                        {sub.payer_email && <span className="mt-0.5 block text-xs text-slate-500">{sub.payer_email}</span>}
                      </TableCell>
                      <TableCell className="align-top text-sm tabular-nums">{sub.amount_display}</TableCell>
                      <TableCell className="align-top text-sm text-slate-700">{fmtDate(sub.last_payment_at)}</TableCell>
                      <TableCell className="align-top text-sm text-slate-700">
                        {sub.status === "paused" ? "—" : fmtDate(sub.next_billing_at)}
                        {sub.status === "paused" && sub.resume_at && (
                          <span className="mt-1 block text-xs text-amber-800">Resume {fmtDate(sub.resume_at)}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm text-slate-600">{sub.card_display ?? "—"}</TableCell>
                      <TableCell className="align-top">{statusBadge(sub)}</TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {sub.stripe_subscription_id && (sub.status === "active" || sub.status === "pending_payment") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-amber-300 text-amber-900 hover:bg-amber-50"
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
                                className="h-8"
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
                                className="h-8 border-red-200 text-red-800 hover:bg-red-50"
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
                              className="h-8 border-emerald-300 text-emerald-900 hover:bg-emerald-50"
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
                              className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-[#03154C] hover:bg-slate-50"
                            >
                              Sub <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          )}
                          {sub.stripe_customer_id && (
                            <a
                              href={stripeCustomer(sub.stripe_customer_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-[#03154C] hover:bg-slate-50"
                            >
                              Cust <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          )}
                          {sub.athlete_id && (
                            <a
                              href={`/admin/athletes/edit?id=${encodeURIComponent(sub.athlete_id)}`}
                              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-[#03154C] hover:underline"
                            >
                              Athlete
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
