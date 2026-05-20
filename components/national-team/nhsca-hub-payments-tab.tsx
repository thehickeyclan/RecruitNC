"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { HardLink } from "@/components/hard-link"
import {
  hubPanelClass,
  hubPanelDescClass,
  hubPanelHeaderClass,
  hubPanelTitleClass,
} from "@/components/national-team/nhsca-hub-theme"
import type { NhscaDuals2026Registration } from "@/lib/nhsca-duals-2026-registrations"
import {
  nhscaDualsRegistrationIsPaid,
  nhscaDualsRegistrationTotalCents,
  nhscaDualsTeamShortLabel,
  parentEmailAccountHint,
} from "@/lib/nhsca-duals-2026-registrations"
import { cn } from "@/lib/utils"

function formatCents(cents: number) {
  return (cents / 100).toFixed(2)
}

export function NhscaHubPaymentsTab({ isAdmin = false }: { isAdmin?: boolean }) {
  const [registrations, setRegistrations] = useState<NhscaDuals2026Registration[]>([])
  const [paidCount, setPaidCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all")

  const loadRegistrations = useCallback(async () => {
    setError(null)
    const r = await fetch("/api/national-team/hub/registrations", { credentials: "include" })
    if (!r.ok) {
      if (r.status === 401) throw new Error("Sign in required.")
      const d = await r.json().catch(() => ({}))
      throw new Error((d as { error?: string }).error ?? `Failed to load (${r.status})`)
    }
    const data = await r.json()
    setRegistrations(data.registrations ?? [])
    setPaidCount(data.paidCount ?? 0)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadRegistrations()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load orders.")
          setRegistrations([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadRegistrations])

  const filtered =
    filter === "paid"
      ? registrations.filter((r) => nhscaDualsRegistrationIsPaid(r))
      : filter === "pending"
        ? registrations.filter((r) => !nhscaDualsRegistrationIsPaid(r))
        : registrations

  const filterBtn = (value: typeof filter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
        filter === value ? "bg-[#CBAF5D] text-[#002147]" : "bg-white/10 text-white/75 hover:text-white"
      )}
    >
      {label}
    </button>
  )

  return (
    <Tabs defaultValue="past-orders" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-auto gap-1 rounded-xl bg-[#0a2040] p-1.5 border border-white/10 mb-6">
        <TabsTrigger
          value="register"
          className="rounded-lg min-h-[44px] text-sm font-semibold text-white/65 data-[state=active]:bg-[#CBAF5D] data-[state=active]:text-[#002147]"
        >
          Register / pay
        </TabsTrigger>
        <TabsTrigger
          value="past-orders"
          className="rounded-lg min-h-[44px] text-sm font-semibold text-white/65 data-[state=active]:bg-[#CBAF5D] data-[state=active]:text-[#002147]"
        >
          Past orders ({registrations.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="register" className="mt-0">
        <article className={hubPanelClass}>
          <header className={hubPanelHeaderClass}>
            <h3 className={hubPanelTitleClass}>NHSCA Duals 2026 registration</h3>
            <p className={hubPanelDescClass}>
              Invite-only — enter your code, complete the athlete form, then pay $250 via Stripe Checkout (same flow as
              admin payments). National vs Select is determined by which link you open below, not the code itself.
            </p>
          </header>
          <div className="p-5 md:p-6 space-y-4">
            <ol className="text-sm text-white/80 space-y-2 list-decimal pl-5">
              <li>Open National or Select registration (must match your invite).</li>
              <li>Enter invite code, then athlete and parent info.</li>
              <li>Continue to payment — you are redirected to Stripe, then back here when paid.</li>
            </ol>
            <div className="flex flex-col sm:flex-row gap-3">
              <HardLink
                href="/national-team/register/nhsca-2026"
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-[#B31B1B] px-5 py-3 text-sm font-bold text-white hover:bg-[#9a1616]"
              >
                National team — register &amp; pay
              </HardLink>
              <HardLink
                href="/national-team/register/nhsca-duals-2026-select"
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border-2 border-[#CBAF5D] px-5 py-3 text-sm font-bold text-[#CBAF5D] hover:bg-[#CBAF5D]/10"
              >
                Select team — register &amp; pay
              </HardLink>
            </div>
            <p className="text-xs text-white/55">
              Use the same parent email you use for RecruitNC sign-in so your order appears under Past orders and unlocks
              the hub roster.
            </p>
          </div>
        </article>
      </TabsContent>

      <TabsContent value="past-orders" className="mt-0">
        <article className={hubPanelClass}>
          <header className={hubPanelHeaderClass}>
            <h3 className={hubPanelTitleClass}>Registrations</h3>
            <p className={hubPanelDescClass}>
              {isAdmin
                ? "All NHSCA Duals 2026 National & Select registrations (same data as admin payments)."
                : "Your paid and pending NHSCA Duals 2026 registrations — matched by checkout email or linked RecruitNC account."}
              {" "}
              Parent email is from checkout. &quot;✓ same account&quot; compares to your RecruitNC login when linked.
            </p>
          </header>
          <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center gap-3">
            <span className="text-sm text-white/80">
              <strong className="text-[#CBAF5D]">{paidCount}</strong> paid
            </span>
            <div className="flex gap-2">{filterBtn("all", "All")}{filterBtn("paid", "Paid")}{filterBtn("pending", "Pending")}</div>
            {isAdmin ? (
              <a
                href="/admin/blue/national-team-payments"
                className="ml-auto text-xs font-semibold text-[#D3B574] hover:text-white inline-flex items-center gap-1"
              >
                Full admin payments
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#CBAF5D]" aria-label="Loading orders" />
            </div>
          ) : error ? (
            <p className="p-8 text-center text-sm text-red-300">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-white/60">
              {registrations.length === 0
                ? "No NHSCA Duals 2026 orders found for this account yet."
                : "No registrations match this filter."}
            </p>
          ) : (
            <div className="overflow-x-auto touch-pan-x px-5 pb-5 md:px-6 md:pb-6" style={{ WebkitOverflowScrolling: "touch" }}>
              <table className="w-full text-sm min-w-[880px] border-collapse">
                <thead>
                  <tr className="bg-[#003366]/90 text-white">
                    <th className="text-left py-3 px-2 font-semibold">Athlete</th>
                    <th className="text-left py-3 px-2 font-semibold">Parent email</th>
                    <th className="text-left py-3 px-2 font-semibold">School</th>
                    <th className="text-center py-3 px-2 font-semibold w-16">Wt</th>
                    <th className="text-right py-3 px-2 font-semibold">Reg</th>
                    <th className="text-right py-3 px-2 font-semibold">Apparel</th>
                    <th className="text-right py-3 px-2 font-semibold">Total</th>
                    <th className="text-center py-3 px-2 font-semibold">Status</th>
                    <th className="text-left py-3 px-2 font-semibold whitespace-nowrap">Receipt</th>
                    {isAdmin ? <th className="text-left py-3 px-2 font-semibold">Record</th> : null}
                    <th className="text-left py-3 px-2 font-semibold">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const paid = nhscaDualsRegistrationIsPaid(r)
                    const total = nhscaDualsRegistrationTotalCents(r)
                    const accountHint = parentEmailAccountHint(r.parent_email, r.linked_account_email)
                    return (
                      <tr
                        key={r.id}
                        className={cn("border-t border-white/10", i % 2 === 1 && "bg-white/[0.04]")}
                      >
                        <td className="py-2.5 px-2 font-medium text-white whitespace-nowrap">
                          <div>
                            {r.athlete_first_name} {r.athlete_last_name}
                          </div>
                          <div className="text-xs font-normal text-white/55">
                            {nhscaDualsTeamShortLabel(r.event_slug)} team
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-white/85 max-w-[200px]">
                          <span title="Email used at checkout">{r.parent_email}</span>
                          {accountHint === "same" ? (
                            <div className="text-xs text-[#D3B574]">✓ same account</div>
                          ) : accountHint === "different" ? (
                            <div className="text-xs text-white/55">Login: {r.linked_account_email}</div>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-2 text-white/85 whitespace-nowrap">
                          {r.high_school} ({r.graduation_year})
                        </td>
                        <td className="py-2.5 px-2 text-center tabular-nums text-white/90">{r.primary_weight}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-white/85">
                          ${formatCents(r.reg_fee_cents || 0)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-white/85">
                          ${formatCents(r.apparel_fee_cents || 0)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-[#CBAF5D]">
                          ${formatCents(total)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {paid ? (
                            <Badge className="border-0 bg-green-600 text-white hover:bg-green-600">Paid</Badge>
                          ) : (
                            <Badge className="border-0 bg-red-600 text-white hover:bg-red-600">Pending</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          {paid && total > 0 ? (
                            r.fee_receipt_email_sent_at ? (
                              <Badge className="border-0 bg-green-600/80 text-[10px] text-white">Receipt sent</Badge>
                            ) : (
                              <Badge className="border-0 bg-red-600/80 text-[10px] text-white">Receipt not sent</Badge>
                            )
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                        {isAdmin ? (
                          <td className="py-2.5 px-2 font-mono text-xs text-white/75">{r.record ?? "0-0"}</td>
                        ) : null}
                        <td className="py-2.5 px-2">
                          {r.order_id && isAdmin ? (
                            <a
                              href={`/admin/orders/${r.order_id}`}
                              className="text-[#D3B574] hover:text-white text-xs font-medium inline-flex items-center gap-1"
                            >
                              View order
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-white/40 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </TabsContent>
    </Tabs>
  )
}
