"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CreditCard,
  ExternalLink,
  Loader2,
  Mail,
  Pause,
  Ban,
  Play,
  Receipt,
  CalendarClock,
} from "lucide-react"

const BLUE_SUPPORT_EMAIL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_BLUE_SUPPORT_EMAIL
    ? process.env.NEXT_PUBLIC_BLUE_SUPPORT_EMAIL
    : "support@ncunited.org"

export type ParentBlueMembership = {
  id: string
  athleteName: string
  status: string
  startedAt: string
  endedAt: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  resumeAt: string | null
  nextBillingAt: string | null
  lastPaymentAt: string | null
  amountFormatted: string | null
  cancelAtPeriodEnd: boolean
  cardBrand: string | null
  cardLast4: string | null
  stripeDetailsError: string | null
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "—"
  }
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toLowerCase()
  if (s === "active") return "default"
  if (s === "paused") return "secondary"
  if (s === "cancelled" || s === "alumni") return "outline"
  if (s === "pending_payment") return "secondary"
  return "outline"
}

export function NcUnitedBlueSection({
  memberships,
  loading,
  portalLoading,
  subscriptionActionLoading,
  onOpenBillingPortal,
  onRefresh,
  billingPortalError,
}: {
  memberships: ParentBlueMembership[]
  loading: boolean
  portalLoading: string | null
  onOpenBillingPortal: (customerId: string) => Promise<void>
  onRefresh: () => void
  /** Set when Stripe Customer Portal session fails (e.g. not authorized) */
  billingPortalError?: string
}) {
  const [actionLoading, setActionLoading] = useState(false)
  const [localError, setLocalError] = useState("")
  const [localSuccess, setLocalSuccess] = useState("")
  const [pauseMembership, setPauseMembership] = useState<{ id: string; athleteName: string } | null>(null)
  const [resumeAt, setResumeAt] = useState("")
  const [cancelMembership, setCancelMembership] = useState<{ id: string; athleteName: string } | null>(null)

  const clearMessages = () => {
    setLocalError("")
    setLocalSuccess("")
  }

  const runPause = async () => {
    if (!pauseMembership || !resumeAt || !/^\d{4}-\d{2}-\d{2}$/.test(resumeAt)) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/blue/membership/${encodeURIComponent(pauseMembership.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "pause", resumeAt }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setPauseMembership(null)
        setResumeAt("")
        setLocalSuccess(data.message ?? "Subscription paused.")
        onRefresh()
      } else {
        setLocalError(data.error ?? "Failed to pause")
      }
    } finally {
      setActionLoading(false)
    }
  }

  const runCancel = async () => {
    if (!cancelMembership) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/blue/membership/${encodeURIComponent(cancelMembership.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel", atPeriodEnd: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCancelMembership(null)
        setLocalSuccess(data.message ?? "Subscription will cancel at period end.")
        onRefresh()
      } else {
        setLocalError(data.error ?? "Failed to cancel")
      }
    } finally {
      /* noop */
    }
  }

  const runResume = async (membershipId: string) => {
    clearMessages()
    try {
      const res = await fetch(`/api/blue/membership/${encodeURIComponent(membershipId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "resume" }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setLocalSuccess(data.message ?? "Subscription resumed.")
        onRefresh()
      } else {
        setLocalError(data.error ?? "Failed to resume")
      }
    } catch {
      setLocalError("Failed to resume")
    } finally {
      setActionLoading(false)
    }
  }

  const mailtoHref = (m: ParentBlueMembership) => {
    const subject = encodeURIComponent(`NC United Blue — ${m.athleteName}`)
    const body = encodeURIComponent(
      `Hello,\n\nI'm writing about my NC United Blue membership.\n\nAthlete: ${m.athleteName}\nMembership ID: ${m.id}\n\n`
    )
    return `mailto:${BLUE_SUPPORT_EMAIL}?subject=${subject}&body=${body}`
  }

  if (loading) {
    return (
      <Card className="border-[#03154C]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#03154C]">
            <CreditCard className="h-5 w-5" />
            NC United Blue
          </CardTitle>
          <CardDescription>Loading your memberships…</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading billing details…
        </CardContent>
      </Card>
    )
  }

  if (memberships.length === 0) return null

  return (
    <>
      <Card className="border-[#03154C]/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-[#03154C] text-xl">
            <CreditCard className="h-5 w-5 shrink-0" />
            NC United Blue
          </CardTitle>
          <CardDescription>
            Subscriptions, payment method, invoices, and billing actions. Use{" "}
            <strong>Update card &amp; invoices</strong> to change your card or download receipts in Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {billingPortalError && (
            <Alert variant="destructive">
              <AlertDescription>{billingPortalError}</AlertDescription>
            </Alert>
          )}
          {localError && (
            <Alert variant="destructive">
              <AlertDescription>{localError}</AlertDescription>
            </Alert>
          )}
          {localSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{localSuccess}</AlertDescription>
            </Alert>
          )}

          {memberships.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-[#03154C]/15 bg-gradient-to-b from-white to-slate-50/80 p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{m.athleteName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={statusBadgeVariant(m.status)} className="capitalize">
                      {m.status.replace(/_/g, " ")}
                    </Badge>
                    {m.cancelAtPeriodEnd && m.status === "active" && (
                      <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                        Cancels at end of current period
                      </span>
                    )}
                  </div>
                </div>
                {m.amountFormatted && (
                  <p className="text-sm font-medium text-[#03154C] tabular-nums">{m.amountFormatted} / cycle</p>
                )}
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex gap-2">
                  <CalendarClock className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-gray-500">Member since</dt>
                    <dd className="font-medium text-gray-900">{formatDate(m.startedAt)}</dd>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Receipt className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-gray-500">Last payment</dt>
                    <dd className="font-medium text-gray-900">{formatDate(m.lastPaymentAt)}</dd>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CalendarClock className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-gray-500">Next payment</dt>
                    <dd className="font-medium text-gray-900">
                      {m.status === "cancelled" || m.status === "alumni"
                        ? "—"
                        : m.status === "paused"
                          ? "Paused"
                          : formatDate(m.nextBillingAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-gray-500">Card on file</dt>
                    <dd className="font-medium text-gray-900">
                      {m.cardBrand && m.cardLast4
                        ? `${m.cardBrand.charAt(0).toUpperCase()}${m.cardBrand.slice(1)} •••• ${m.cardLast4}`
                        : m.stripeSubscriptionId
                          ? "— (add or update in portal)"
                          : "—"}
                    </dd>
                  </div>
                </div>
              </dl>

              {m.status === "paused" && m.resumeAt && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Billing is paused. Scheduled to resume on <strong>{formatDate(m.resumeAt)}</strong>.
                </p>
              )}

              {m.endedAt && (m.status === "cancelled" || m.status === "alumni") && (
                <p className="text-xs text-gray-500">Ended {formatDate(m.endedAt)}</p>
              )}

              {m.stripeDetailsError && (
                <p className="text-xs text-amber-800 bg-amber-50/80 border border-amber-100 rounded px-2 py-1.5">
                  Could not load live billing details: {m.stripeDetailsError}. Dates may be from our last sync.
                </p>
              )}

              <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
                {m.stripeCustomerId && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-[#03154C] hover:bg-[#03154C]/90"
                    onClick={() => onOpenBillingPortal(m.stripeCustomerId!)}
                    disabled={!!portalLoading}
                  >
                    {portalLoading === m.stripeCustomerId ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Update card &amp; invoices
                  </Button>
                )}

                <Button variant="outline" size="sm" asChild>
                  <a href={mailtoHref(m)} onClick={clearMessages}>
                    <Mail className="h-4 w-4 mr-2" />
                    Message NC United
                  </a>
                </Button>

                {m.stripeSubscriptionId && m.status === "paused" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-800 border-green-300 hover:bg-green-50"
                    onClick={() => runResume(m.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Resume billing now
                  </Button>
                )}

                {m.stripeSubscriptionId && (m.status === "active" || m.status === "pending_payment") && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-800 border-amber-300 hover:bg-amber-50"
                      onClick={() => {
                        clearMessages()
                        setPauseMembership({ id: m.id, athleteName: m.athleteName })
                        setResumeAt("")
                      }}
                      disabled={actionLoading}
                    >
                      <Pause className="h-4 w-4 mr-2" /> Pause
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-700"
                      onClick={() => {
                        clearMessages()
                        setCancelMembership({ id: m.id, athleteName: m.athleteName })
                      }}
                      disabled={actionLoading}
                    >
                      <Ban className="h-4 w-4 mr-2" /> Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>Pause</strong> stops charges until the resume date you choose. <strong>Cancel</strong> stops renewal at the end of
            your current billing period (you keep access through that date). For receipts, past charges, or replacing a lost card, use{" "}
            <strong>Update card &amp; invoices</strong>.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!pauseMembership} onOpenChange={(open) => { if (!open) setPauseMembership(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause subscription</DialogTitle>
            <DialogDescription>
              {pauseMembership && <>Pause billing for {pauseMembership.athleteName}. Charges resume on the date you pick.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="blue-pause-resumeAt">Resume billing on</Label>
            <Input
              id="blue-pause-resumeAt"
              type="date"
              value={resumeAt}
              onChange={(e) => setResumeAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseMembership(null)}>Back</Button>
            <Button onClick={runPause} disabled={actionLoading || !resumeAt || !/^\d{4}-\d{2}-\d{2}$/.test(resumeAt)}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm pause"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelMembership} onOpenChange={(open) => { if (!open) setCancelMembership(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel at end of billing period?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelMembership && (
                <>Subscription for {cancelMembership.athleteName} will not renew. You won&apos;t be charged again after the current period ends.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelMembership(null)}>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={runCancel}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
