"use client"

import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import type { SpartanRaceTierId } from "../types"

const PRESETS_CENTS = [2500, 5000, 10_000, 25_000] as const
const LABELS = ["$25", "$50", "$100", "$250"]

const TIER_OPTIONS: { id: SpartanRaceTierId | ""; label: string }[] = [
  { id: "", label: "No preference yet" },
  { id: "kids", label: "Kids Race" },
  { id: "sprint", label: "Sprint 5K" },
  { id: "super", label: "Super 10K" },
  { id: "beast", label: "Beast 21K" },
  { id: "ultra", label: "Ultra 50K" },
]

export function SpartanDonateForm() {
  const searchParams = useSearchParams()
  const tierFromUrl = searchParams.get("tier") as SpartanRaceTierId | null

  const [email, setEmail] = useState("")
  const [donorName, setDonorName] = useState("")
  const [tierPreference, setTierPreference] = useState<SpartanRaceTierId | "">(
    tierFromUrl && TIER_OPTIONS.some((t) => t.id === tierFromUrl) ? tierFromUrl : "",
  )
  const [amountCents, setAmountCents] = useState<number>(5000)
  const [customOpen, setCustomOpen] = useState(false)
  const [customDollars, setCustomDollars] = useState("")
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (!consent) {
      setError("Please confirm email sharing for Spartan code delivery.")
      return
    }
    if (customOpen && !customDollars.trim()) {
      setError("Enter a custom amount.")
      return
    }
    let cents = displayAmount
    if (cents < 500) {
      setError("Minimum donation is $5.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/spartan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          donorName: donorName.trim(),
          amountCents: cents,
          tierPreference: tierPreference || undefined,
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
    <form onSubmit={submit} className="mx-auto mt-10 max-w-md text-left">
      <div className="flex flex-wrap justify-center gap-2">
        {PRESETS_CENTS.map((cents, i) => (
          <button
            key={cents}
            type="button"
            onClick={() => {
              setCustomOpen(false)
              setAmountCents(cents)
            }}
            className={`min-w-[4.5rem] border px-4 py-2 font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-wide transition-colors ${
              !customOpen && amountCents === cents
                ? "border-[#CC0000] bg-[#CC0000] text-white"
                : "border-[#444] text-[#999] hover:border-[#666]"
            }`}
          >
            {LABELS[i]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={`min-w-[4.5rem] border px-4 py-2 font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-wide ${
            customOpen ? "border-[#CC0000] bg-[#CC0000] text-white" : "border-[#444] text-[#999] hover:border-[#666]"
          }`}
        >
          Custom
        </button>
      </div>
      {customOpen && (
        <div className="mt-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-[#888]">Amount (USD)</label>
          <input
            type="number"
            min={5}
            step={1}
            placeholder="e.g. 75"
            value={customDollars}
            onChange={(e) => setCustomDollars(e.target.value)}
            className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-white placeholder:text-[#555] focus:border-[#CC0000] focus:outline-none"
          />
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-[#888]">Email (required)</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-white focus:border-[#CC0000] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-[#888]">Name (optional)</label>
          <input
            type="text"
            autoComplete="name"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-white focus:border-[#CC0000] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-[#888]">Preferred race (optional)</label>
          <select
            value={tierPreference}
            onChange={(e) => setTierPreference(e.target.value as SpartanRaceTierId | "")}
            className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-white focus:border-[#CC0000] focus:outline-none"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t.label + (t.id || "x")} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer gap-3 text-left text-sm text-[#bbb]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#CC0000]"
        />
        <span>
          I agree that NC United may share my email with Spartan Race solely so they can send my Fayetteville race entry
          code. I understand my donation receipt remains from NC United as a 501(c)(3) gift.
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
    </form>
  )
}
