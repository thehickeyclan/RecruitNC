"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NhscaHubCheckoutForm } from "@/components/national-team/nhsca-hub-checkout-form"
import {
  hubPanelClass,
  hubPanelDescClass,
  hubPanelHeaderClass,
  hubPanelTitleClass,
} from "@/components/national-team/nhsca-hub-theme"
import type { NhscaDuals2026PaidOrderRow } from "@/lib/nhsca-duals-2026-registrations"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import { cn } from "@/lib/utils"

function OrderLineItemsList({
  lineItems,
  fallbackText,
  className,
}: {
  lineItems: NhscaDuals2026PaidOrderRow["line_items"]
  fallbackText?: string
  className?: string
}) {
  if (lineItems?.length) {
    return (
      <ul className={cn("space-y-1 text-sm", className)}>
        {lineItems.map((item, idx) => (
          <li key={`${item.name}-${idx}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-white/85 break-words min-w-0">{item.name}</span>
            <span className="text-[#CBAF5D] tabular-nums shrink-0">{formatDollars(item.amount_cents)}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (fallbackText?.trim()) {
    return <p className={cn("text-xs text-white/55 break-words", className)}>{fallbackText}</p>
  }
  return null
}

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

const tabTriggerClass =
  "rounded-lg min-h-[44px] text-sm font-semibold text-white/65 data-[state=active]:bg-[#CBAF5D] data-[state=active]:text-[#002147]"

export function NhscaHubPaymentsTab({
  isAdmin = false,
  checkoutEventSlug = "nhsca-duals-2026",
  ordersEventSlug = null,
  ordersScopeAll = false,
  showHubCheckout = true,
}: {
  isAdmin?: boolean
  checkoutEventSlug?: "nhsca-duals-2026" | "nhsca-duals-2026-select"
  /** Filter past orders to one event (e.g. AAU). */
  ordersEventSlug?: string | null
  /** When true, past orders include NHSCA + AAU (no single-event filter). */
  ordersScopeAll?: boolean
  /** NHSCA hub gear checkout — off for AAU-only families. */
  showHubCheckout?: boolean
}) {
  const [orders, setOrders] = useState<NhscaDuals2026PaidOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const ordersQuery = ordersEventSlug
    ? `event=${encodeURIComponent(ordersEventSlug)}`
    : ordersScopeAll
      ? "scope=all"
      : ""

  const loadOrders = useCallback(async () => {
    setError(null)
    const url = ordersQuery
      ? `/api/national-team/hub/registrations?${ordersQuery}`
      : "/api/national-team/hub/registrations"
    const r = await fetch(url, { credentials: "include" })
    if (!r.ok) {
      if (r.status === 401) throw new Error("Sign in required.")
      const d = await r.json().catch(() => ({}))
      throw new Error((d as { error?: string }).error ?? `Failed to load (${r.status})`)
    }
    const data = await r.json()
    setOrders(data.orders ?? [])
  }, [ordersQuery])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadOrders()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load orders.")
          setOrders([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadOrders])

  const ordersOnly = !showHubCheckout
  const defaultTab = ordersOnly ? "orders" : "checkout"

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList
        className={cn(
          "grid w-full h-auto gap-1 rounded-xl bg-[#0a2040] p-1.5 border border-white/10 mb-6",
          ordersOnly ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {showHubCheckout ? (
          <TabsTrigger value="checkout" className={tabTriggerClass}>
            Checkout
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="orders" className={tabTriggerClass}>
          Orders {orders.length > 0 ? `(${orders.length})` : ""}
        </TabsTrigger>
      </TabsList>

      {showHubCheckout ? (
        <TabsContent value="checkout" className="mt-0">
          <NhscaHubCheckoutForm onPaymentComplete={loadOrders} eventSlug={checkoutEventSlug} />
        </TabsContent>
      ) : (
        <div className="mb-6 rounded-xl border border-white/15 bg-[#0a2040]/80 p-4 text-sm text-white/80">
          <p className="font-semibold text-white mb-1">AAU Scholastic Duals registration</p>
          <p className="mb-3">
            New registrations and payment run on the Scholastic Duals page (invite code required). Your completed
            orders appear below.
          </p>
          <a
            href="/national-team/scholastic-duals-2026#register"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#CBAF5D] px-4 py-2 text-sm font-bold text-[#002147] hover:bg-[#d4bc7a]"
          >
            Scholastic Duals registration →
          </a>
        </div>
      )}

      <TabsContent value="orders" className="mt-0">
        <article className={hubPanelClass}>
          <header className={hubPanelHeaderClass}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className={hubPanelTitleClass}>Order history</h3>
                <p className={hubPanelDescClass}>
                  {isAdmin
                    ? "All paid national team orders (NHSCA + AAU) processed through Stripe."
                    : ordersEventSlug === AAU_SCHOLASTIC_EVENT_SLUG
                      ? "Your AAU Scholastic Duals payments — matched to this account or checkout email."
                      : "Your paid orders — matched to this RecruitNC account or checkout email."}
                </p>
              </div>
              {isAdmin ? (
                <a
                  href="/admin/blue/national-team-payments"
                  className="text-xs font-semibold text-[#D3B574] hover:text-white inline-flex items-center gap-1 shrink-0"
                >
                  Full admin
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#CBAF5D]" aria-label="Loading orders" />
            </div>
          ) : error ? (
            <p className="p-8 text-center text-sm text-red-300">{error}</p>
          ) : orders.length === 0 ? (
            <p className="p-8 text-center text-sm text-white/60">
              {ordersOnly
                ? "No paid orders yet. Complete registration on the Scholastic Duals page — payment runs through Stripe."
                : "No paid orders yet. Complete checkout on the Checkout tab — payment runs through Stripe."}
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {orders.map((o) => (
                <li key={o.id} className="px-4 py-4 sm:px-5 md:px-6 space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-white break-words">{o.athlete}</p>
                      <p className="text-xs text-[#CBAF5D]">{o.team} · {o.weight} lbs</p>
                    </div>
                    <p className="text-lg font-bold text-[#CBAF5D] tabular-nums shrink-0">
                      {formatDollars(o.amount_cents)}
                    </p>
                  </div>
                  <p className="text-sm text-white/75 break-all">{o.parent_email}</p>
                  <OrderLineItemsList lineItems={o.line_items} fallbackText={o.items} />
                  <div className="flex flex-wrap gap-3 text-xs text-white/45 pt-1">
                    <span>Order {o.code}</span>
                    <span>{formatDate(o.paid_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </TabsContent>
    </Tabs>
  )
}
