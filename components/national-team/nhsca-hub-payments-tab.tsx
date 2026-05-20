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
import { cn } from "@/lib/utils"

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

export function NhscaHubPaymentsTab({ isAdmin = false }: { isAdmin?: boolean }) {
  const [orders, setOrders] = useState<NhscaDuals2026PaidOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setError(null)
    const r = await fetch("/api/national-team/hub/registrations", { credentials: "include" })
    if (!r.ok) {
      if (r.status === 401) throw new Error("Sign in required.")
      const d = await r.json().catch(() => ({}))
      throw new Error((d as { error?: string }).error ?? `Failed to load (${r.status})`)
    }
    const data = await r.json()
    setOrders(data.orders ?? [])
  }, [])

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

  return (
    <Tabs defaultValue="checkout" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-auto gap-1 rounded-xl bg-[#0a2040] p-1.5 border border-white/10 mb-6">
        <TabsTrigger value="checkout" className={tabTriggerClass}>
          Checkout
        </TabsTrigger>
        <TabsTrigger value="orders" className={tabTriggerClass}>
          Orders {orders.length > 0 ? `(${orders.length})` : ""}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="checkout" className="mt-0">
        <NhscaHubCheckoutForm onPaymentComplete={loadOrders} />
      </TabsContent>

      <TabsContent value="orders" className="mt-0">
        <article className={hubPanelClass}>
          <header className={hubPanelHeaderClass}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className={hubPanelTitleClass}>Order history</h3>
                <p className={hubPanelDescClass}>
                  {isAdmin
                    ? "All paid NHSCA Duals orders (processed through Stripe)."
                    : "Your paid orders only — matched to this RecruitNC account or checkout email."}
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
              No paid orders yet. Complete checkout on the Checkout tab — payment runs through Stripe.
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {orders.map((o) => (
                <li key={o.id} className="px-5 py-4 md:px-6 space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{o.athlete}</p>
                      <p className="text-xs text-[#CBAF5D]">{o.team} team · {o.weight} lbs</p>
                    </div>
                    <p className="text-lg font-bold text-[#CBAF5D] tabular-nums shrink-0">
                      {formatDollars(o.amount_cents)}
                    </p>
                  </div>
                  <p className="text-sm text-white/75 break-all">{o.parent_email}</p>
                  <p className="text-xs text-white/55">{o.items}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-white/45">
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
