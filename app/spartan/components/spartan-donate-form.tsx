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

function dollarsToCents(raw: string): number {
  const n = Number.parseFloat(raw.trim())
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 100)
}

function tierFromSearchParams(searchParams: ReturnType<typeof useSearchParams>): SpartanRaceTierId | null {
  const raw = searchParams.get("tier") as SpartanRaceTierId | null
  if (!raw || !SPARTAN_RACE_TIERS.some((t) => t.id === raw)) return null
  return raw
}

/** Suggested tier → dollars string (whole dollars for display; user can edit to e.g. 75). */
function suggestedDollarsString(tierId: SpartanRaceTierId): string {
  const s = suggestedCentsForTier(tierId)
  if (s == null) return "50"
  return String(Math.round(s / 100))
}

const GIFT_QUICK_AMOUNTS = [25, 50, 100, 250] as const

export function SpartanDonateForm() {
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [donorName, setDonorName] = useState("")
  const [fundraisingCode, setFundraisingCode] = useState("")
  /** null until user chooses — drives race vs gift-only for Stripe metadata. */
  const [entryIntent, setEntryIntent] = useState<"race" | "gift" | null>(null)
  const [tierPreference, setTierPreference] = useState<SpartanRaceTierId | "">("")
  /** Always editable — chips suggest; override anytime (e.g. $50 → $75). */
  const [amountDollars, setAmountDollars] = useState("50")
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wantsRace = entryIntent === "race"

  /** URL: ?mission=1&chip= / ?tier= / ?athlete= */
  useEffect(() => {
    const mission = searchParams.get("mission") === "1"
    if (mission) {
      setEntryIntent("gift")
      setTierPreference("")
      const chip = searchParams.get("chip")
      if (chip) {
        const n = Number.parseFloat(chip)
        if (Number.isFinite(n) && n >= 5) {
          setAmountDollars(String(Math.floor(n)))
        }
      } else {
        setAmountDollars("50")
      }
      return
    }

    const t = tierFromSearchParams(searchParams)
    if (t) {
      setEntryIntent("race")
      setTierPreference(t)
      setAmountDollars(suggestedDollarsString(t))
    }
  }, [searchParams])

  useEffect(() => {
    const raw = searchParams.get("athlete")?.trim()
    if (raw) setFundraisingCode(raw)
  }, [searchParams])

  /** When distance changes (race path), apply suggested amount — user can edit after. */
  useEffect(() => {
    if (entryIntent !== "race") return
    if (!tierPreference) return
    const s = suggestedCentsForTier(tierPreference)
    if (s != null) setAmountDollars(String(Math.round(s / 100)))
  }, [tierPreference, entryIntent])

  /** Reset consent when race vs gift or tier changes. */
  useEffect(() => {
    setConsent(false)
  }, [entryIntent, tierPreference])

  const amountCents = useMemo(() => dollarsToCents(amountDollars), [amountDollars])

  const codeForCheckout = fundraisingCode.trim() || undefined

  function selectRaceEntry() {
    const next = (tierPreference || "sprint") as SpartanRaceTierId
    setEntryIntent("race")
    setTierPreference(next)
    setAmountDollars(suggestedDollarsString(next))
  }

  function selectGiftOnly() {
    setEntryIntent("gift")
    setTierPreference("")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const name = donorName.trim()
    if (name.length < 2) {
      setError("Please enter your full name.")
      return
    }
    if (entryIntent === null) {
      setError("Please choose whether you are requesting a Spartan race entry.")
      return
    }
    if (entryIntent === "race" && !tierPreference) {
      setError("Choose a race distance.")
      return
    }
    if (!consent) {
      setError("Please confirm the statement below.")
      return
    }
    if (!amountDollars.trim() || amountCents < 500) {
      setError("Enter a valid amount (minimum $5).")
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
          amountCents,
          tierPreference: entryIntent === "race" ? tierPreference : undefined,
          athleteCode: codeForCheckout,
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
      {codeForCheckout && (
        <div className="mb-6 rounded border border-[#C8A94A]/40 bg-[#141414] px-4 py-3 text-sm text-[#ccc]">
          <span className="font-medium text-[#C8A94A]">Fundraising code on this gift: </span>
          {codeForCheckout}
          <p className="mt-2 text-xs text-[#888]">
            This ties your donation to that athlete for internal totals (Stripe metadata). Not a retail promo code.
          </p>
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
          <p className="mt-1 text-xs text-[#666]">
            {wantsRace
              ? "Used with your email so Spartan can match your entry code."
              : "Used on your NC United receipt."}
          </p>
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
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-[#888]">
            Fundraising code (optional)
          </label>
          <p className="mt-1 text-xs text-[#666]">
            Same as your share link: <code className="text-[#aaa]">NCU-LASTNAME-YY</code>. Kids raising money{" "}
            <strong className="text-[#999]">without</strong> running should still use this so gifts count toward them.
          </p>
          <input
            type="text"
            placeholder="e.g. NCU-SMITH-28"
            value={fundraisingCode}
            onChange={(e) => setFundraisingCode(e.target.value.toUpperCase())}
            className="mt-2 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 font-mono text-sm text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="mt-8">
        <p className="font-[family-name:var(--font-barlow-spartan)] text-xs font-semibold uppercase tracking-[0.14em] text-[#C8A94A]">
          Are you requesting a Spartan race entry?
        </p>
        <p className="mt-1 text-xs text-[#666]">
          This controls whether NC United shares your email with Spartan for a Fayetteville entry code (Yes) or treats
          this as a gift / fundraiser only (No).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={selectRaceEntry}
            className={`min-h-[88px] border-2 px-4 py-3 text-left transition-colors ${
              entryIntent === "race"
                ? "border-[#CC0000] bg-[#2a1515]"
                : "border-[#444] bg-[#141414] hover:border-[#666]"
            }`}
          >
            <span className="font-[family-name:var(--font-barlow-spartan)] text-sm font-bold uppercase tracking-wide text-white">
              Yes
            </span>
            <span className="mt-1 block text-xs leading-snug text-[#aaa]">
              I want a race entry — I&apos;ll choose a distance below.
            </span>
          </button>
          <button
            type="button"
            onClick={selectGiftOnly}
            className={`min-h-[88px] border-2 px-4 py-3 text-left transition-colors ${
              entryIntent === "gift"
                ? "border-[#C8A94A] bg-[#1a170d]"
                : "border-[#444] bg-[#141414] hover:border-[#666]"
            }`}
          >
            <span className="font-[family-name:var(--font-barlow-spartan)] text-sm font-bold uppercase tracking-wide text-[#C8A94A]">
              No
            </span>
            <span className="mt-1 block text-xs leading-snug text-[#aaa]">
              Donation or fundraising gift only — no Spartan race code.
            </span>
          </button>
        </div>
      </div>

      {entryIntent === "race" && (
        <div className="mb-2 mt-8">
          <label className="block text-xs font-medium uppercase tracking-wide text-[#888]">Race / distance</label>
          <p className="mt-1 text-xs text-[#666]">Pick the distance you want your entry code for (you can adjust the gift amount below).</p>
          <select
            value={tierPreference}
            onChange={(e) => setTierPreference(e.target.value as SpartanRaceTierId)}
            required
            className="mt-2 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-white focus:border-[#CC0000] focus:outline-none"
          >
            {SPARTAN_RACE_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — suggested {formatUsd(t.suggestedGiftCents)}
              </option>
            ))}
          </select>
        </div>
      )}

      {entryIntent === "race" && (
        <>
          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[#888]">Suggested gift (distance)</p>
          <p className="mt-1 text-xs text-[#666]">
            Quick picks — <strong className="text-[#aaa]">edit the amount field</strong> anytime (e.g. $129 → $75).
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {SPARTAN_RACE_TIERS.map((tier) => {
              const active = tierPreference === tier.id
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    setTierPreference(tier.id)
                    setAmountDollars(suggestedDollarsString(tier.id))
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
          </div>
        </>
      )}

      {entryIntent === "gift" && (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wide text-[#888]">Suggested gift amount</p>
          <p className="mt-1 text-xs text-[#666]">Quick amounts — change the field below to any amount ($5 minimum).</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {GIFT_QUICK_AMOUNTS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setAmountDollars(String(d))}
                className="min-w-[3.5rem] border border-[#5a4d22] bg-[#1a170d] px-3 py-2 font-[family-name:var(--font-barlow-spartan)] text-sm font-bold text-[#C8A94A] hover:border-[#C8A94A]"
              >
                ${d}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="block text-xs font-medium uppercase tracking-wide text-[#C8A94A]" htmlFor="spartan-amount-usd">
          Your amount (USD)
        </label>
        <div className="mt-1 flex items-stretch overflow-hidden rounded border border-[#444] bg-[#0A0A0A] focus-within:border-[#CC0000]">
          <span className="flex items-center border-r border-[#444] bg-[#1a1a1a] px-3 text-lg font-semibold text-[#888]">
            $
          </span>
          <input
            id="spartan-amount-usd"
            type="number"
            min={5}
            step={1}
            required
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-[family-name:var(--font-barlow-spartan)] text-xl font-bold tabular-nums text-white outline-none"
          />
        </div>
        <p className="mt-2 text-center text-xs text-[#555]">
          Checkout total: <strong className="text-[#aaa]">{formatUsd(amountCents)}</strong>
        </p>
      </div>

      <label className="mt-8 flex cursor-pointer gap-3 text-left text-sm text-[#bbb]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#CC0000]"
        />
        <span>
          {wantsRace ? (
            <>
              I agree that NC United may share my email with Spartan Race solely so they can send my Fayetteville race
              entry code after NC United passes donor information to their team. I understand my receipt is for a
              tax-deductible gift to NC United (501(c)(3)), not a purchase from Spartan.
              {codeForCheckout && (
                <>
                  {" "}
                  I understand a fundraising code may be stored with my payment for NC United&apos;s internal totals.
                </>
              )}
            </>
          ) : (
            <>
              I understand my payment is a <strong className="text-[#ddd]">tax-deductible gift to NC United (501(c)(3))</strong>
              . I am <strong className="text-[#ddd]">not</strong> requesting a Spartan race entry code.
              {codeForCheckout ? (
                <>
                  {" "}
                  I understand my gift may be credited to the athlete associated with fundraising code{" "}
                  <strong className="text-[#C8A94A]">{codeForCheckout}</strong> for leaderboards and program use.
                </>
              ) : (
                <>
                  {" "}
                  Optional: add a fundraising code above so NC United can attribute this gift to a specific athlete.
                </>
              )}
            </>
          )}
        </span>
      </label>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || entryIntent === null}
        className="mt-6 w-full min-h-[52px] bg-[#CC0000] font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#990000] disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Continue to secure checkout"}
      </button>
      {entryIntent === null && (
        <p className="mt-2 text-center text-xs text-[#888]">Choose Yes or No above to continue.</p>
      )}
      {wantsRace && (
        <p className="mt-3 text-center text-xs text-[#666]">
          After payment, watch your inbox — Spartan sends entry codes after NC United&apos;s handoff; timing varies.
        </p>
      )}
    </form>
  )
}
