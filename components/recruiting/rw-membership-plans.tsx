"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { SCOUTING_REPORT_PRICES, formatPrice } from "@/lib/scouting-report-entitlement"

/**
 * RecruitWrestlers' two memberships, each with its own button (Matt, 15 and 22 Oct 2026: only
 * Insider $9.99 and the Recruiting Command Center $24.99; billed by Guild Ventures,
 * lib/stripe-accounts.ts). Used on /membership and the Command Center page on recruitwrestlers.com.
 */
type Kind = "subscription" | "command_center"

const PLANS: Array<{ kind: Kind; name: string; cents: number; lines: string[]; featured?: boolean }> = [
  {
    kind: "subscription",
    name: "Insider",
    cents: SCOUTING_REPORT_PRICES.subscription,
    lines: ["Every published class ranking", "Your wrestler's rank on the profile", "Which college programs viewed your profile"],
  },
  {
    kind: "command_center",
    name: "Recruiting Command Center",
    cents: SCOUTING_REPORT_PRICES.command_center,
    lines: ["Everything in Insider", "Your plan, 8th grade to signing", "Every college: coaches, cost, roster", "Your college list, compare and coach messages", "Scout, your recruiting assistant"],
    featured: true,
  },
]

export function RwMembershipPlans({ returnTo = "/membership" }: { returnTo?: string }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState<Kind | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [purchased, setPurchased] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get("purchased") === "1") setPurchased(true)
    if (q.get("canceled") === "1") setMessage("Checkout was cancelled. Nothing was charged.")
  }, [])

  const start = async (kind: Kind) => {
    setMessage(null)
    if (!user) {
      window.location.href = `/auth/signin?returnTo=${encodeURIComponent(returnTo)}`
      return
    }
    setBusy(kind)
    try {
      const res = await fetch("/api/scouting-report/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, returnTo }),
      })
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; reason?: string }
      if (res.ok && body.url) {
        window.location.href = body.url
        return
      }
      setMessage(
        body.reason === "already_entitled_portal"
          ? "Your account already includes the Recruiting Command Center."
          : body.reason === "already_entitled"
            ? "Your account already includes Insider. The Command Center is the upgrade."
            : body.reason === "not_open"
              ? "Memberships open at launch."
              : body.error || "Could not start checkout. Try again.",
      )
    } catch {
      setMessage("Could not start checkout. Try again.")
    }
    setBusy(null)
  }

  return (
    <div className="mx-auto max-w-3xl">
      {purchased ? (
        <p className="mb-5 rounded-xl border border-[#A3E635]/50 bg-[#A3E635]/10 px-4 py-3 text-center text-sm font-semibold text-[#A3E635]">
          You&apos;re in. Your membership is active; it can take a minute to show everywhere.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.kind}
            className={`flex flex-col rounded-2xl border p-6 text-left ${plan.featured ? "border-2 border-[#A3E635] bg-[#15243B]" : "border-white/10 bg-[#15243B]/60"}`}
          >
            <p className={`text-sm font-black uppercase tracking-wider ${plan.featured ? "text-[#A3E635]" : "text-white"}`}>{plan.name}</p>
            <p className="mt-2 text-4xl font-black text-white">
              {formatPrice(plan.cents)}
              <span className="text-base font-semibold text-[#A8B3C5]"> / month</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-white/85">
              {plan.lines.map((l) => (
                <li key={l} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#A3E635]" aria-hidden /> {l}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void start(plan.kind)}
              disabled={busy !== null}
              className={`mt-6 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-black disabled:opacity-60 ${plan.featured ? "bg-[#A3E635] text-[#0B1426] hover:bg-[#BEF264]" : "border border-[#A3E635] text-[#A3E635] hover:bg-[#A3E635]/10"}`}
            >
              {busy === plan.kind ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {user ? `Join ${plan.name === "Insider" ? "Insider" : "the Command Center"}` : "Sign in to join"}
            </button>
          </div>
        ))}
      </div>
      {message ? <p className="mt-4 text-center text-sm text-[#A8B3C5]">{message}</p> : null}
      <p className="mt-4 text-center text-xs text-[#A8B3C5]">Monthly, cancel anytime from your account. Upgrading from Insider cancels it, so you never pay for both.</p>
    </div>
  )
}
