"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Trophy } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Subscription = {
  status: string
  nextBillingAt: string | null
  cancelAtPeriodEnd: boolean
  interval: "month" | "year" | null
  canManage: boolean
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

/**
 * The RecruitNC Rankings subscription, beside NC United Blue on the profile's Subscriptions tab.
 *
 * Three honest states: a paid subscription (status, next bill, manage in Stripe); access that comes
 * another way - Blue, a verified coach account, staff - which needs no subscription; or neither,
 * with the way to get it.
 */
export type RankingsAccess = {
  loading: boolean
  subscription: Subscription | null
  /** Access through Blue, a verified coach account or staff - no subscription needed. */
  hasAccess: boolean
}

/** Whether this account can see the rankings, and the paid subscription if there is one. */
export function useRankingsAccess(): RankingsAccess {
  const [state, setState] = useState<RankingsAccess>({ loading: true, subscription: null, hasAccess: false })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/scouting-report/subscription", { cache: "no-store", credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/auth/landing", { cache: "no-store", credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([sub, landing]) => {
      if (cancelled) return
      setState({
        loading: false,
        subscription: (sub as { subscription?: Subscription } | null)?.subscription ?? null,
        hasAccess: (landing as { destination?: string } | null)?.destination === "/public-rankings",
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export function isLiveSubscription(subscription: Subscription | null): boolean {
  return !!subscription && ["active", "trialing", "past_due"].includes(subscription.status)
}

export function RankingsSubscriptionCard({ access }: { access: RankingsAccess }) {
  const { subscription, hasAccess, loading } = access
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manage = async () => {
    setOpening(true)
    setError(null)
    try {
      const res = await fetch("/api/scouting-report/subscription", { method: "POST", credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data?.url) throw new Error(data?.error || "Could not open billing")
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing")
      setOpening(false)
    }
  }

  const live = isLiveSubscription(subscription)

  return (
    <Card className="shadow-md overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[#D3B574] to-[#c4a665]" aria-hidden />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#D3B574]" />
          RecruitNC Rankings
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Every published class ranking, the college prospects board and scouting reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {loading ? (
          <p className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : live ? (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-gray-500">Status</dt>
                <dd className="font-medium text-foreground capitalize">{subscription!.status.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-gray-500">Billed</dt>
                <dd className="font-medium text-foreground">
                  {subscription!.interval === "year" ? "Annually" : subscription!.interval === "month" ? "Monthly" : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                  {subscription!.cancelAtPeriodEnd ? "Access until" : "Next bill"}
                </dt>
                <dd className="font-medium text-foreground">{formatDate(subscription!.nextBillingAt)}</dd>
              </div>
            </dl>
            {subscription!.canManage ? (
              <button
                type="button"
                onClick={() => void manage()}
                disabled={opening}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#D3B574] px-4 text-sm font-semibold text-[#0A1628] hover:bg-[#c4a665] disabled:opacity-60"
              >
                {opening ? "Opening…" : "Manage subscription"}
              </button>
            ) : null}
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
          </>
        ) : hasAccess ? (
          <>
            <p>Included with your account — through NC United Blue, a verified college coach account, or staff access. No subscription needed.</p>
            <Link href="/public-rankings" className="inline-flex text-[#D3B574] underline">
              Open the rankings
            </Link>
          </>
        ) : (
          <>
            <p>You don&apos;t have rankings access on this account. It&apos;s included with NC United Blue, or available on its own.</p>
            <Link
              href="/rankings"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#D3B574] px-4 text-sm font-semibold text-[#0A1628] hover:bg-[#c4a665]"
            >
              See rankings plans
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
