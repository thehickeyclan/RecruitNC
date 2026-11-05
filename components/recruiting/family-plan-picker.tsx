"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"

import { SCOUTING_REPORT_PRICES, formatPrice } from "@/lib/scouting-report-entitlement"

type Plan = "subscription" | "command_center"
type Kind = Plan | "subscription_annual" | "command_center_annual"

const PLANS: Array<{ plan: Plan; name: string; monthly: number; yearly: number; line: string }> = [
  { plan: "subscription", name: "Insider", monthly: SCOUTING_REPORT_PRICES.subscription, yearly: SCOUTING_REPORT_PRICES.subscription_annual, line: "Which colleges viewed the profile, and the rankings" },
  { plan: "command_center", name: "Command Center", monthly: SCOUTING_REPORT_PRICES.command_center, yearly: SCOUTING_REPORT_PRICES.command_center_annual, line: "Everything in Insider, plus the full Command Center" },
]

/**
 * The two plans for a signed-in family, and one button (Matt, 5 Nov 2026). The Command Center is
 * picked to start; Insider is a tap away where we rank the wrestler's state. Checkout comes back to
 * the Command Center.
 */
export function FamilyPlanPicker({ insiderOffered }: { insiderOffered: boolean }) {
  const plans = PLANS.filter((p) => p.plan === "command_center" || insiderOffered)
  const [plan, setPlan] = useState<Plan>("command_center")
  const [yearly, setYearly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const chosen = plans.find((p) => p.plan === plan) ?? plans[plans.length - 1]

  const start = async () => {
    const kind: Kind = yearly ? `${chosen.plan}_annual` : chosen.plan
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/scouting-report/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, returnTo: "/my-recruiting" }),
      })
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; reason?: string }
      if (res.ok && body.url) {
        window.location.href = body.url
        return
      }
      setMessage(
        body.reason === "already_entitled_portal"
          ? "Your account already has the Command Center. Reload the page."
          : body.reason === "already_entitled"
            ? "Your account already has Insider. The Command Center is the upgrade."
            : body.error || "Could not start checkout. Try again.",
      )
    } catch {
      setMessage("Could not start checkout. Try again.")
    }
    setBusy(false)
  }

  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-white/15 bg-white/[0.03] p-1" role="group" aria-label="Billing">
          {[
            { y: false, label: "Monthly" },
            { y: true, label: "Yearly · save 20%" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={yearly === o.y}
              onClick={() => setYearly(o.y)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${yearly === o.y ? "bg-[#D3B574] text-[#0A1628]" : "text-white/75 hover:text-white"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`mt-4 grid gap-3 ${plans.length > 1 ? "sm:grid-cols-2" : ""}`} role="radiogroup" aria-label="Plan">
        {plans.map((p) => {
          const on = p.plan === chosen.plan
          return (
            <button
              key={p.plan}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPlan(p.plan)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left ${on ? "border-[#D3B574] bg-[#D3B574]/10 ring-1 ring-[#D3B574]" : "border-white/15 bg-white/[0.03] hover:border-white/30"}`}
            >
              <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/30"}`} aria-hidden>
                {on ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black uppercase tracking-wider text-white">{p.name}</span>
                <span className="mt-1 block text-3xl font-black text-white">
                  {formatPrice(yearly ? p.yearly : p.monthly)}
                  <span className="text-base font-semibold text-white/50"> / {yearly ? "year" : "month"}</span>
                </span>
                <span className="mt-1 block text-sm text-white/65">{p.line}</span>
              </span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D3B574] px-5 py-3.5 text-base font-black text-[#0A1628] hover:bg-[#e2c98d] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Start {chosen.name}, {formatPrice(yearly ? chosen.yearly : chosen.monthly)}/{yearly ? "year" : "month"}
      </button>
      {message ? <p className="mt-3 text-center text-sm text-white/70">{message}</p> : null}
      <p className="mt-3 text-center text-xs text-white/45">Cancel anytime from your account.</p>
    </div>
  )
}
