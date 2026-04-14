"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  planName: string | null
  source: "live" | "cached" | "unavailable"
}

type ConfirmKind = "pause" | "cancel" | "resume" | "retry"

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

export function NcUnitedBlueSection({
  memberships,
  loading,
  portalLoading,
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
  const [resumeAt, setResumeAt] = useState("")
  const [activeConfirm, setActiveConfirm] = useState<{
    id: string
    type: ConfirmKind
  } | null>(null)
  const [retryError, setRetryError] = useState<Record<string, string>>({})
  const [retrySuccess, setRetrySuccess] = useState<Record<string, boolean>>({})

  const clearMessages = () => {
    setLocalError("")
    setLocalSuccess("")
  }

  const openConfirm = (id: string, type: ConfirmKind) => {
    clearMessages()
    setActiveConfirm({ id, type })
  }

  const closeConfirm = () => setActiveConfirm(null)

  const runPause = async (membershipId: string) => {
    if (!resumeAt || !/^\d{4}-\d{2}-\d{2}$/.test(resumeAt)) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/blue/membership/${encodeURIComponent(membershipId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "pause", resumeAt }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        closeConfirm()
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

  const runCancel = async (membershipId: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/blue/membership/${encodeURIComponent(membershipId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel", atPeriodEnd: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        closeConfirm()
        setLocalSuccess(data.message ?? "Subscription will cancel at period end.")
        onRefresh()
      } else {
        setLocalError(data.error ?? "Failed to cancel")
      }
    } finally {
      setActionLoading(false)
    }
  }

  const runResume = async (membershipId: string) => {
    clearMessages()
    setActionLoading(true)
    try {
      const res = await fetch(`/api/blue/membership/${encodeURIComponent(membershipId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "resume" }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        closeConfirm()
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

  const runRetry = async (membershipId: string) => {
    setRetryError((prev) => ({ ...prev, [membershipId]: "" }))
    setRetrySuccess((prev) => ({ ...prev, [membershipId]: false }))
    setActionLoading(true)
    closeConfirm()
    try {
      const res = await fetch(`/api/blue/membership/${encodeURIComponent(membershipId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "retry-payment" }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setRetrySuccess((prev) => ({ ...prev, [membershipId]: true }))
        onRefresh()
      } else {
        setRetryError((prev) => ({
          ...prev,
          [membershipId]: data.error ?? "Payment failed. Try again.",
        }))
      }
    } catch {
      setRetryError((prev) => ({
        ...prev,
        [membershipId]: "Something went wrong. Message NC United.",
      }))
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
      <Card className="border-[#03154C]/12 bg-white shadow-sm">
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
    <div className="space-y-4">
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

      {memberships.map((m) => {
        const isConfirmOpen = (type: string) =>
          activeConfirm?.id === m.id && activeConfirm.type === type
        const isPending = m.status === "pending_payment"
        const isPaused = m.status === "paused"
        const isActive = m.status === "active"
        const isEnded = m.status === "cancelled" || m.status === "alumni"

        const planSubtitle = [m.planName ?? "Blue Membership", m.amountFormatted ? `${m.amountFormatted} / cycle` : null]
          .filter(Boolean)
          .join(" · ")

        const cardDisplay =
          m.cardBrand && m.cardLast4
            ? `${m.cardBrand.charAt(0).toUpperCase()}${m.cardBrand.slice(1)} ···· ${m.cardLast4}`
            : null

        const sourceDot =
          m.source === "live" ? "bg-green-400" : m.source === "cached" ? "bg-amber-400" : "bg-red-400"

        const nextPaymentDisplay = isEnded
          ? "—"
          : isPaused
            ? m.resumeAt
              ? `Resumes ${formatDate(m.resumeAt)}`
              : "Paused"
            : m.nextBillingAt
              ? formatDate(m.nextBillingAt)
              : m.source !== "live"
                ? "Unavailable"
                : "—"

        const lastPaymentDisplay = m.lastPaymentAt
          ? formatDate(m.lastPaymentAt)
          : isPending
            ? "Payment failed"
            : "—"

        return (
          <div key={m.id} className="overflow-hidden rounded-xl border border-[#03154C]/15 bg-white shadow-sm">
            <div className="bg-[#03154C] px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-white leading-tight">{m.athleteName}</p>
                <p className="mt-0.5 text-[12px] text-white/60">{planSubtitle}</p>
              </div>
              <span
                className={[
                  "shrink-0 rounded-full px-3 py-0.5 text-[11px] font-medium tracking-wide",
                  isActive
                    ? "bg-green-400/20 text-green-300"
                    : isPaused
                      ? "bg-amber-400/20 text-amber-300"
                      : isPending
                        ? "bg-red-400/20 text-red-300"
                        : "bg-white/10 text-white/60",
                ].join(" ")}
              >
                {isPending
                  ? "Pending payment"
                  : m.status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
              </span>
            </div>

            <div className="px-5 py-4 space-y-4">
              {isPending && (
                <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <span className="text-amber-500 text-[13px] shrink-0 mt-px">!</span>
                  <p className="text-[13px] text-amber-800 leading-snug">
                    Your last payment didn&apos;t go through.{" "}
                    {m.stripeCustomerId && (
                      <>
                        <button
                          type="button"
                          className="underline font-medium"
                          onClick={() => onOpenBillingPortal(m.stripeCustomerId!)}
                        >
                          Update your card
                        </button>{" "}
                        first, then retry below.
                      </>
                    )}
                  </p>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Member since</dt>
                  <dd className="font-medium text-gray-900">{formatDate(m.startedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Last payment</dt>
                  <dd className={["font-medium", isPending ? "text-red-600" : "text-gray-900"].join(" ")}>
                    {lastPaymentDisplay}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Next payment</dt>
                  <dd className="font-medium text-gray-900 flex items-center gap-1.5">
                    {!isEnded && !isPaused && m.nextBillingAt && (
                      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${sourceDot}`} />
                    )}
                    {nextPaymentDisplay}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Card on file</dt>
                  <dd className="font-medium text-gray-900">
                    {cardDisplay ?? (
                      <span className="text-gray-400 font-normal">{m.stripeCustomerId ? "None on file" : "—"}</span>
                    )}
                  </dd>
                </div>
              </dl>

              {m.stripeDetailsError && !isPending && (
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Billing info may be outdated — {m.stripeDetailsError}
                </p>
              )}

              {m.cancelAtPeriodEnd && isActive && (
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Cancels at the end of the current billing period.
                </p>
              )}

              {isEnded && m.endedAt && (
                <p className="text-[12px] text-gray-400">Ended {formatDate(m.endedAt)}</p>
              )}

              <div className="border-t border-gray-100 pt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {m.stripeCustomerId && (
                    <Button
                      size="sm"
                      className="bg-[#03154C] hover:bg-[#0a2a6e] text-white text-[13px]"
                      onClick={() => onOpenBillingPortal(m.stripeCustomerId!)}
                      disabled={!!portalLoading}
                    >
                      {portalLoading === m.stripeCustomerId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Update card &amp; invoices
                    </Button>
                  )}

                  {isPending && m.stripeSubscriptionId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[13px] border-amber-300 text-amber-800 hover:bg-amber-50"
                      onClick={() => openConfirm(m.id, "retry")}
                      disabled={actionLoading}
                    >
                      Retry payment
                    </Button>
                  )}

                  {isPaused && m.stripeSubscriptionId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[13px] border-green-300 text-green-800 hover:bg-green-50"
                      onClick={() => openConfirm(m.id, "resume")}
                      disabled={actionLoading}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Resume now
                    </Button>
                  )}

                  {(isActive || isPending) && m.stripeSubscriptionId && (
                    <>
                      {isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[13px] border-amber-300 text-amber-800 hover:bg-amber-50"
                          onClick={() => {
                            setResumeAt("")
                            openConfirm(m.id, "pause")
                          }}
                          disabled={actionLoading}
                        >
                          <Pause className="h-3.5 w-3.5 mr-1.5" />
                          Pause
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[13px] text-gray-600"
                        onClick={() => openConfirm(m.id, "cancel")}
                        disabled={actionLoading}
                      >
                        <Ban className="h-3.5 w-3.5 mr-1.5" />
                        Cancel
                      </Button>
                    </>
                  )}

                  <Button size="sm" variant="ghost" className="text-[13px] text-gray-500" asChild>
                    <a href={mailtoHref(m)} onClick={clearMessages}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      Message NC United
                    </a>
                  </Button>
                </div>

                {isConfirmOpen("retry") && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                    <p className="text-[13px] text-gray-800 leading-snug">
                      We&apos;ll charge the card on file now. Make sure your payment method is up to date before retrying.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-[#C9962A] hover:bg-[#b8891f] text-white text-[13px]"
                        onClick={() => runRetry(m.id)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        Retry {m.amountFormatted ?? "payment"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[13px]" onClick={closeConfirm} disabled={actionLoading}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {retryError[m.id] && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
                    <p className="text-[13px] text-red-700">{retryError[m.id]}</p>
                  </div>
                )}
                {retrySuccess[m.id] && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5">
                    <p className="text-[13px] text-green-800">
                      Payment submitted — membership status will update shortly.
                    </p>
                  </div>
                )}

                {isConfirmOpen("resume") && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                    <p className="text-[13px] text-gray-800 leading-snug">
                      Resuming will restart charges immediately. {m.athleteName}&apos;s next billing date will be set to today.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-[#03154C] hover:bg-[#0a2a6e] text-white text-[13px]"
                        onClick={() => runResume(m.id)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        Resume membership
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[13px]" onClick={closeConfirm} disabled={actionLoading}>
                        Nevermind
                      </Button>
                    </div>
                  </div>
                )}

                {isConfirmOpen("pause") && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                    <p className="text-[13px] text-gray-800 leading-snug">
                      Pausing stops future charges.{" "}
                      {m.nextBillingAt && (
                        <>
                          {m.athleteName} keeps access until <strong>{formatDate(m.nextBillingAt)}</strong>.{" "}
                        </>
                      )}
                      Choose a date to automatically resume:
                    </p>
                    <Input
                      type="date"
                      value={resumeAt}
                      onChange={(e) => setResumeAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="h-8 text-[13px] w-44"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-[#C9962A] hover:bg-[#b8891f] text-white text-[13px]"
                        onClick={() => runPause(m.id)}
                        disabled={actionLoading || !resumeAt || !/^\d{4}-\d{2}-\d{2}$/.test(resumeAt)}
                      >
                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        Confirm pause
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[13px]" onClick={closeConfirm} disabled={actionLoading}>
                        Nevermind
                      </Button>
                    </div>
                  </div>
                )}

                {isConfirmOpen("cancel") && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                    <p className="text-[13px] text-gray-800 leading-snug">
                      Cancelling stops renewal.{" "}
                      {m.nextBillingAt ? (
                        <>
                          {m.athleteName} keeps access through <strong>{formatDate(m.nextBillingAt)}</strong>, then the membership ends.
                        </>
                      ) : (
                        <>The membership will end at the close of the current billing period.</>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[13px] border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => runCancel(m.id)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        Yes, cancel membership
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[13px]" onClick={closeConfirm} disabled={actionLoading}>
                        Keep membership
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      <p className="text-[12px] text-gray-400 leading-relaxed px-1">
        For receipts or past invoices, use <strong className="text-gray-500">Update card &amp; invoices</strong> on any active membership
        above.
      </p>
    </div>
  )
}
