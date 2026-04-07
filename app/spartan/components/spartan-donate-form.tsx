"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import type { SpartanRaceTierId } from "../types"
import { SPARTAN_RACE_TIERS, suggestedCentsForTier } from "../data"

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

function tierFromSearchParams(searchParams: ReturnType<typeof useSearchParams>): SpartanRaceTierId | null {
  const raw = searchParams.get("tier") as SpartanRaceTierId | null
  if (!raw || !SPARTAN_RACE_TIERS.some((t) => t.id === raw)) return null
  return raw
}

export function SpartanDonateForm() {
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [donorName, setDonorName] = useState("")
  const [tierPreference, setTierPreference] = useState<SpartanRaceTierId | "">("sprint")
  const [amountCents, setAmountCents] = useState(12_900)
  const [customOpen, setCustomOpen] = useState(false)
  const [customDollars, setCustomDollars] = useState("")
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [athleteCode, setAthleteCode] = useState<string | null>(null)

  /** URL: ?mission=1&chip= / ?tier= / ?athlete= */
  useEffect(() => {
    const mission = searchParams.get("mission") === "1"
    if (mission) {
      setTierPreference("")
      setCustomOpen(true)
      const chip = searchParams.get("chip")
      if (chip) {
        const n = Number.parseFloat(chip)
        if (Number.isFinite(n) && n >= 5) {
          const dollars = Math.floor(n)
          setCustomDollars(String(dollars))
          setAmountCents(dollars * 100)
        }
      } else {
        setCustomDollars("50")
        setAmountCents(5000)
      }
      return
    }

    const t = tierFromSearchParams(searchParams)
    if (t) {
      setTierPreference(t)
      const s = suggestedCentsForTier(t)
      if (s != null) {
        setAmountCents(s)
        setCustomOpen(false)
        setCustomDollars("")
      }
    }
  }, [searchParams])

  useEffect(() => {
    const raw = searchParams.get("athlete")?.trim()
    if (raw) setAthleteCode(raw)
    else setAthleteCode(null)
  }, [searchParams])

  /** Dropdown / chip: suggested gift tracks typical Spartan price for that distance */
  useEffect(() => {
    if (!tierPreference) return
    const s = suggestedCentsForTier(tierPreference)
    if (s != null) {
      setAmountCents(s)
      setCustomOpen(false)
      setCustomDollars("")
    }
  }, [tierPreference])

  const displayAmount = useMemo(() => {
    if (customOpen && customDollars.trim()) {
      const n = Number.parseFloat(customDollars)
      if (Number.isFinite(n) && n > 0) return Math.round(n * 100)
    }
    return amountCents
  }, [amountCents, customOpen, customDollars])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const name = donorName.trim()
    if (name.length < 2) {
      setError("Please enter your full name (required for Spartan code fulfillment).")
      return
    }
    if (!consent) {
      setError("Please confirm email sharing for Spartan code delivery.")
      return
    }
    if (customOpen && !customDollars.trim()) {
      setError("Enter a custom amount.")
      return
    }
    const cents = displayAmount
    if (cents < 500) {
      setError("Minimum gift is $5.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/spartan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          donorName: name,
          amountCents: cents,
          tierPreference: tierPreference || undefined,
          athleteCode: athleteCode || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Checkout failed.")
        return
      }
      if (typeof data.url === "string") {
        window.location.href = data.url
        return
      }
      setError("No checkout URL returned.")
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-lg text-left">
      {athleteCode && (
        <div className="mb-6 rounded border border-[#C8A94A]/40 bg-[#141414] px-4 py-3 text-sm text-[#ccc]">
          <span className="font-medium text-[#C8A94A]">Athlete dedication: </span>
          {athleteCode}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-[#C8A94A]">Full name (required)</label>
          <input
            type="text"
            required
            minLength={2}
            autoComplete="name"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-white focus:border-[#CC0000] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[#666]">Used with your email so Spartan can match your entry code.</p>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-[#C8A94A]">Email (required)</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-white focus:border-[#CC0000] focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-2 mt-8">
        <label className="block text-xs font-medium uppercase tracking-wide text-[#888]">Race / distance (optional)</label>
        <p className="mt-1 text-xs text-[#666]">
          We suggest a tax-deductible gift in line with Spartan&apos;s typical list price for that distance — adjust if you
          need to.
        </p>
        <select
          value={tierPreference}
          onChange={(e) => setTierPreference(e.target.value as SpartanRaceTierId | "")}
          className="mt-2 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-white focus:border-[#CC0000] focus:outline-none"
        >
          <option value="">Not sure yet / general support</option>
          {SPARTAN_RACE_TIERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — suggested {formatUsd(t.suggestedGiftCents)}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[#888]">Gift amount</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {SPARTAN_RACE_TIERS.map((tier) => {
          const active = !customOpen && tierPreference === tier.id && amountCents === tier.suggestedGiftCents
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => {
                setTierPreference(tier.id)
                setAmountCents(tier.suggestedGiftCents)
                setCustomOpen(false)
                setCustomDollars("")
              }}
              className={`min-w-[4.75rem] border px-2 py-2 font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-wide transition-colors ${
                active ? "border-[#CC0000] bg-[#CC0000] text-white" : "border-[#444] text-[#999] hover:border-[#666]"
              }`}
            >
              <span className="block text-[10px] font-normal normal-case text-current opacity-90">{tier.name}</span>
              <span className="block text-base">{formatUsd(tier.suggestedGiftCents)}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={`min-w-[4.75rem] border px-2 py-2 font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-wide ${
            customOpen ? "border-[#CC0000] bg-[#CC0000] text-white" : "border-[#444] text-[#999] hover:border-[#666]"
          }`}
        >
          <span className="block text-[10px] font-normal normal-case opacity-90">Other</span>
          <span className="block text-base">Custom</span>
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-[#555]">
        Checkout total: <strong className="text-[#aaa]">{formatUsd(displayAmount)}</strong>
      </p>

      {customOpen && (
        <div className="mt-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-[#888]">Custom amount (USD)</label>
          <input
            type="number"
            min={5}
            step={1}
            placeholder="e.g. 175"
            value={customDollars}
            onChange={(e) => setCustomDollars(e.target.value)}
            className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-white placeholder:text-[#555] focus:border-[#CC0000] focus:outline-none"
          />
        </div>
      )}

      <label className="mt-8 flex cursor-pointer gap-3 text-left text-sm text-[#bbb]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#CC0000]"
        />
        <span>
          I agree that NC United may share my email with Spartan Race solely so they can send my Fayetteville race entry
          code (typically within about 48 hours after NC United batches names to their team). I understand my receipt is
          for a tax-deductible gift to NC United (501(c)(3)), not a purchase from Spartan.
        </span>
      </label>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full min-h-[52px] bg-[#CC0000] font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#990000] disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Continue to secure checkout"}
      </button>
      <p className="mt-3 text-center text-xs text-[#666]">
        After payment, watch your inbox — Spartan sends entry codes on a rolling basis; allow up to about 48 hours.
      </p>
    </form>
  )
}
