"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { ArrowLeft, Loader2, ExternalLink, Pause, Ban, Trash2 } from "lucide-react"
import type { BlueSubscriptionRow, BlueSignupRow } from "@/app/api/admin/blue/subscriptions/route"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"

const BLUE_DATA_RETRY_MS = 2000

type Tab = "good_standing" | "paused" | "canceled"

const STRIPE_DASHBOARD_SUB = "https://dashboard.stripe.com/subscriptions"

export default function AdminBlueSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<BlueSubscriptionRow[]>([])
  const [signups, setSignups] = useState<BlueSignupRow[]>([])
  const [stats, setStats] = useState({ active: 0, paused: 0, cancelled: 0, pending_payment: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("good_standing")
  const [signupFilter, setSignupFilter] = useState<"all" | "paid" | "pending">("all")
  const [signupsError, setSignupsError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [membershipsError, setMembershipsError] = useState<string | null>(null)
  const [syncFromStripeLoading, setSyncFromStripeLoading] = useState(false)
  const [syncFromStripeResult, setSyncFromStripeResult] = useState<string | null>(null)
  const [actionSub, setActionSub] = useState<BlueSubscriptionRow | null>(null)
  const [actionType, setActionType] = useState<"pause" | "cancel" | "delete" | null>(null)
  const [resumeAt, setResumeAt] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { isLoading: authLoading } = useAuth()
  const retryCountRef = useRef(0)

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
      const res = await fetch("/api/admin/blue/subscriptions", { credentials: "include" })
      if (res.ok) {
        const d = await res.json()
        if (d?.subscriptions) setSubscriptions(d.subscriptions ?? [])
        if (d?.stats) setStats(d.stats ?? { active: 0, paused: 0, cancelled: 0, pending_payment: 0 })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const filteredSignups =
    signupFilter === "paid" ? signups.filter((s) => s.status === "paid") : signupFilter === "pending" ? signups.filter((s) => s.status !== "paid") : signups

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
          setSignups(data.signups ?? [])
          setSignupsError(data.signupsError ?? null)
          setMembershipsError(data.membershipsError ?? null)
          setStats(data.stats ?? { active: 0, paused: 0, cancelled: 0, pending_payment: 0 })
        })
        .catch((err) => {
          if (!cancelled) {
            const msg = err?.message ?? "Could not load subscriptions."
            setLoadError(msg)
            setSubscriptions([])
            setSignups([])
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
    return () => { cancelled = true }
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
        const res = await fetch("/api/admin/blue/subscriptions", { credentials: "include" })
        if (res.ok) {
          const d = await res.json()
          if (d?.signups) setSignups(d.signups ?? [])
          if (d?.subscriptions) setSubscriptions(d.subscriptions ?? [])
          if (d?.stats) setStats(d.stats ?? { active: 0, paused: 0, cancelled: 0, pending_payment: 0 })
        }
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <a href="/admin/blue"><ArrowLeft className="h-4 w-4" /></a>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#003366]">Blue member cockpit</h1>
            <p className="text-sm text-gray-600">All Blue members and subscriptions in one view</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={syncFromStripeLoading}
            onClick={runSyncFromStripe}
            className="gap-2"
          >
            {syncFromStripeLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {syncFromStripeLoading ? "Syncing…" : "Sync Blue from Stripe"}
          </Button>
        </div>
        {syncFromStripeResult && (
          <div className="mb-4 rounded-lg border border-[#003366]/20 bg-[#003366]/5 px-4 py-2 text-sm text-[#003366]">
            {syncFromStripeResult}
          </div>
        )}

        {loadError && isBlueAuthError(loadError) && (
          <BlueAdminAuthBanner returnTo="/admin/blue/subscriptions" />
        )}
        {loadError && (
          <div className="mb-6 py-4 px-4 rounded-lg bg-red-50 border border-red-200">
            <p className="font-medium text-red-800">Could not load data</p>
            <p className="mt-1 text-sm text-red-700">{loadError}</p>
            {(loadError === "Not signed in." || loadError?.includes("401") || loadError === "Admin access required." || loadError?.includes("403")) && (
              <p className="mt-3">
                <a href="/auth/signin?returnTo=/admin/blue/subscriptions" className="text-[#003366] font-medium underline">
                  Sign in again
                </a>
              </p>
            )}
          </div>
        )}

        {(membershipsError || (signupsError && signupsError.includes("does not exist"))) && !loading && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800">Setup required</CardTitle>
              <CardDescription className="text-amber-700">
                Create the Blue tables in Supabase so this page can show data. Run the SQL in the docs (Supabase → SQL Editor).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-amber-800">
              {membershipsError && <p>• {membershipsError}</p>}
              {signupsError && signupsError.includes("blue_signups") && <p>• {signupsError}</p>}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">All Blue members (registration form)</CardTitle>
            <CardDescription>Everyone who signed up via the Blue registration link. Paid = active subscription.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
                <p className="text-sm text-gray-600">Loading subscriptions and signups…</p>
                <p className="text-xs text-gray-500">Data can be slow to load; please wait.</p>
              </div>
            ) : loadError ? (
              <div className="py-6 px-4 rounded-lg bg-red-50 border border-red-200">
                <p className="font-medium text-red-800">Could not load</p>
                <p className="mt-2 text-sm text-red-700">{loadError}</p>
                {(loadError === "Not signed in." || loadError?.includes("401")) && (
                  <p className="mt-3">
                    <a href="/auth/signin?returnTo=/admin/blue/subscriptions" className="text-[#003366] font-medium underline">
                      Sign in again
                    </a>
                  </p>
                )}
              </div>
            ) : signupsError ? (
              <div className="py-6 px-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="font-medium text-amber-800">Signups could not be loaded</p>
                <p className="mt-2 text-sm text-amber-700 whitespace-pre-wrap">{signupsError}</p>
                <p className="mt-2 text-xs text-amber-600">Run the SQL above in Supabase SQL Editor, then refresh this page.</p>
              </div>
            ) : signups.length === 0 ? (
              <p className="py-6 text-center text-gray-500">No signups yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    variant={signupFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSignupFilter("all")}
                    className={signupFilter === "all" ? "bg-[#003366] hover:bg-[#003366]/90" : ""}
                  >
                    All ({signups.length})
                  </Button>
                  <Button
                    variant={signupFilter === "paid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSignupFilter("paid")}
                    className={signupFilter === "paid" ? "bg-[#003366] hover:bg-[#003366]/90" : ""}
                  >
                    Paid ({signups.filter((s) => s.status === "paid").length})
                  </Button>
                  <Button
                    variant={signupFilter === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSignupFilter("pending")}
                    className={signupFilter === "pending" ? "bg-[#003366] hover:bg-[#003366]/90" : ""}
                  >
                    Pending ({signups.filter((s) => s.status !== "paid").length})
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Athlete first</TableHead>
                        <TableHead>Athlete last</TableHead>
                        <TableHead>Grad year</TableHead>
                        <TableHead>High school</TableHead>
                        <TableHead>Club</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>T-shirt</TableHead>
                        <TableHead>Parent first</TableHead>
                        <TableHead>Parent last</TableHead>
                        <TableHead>Parent email</TableHead>
                        <TableHead>Parent phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Signed up</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSignups.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm">{s.athlete_first_name || "—"}</TableCell>
                          <TableCell className="text-sm">{s.athlete_last_name || "—"}</TableCell>
                          <TableCell className="text-sm">{s.athlete_graduation_year ?? "—"}</TableCell>
                          <TableCell className="text-sm">{s.athlete_high_school || "—"}</TableCell>
                          <TableCell className="text-sm">{s.athlete_wrestling_club || "—"}</TableCell>
                          <TableCell className="text-sm">{s.athlete_weight_class || "—"}</TableCell>
                          <TableCell className="text-sm">{s.tshirt_size || "—"}</TableCell>
                          <TableCell className="text-sm">{s.parent_first_name || "—"}</TableCell>
                          <TableCell className="text-sm">{s.parent_last_name || "—"}</TableCell>
                          <TableCell className="text-sm">{s.parent_email || "—"}</TableCell>
                          <TableCell className="text-sm">{s.parent_phone || "—"}</TableCell>
                          <TableCell>
                            <span className={s.status === "paid" ? "text-green-600" : "text-amber-600"}>{s.status === "paid" ? "Paid" : "Pending"}</span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              onClick={() => { window.location.href = `/admin/blue/signups/${s.id}` }}
                              className="text-sm text-[#003366] hover:underline font-medium bg-transparent border-0 cursor-pointer p-0"
                            >
                              View all inputs
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Overview</CardTitle>
            <CardDescription>Active and paused wrestlers. Canceled includes cancelled and alumni.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-2xl font-bold text-[#003366]">{stats.active}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#003366]">{stats.paused}</p>
                <p className="text-sm text-gray-600">Paused</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
                <p className="text-sm text-gray-600">Canceled</p>
              </div>
              {stats.pending_payment > 0 && (
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending_payment}</p>
                  <p className="text-sm text-gray-600">Pending payment</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Wrestler, billed to, amount, and status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 border-b mb-4">
              <Button
                variant={tab === "good_standing" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab("good_standing")}
                className={tab === "good_standing" ? "bg-[#003366] hover:bg-[#003366]/90" : ""}
              >
                Good Standing
              </Button>
              <Button variant={tab === "paused" ? "default" : "ghost"} size="sm" onClick={() => setTab("paused")} className={tab === "paused" ? "bg-[#003366] hover:bg-[#003366]/90" : ""}>
                Paused
              </Button>
              <Button variant={tab === "canceled" ? "default" : "ghost"} size="sm" onClick={() => setTab("canceled")} className={tab === "canceled" ? "bg-[#003366] hover:bg-[#003366]/90" : ""}>
                Canceled
              </Button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
                <p className="text-sm text-gray-600">Loading… data can be slow; please wait.</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                {tab === "good_standing" && "No active or pending subscriptions."}
                {tab === "paused" && "No paused subscriptions."}
                {tab === "canceled" && "No canceled subscriptions."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wrestler(s)</TableHead>
                      <TableHead>Billed to</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Subscription info</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.athlete_id ? (
                            <button
                              type="button"
                              onClick={() => { window.location.href = `/admin/blue/members/${encodeURIComponent(sub.athlete_id)}` }}
                              className="text-[#003366] hover:underline cursor-pointer font-medium bg-transparent border-0 p-0 text-left"
                            >
                              {sub.athlete_name}
                            </button>
                          ) : (
                            <span>{sub.athlete_name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="block">{sub.payer_name}</span>
                          {sub.payer_email && <span className="block text-xs text-gray-500">{sub.payer_email}</span>}
                        </TableCell>
                        <TableCell>{sub.amount_display}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          <span className="block">Started {new Date(sub.started_at).toLocaleDateString()}</span>
                          <span className="block">Created {new Date(sub.created_at).toLocaleDateString()}</span>
                          {sub.status === "paused" && sub.resume_at && (
                            <span className="block text-amber-600">Resumes {new Date(sub.resume_at).toLocaleDateString()}</span>
                          )}
                          <span className="block text-gray-400">Next due: see Stripe</span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              sub.status === "active"
                                ? "text-green-600"
                                : sub.status === "paused"
                                  ? "text-amber-600"
                                  : sub.status === "pending_payment"
                                    ? "text-amber-600"
                                    : "text-gray-500"
                            }
                          >
                            {sub.status === "pending_payment" ? "Pending payment" : sub.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            {sub.stripe_subscription_id && (sub.status === "active" || sub.status === "pending_payment") && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                                  onClick={() => { setActionSub(sub); setActionType("pause"); setResumeAt(""); setActionError(null) }}
                                >
                                  <Pause className="h-3 w-3 mr-1" /> Pause
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-gray-700"
                                  onClick={() => { setActionSub(sub); setActionType("cancel"); setActionError(null) }}
                                >
                                  <Ban className="h-3 w-3 mr-1" /> Cancel
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-700 border-red-300 hover:bg-red-50"
                                  onClick={() => { setActionSub(sub); setActionType("delete"); setActionError(null) }}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                              </>
                            )}
                            {sub.athlete_id && (
                              <>
                                <a href={`/admin/blue/members/${encodeURIComponent(sub.athlete_id)}`} className="text-sm text-[#003366] hover:underline">Registration</a>
                                <a href={`/admin/athletes/edit?id=${encodeURIComponent(sub.athlete_id)}`} className="text-sm text-[#003366] hover:underline">View athlete</a>
                              </>
                            )}
                            {sub.stripe_subscription_id && (
                              <a
                                href={`${STRIPE_DASHBOARD_SUB}/${sub.stripe_subscription_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-[#003366] hover:underline"
                              >
                                Stripe <ExternalLink className="h-3 w-3 ml-0.5" />
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

        {/* Pause dialog: pick resume date */}
        <Dialog open={actionType === "pause" && !!actionSub} onOpenChange={(open) => { if (!open) { setActionSub(null); setActionType(null); setActionError(null) } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pause subscription</DialogTitle>
              <DialogDescription>
                {actionSub && <>Pause billing for {actionSub.athlete_name}. Choose the date to automatically resume.</>}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="resumeAt">Resume on date</Label>
              <Input
                id="resumeAt"
                type="date"
                value={resumeAt}
                onChange={(e) => setResumeAt(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActionSub(null); setActionType(null) }}>Cancel</Button>
              <Button onClick={runSubscriptionAction} disabled={actionLoading || !resumeAt}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pause"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel / Delete confirmation */}
        <AlertDialog open={(actionType === "cancel" || actionType === "delete") && !!actionSub} onOpenChange={(open) => { if (!open) { setActionSub(null); setActionType(null) } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{actionType === "cancel" ? "Cancel at period end?" : "Delete subscription?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {actionSub && actionType === "cancel" && (
                  <>Subscription for {actionSub.athlete_name} will stop at the end of the current billing period. No immediate charge.</>
                )}
                {actionSub && actionType === "delete" && (
                  <>Cancel {actionSub.athlete_name}&apos;s subscription immediately. Access ends now.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setActionSub(null); setActionType(null) }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={runSubscriptionAction} disabled={actionLoading} className={actionType === "delete" ? "bg-red-600 hover:bg-red-700" : ""}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : actionType === "cancel" ? "Cancel at period end" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
