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
type BillingKind = Kind | "subscription_annual" | "command_center_annual"

/** Yearly is twelve months less 20%, the same on NC United (Matt, 27 Oct 2026). */
const ANNUAL: Record<Kind, { kind: BillingKind; cents: number }> = {
  subscription: { kind: "subscription_annual", cents: SCOUTING_REPORT_PRICES.subscription_annual },
  command_center: { kind: "command_center_annual", cents: SCOUTING_REPORT_PRICES.command_center_annual },
}

const PLANS: Array<{ kind: Kind; name: string; cents: number; lines: string[]; featured?: boolean }> = [
  {
    kind: "subscription",
    name: "Insider",
    cents: SCOUTING_REPORT_PRICES.subscription,
    // What a family buys it for, first (Matt, 31 Oct 2026): who is looking, and the rankings coaches recruit from.
    lines: ["See which colleges view your profile, and when", "The rankings college coaches use to recruit", "Your wrestler's rank on the profile"],
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
  const [yearly, setYearly] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [purchased, setPurchased] = useState(false)
  const [status, setStatus] = useState<{ insider: boolean; commandCenter: boolean; via: string | null; email: string | null } | null>(null)

  // Say what the account already has before anyone clicks: a refusal after the click read as a dead button.
  useEffect(() => {
    if (!user) return
    void fetch("/api/membership/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setStatus(s))
      .catch(() => {})
  }, [user])
  const has = (kind: Kind) => (kind === "command_center" ? status?.commandCenter : status?.insider) === true
  const viaText =
    status?.via === "staff" ? "as staff" : status?.via === "blue" ? "through NC United Blue" : status?.via === "coach" ? "as a college coach" : "with your membership"

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get("purchased") === "1") setPurchased(true)
    if (q.get("canceled") === "1") setMessage("Checkout was cancelled. Nothing was charged.")
  }, [])

  const start = async (plan: Kind) => {
    const kind: BillingKind = yearly ? ANNUAL[plan].kind : plan
    setMessage(null)
    if (!user) {
      // Most visitors have no account yet: make one, then come back to this plan. A signed-in family
      // whose account had not loaded yet was sent to sign up too, so the server decides.
      const signedIn = await fetch("/api/membership/status", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((s: { signedIn?: boolean } | null) => s?.signedIn === true)
        .catch(() => false)
      if (!signedIn) {
        window.location.href = `/auth/signup?returnTo=${encodeURIComponent(returnTo)}`
        return
      }
    }
    setBusy(plan)
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
    <div className="mx-auto max-w-5xl">
      {status && (status.insider || status.commandCenter) && !purchased ? (
        <p className="mb-5 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-center text-sm text-[#D6DEEA]">
          {status.email ? <span className="font-semibold text-white">{status.email}</span> : "This account"} already has{" "}
          {status.commandCenter ? "the Recruiting Command Center" : "Insider"} {viaText}. Nothing to buy here; to test a purchase, sign in with an account that has no plan.
        </p>
      ) : null}
      {purchased ? (
        <p className="mb-5 rounded-xl border border-[#A3E635]/50 bg-[#A3E635]/10 px-4 py-3 text-center text-sm font-semibold text-[#A3E635]">
          You&apos;re in. Your membership is active; it can take a minute to show everywhere.
        </p>
      ) : null}
      <div className="mb-6 flex justify-center">
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
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${yearly === o.y ? "bg-[#A3E635] text-[#0B1426]" : "text-white/75 hover:text-white"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Free first (Matt, 22 Oct 2026): the profile, claiming it and coach messages cost nothing. */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-[#15243B]/40 p-6 text-left">
          <p className="text-sm font-black uppercase tracking-wider text-white">Free</p>
          <p className="mt-2 text-4xl font-black text-white">
            $0<span className="text-base font-semibold text-[#A8B3C5]"> / always</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-white/85">
            {["Your free account", "Claim your wrestler's profile", "Results, highlights and academics in one place", "College coaches can find and message you"].map((l) => (
              <li key={l} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#A3E635]" aria-hidden /> {l}
              </li>
            ))}
          </ul>
          <a
            href={user ? "/create-profile" : "/auth/signup"}
            className="mt-6 flex items-center justify-center rounded-xl border border-white/25 px-5 py-3.5 text-base font-black text-white hover:bg-white/5"
          >
            {user ? "Claim your profile" : "Create free account"}
          </a>
        </div>
        {PLANS.map((plan) => (
          <div
            key={plan.kind}
            id={plan.kind === "subscription" ? "insider" : "command-center"}
            className={`flex flex-col rounded-2xl border p-6 text-left ${plan.featured ? "border-2 border-[#A3E635] bg-[#15243B]" : "border-white/10 bg-[#15243B]/60"}`}
          >
            <p className={`text-sm font-black uppercase tracking-wider ${plan.featured ? "text-[#A3E635]" : "text-white"}`}>{plan.name}</p>
            <p className="mt-2 text-4xl font-black text-white">
              {formatPrice(yearly ? ANNUAL[plan.kind].cents : plan.cents)}
              <span className="text-base font-semibold text-[#A8B3C5]"> / {yearly ? "year" : "month"}</span>
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
              disabled={busy !== null || has(plan.kind)}
              className={`mt-6 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-black disabled:opacity-60 ${plan.featured ? "bg-[#A3E635] text-[#0B1426] hover:bg-[#BEF264]" : "border border-[#A3E635] text-[#A3E635] hover:bg-[#A3E635]/10"}`}
            >
              {busy === plan.kind ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {has(plan.kind) ? "Included in your account" : `Join ${plan.name === "Insider" ? "Insider" : "the Command Center"}`}
            </button>
          </div>
        ))}
      </div>
      {message ? <p className="mt-4 text-center text-sm text-[#A8B3C5]">{message}</p> : null}
      <p className="mt-4 text-center text-xs text-[#A8B3C5]">
        {yearly ? "Billed once a year, 20% less than monthly." : "Billed monthly."} Cancel anytime from your account. Upgrading from Insider cancels it, so you never pay for both.
      </p>
    </div>
  )
}
