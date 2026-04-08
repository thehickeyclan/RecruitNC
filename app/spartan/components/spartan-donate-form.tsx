"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { HardLink } from "@/components/hard-link"
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

function suggestedDollarsString(tierId: SpartanRaceTierId): string {
  const s = suggestedCentsForTier(tierId)
  if (s == null) return "50"
  return String(Math.round(s / 100))
}

const GIFT_QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500, 1000] as const

const TEE_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const
const TEE_THRESHOLD_CENTS = 10_000

export function SpartanDonateForm() {
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [donorName, setDonorName] = useState("")
  const [fundraisingCode, setFundraisingCode] = useState("")
  const [attribution, setAttribution] = useState<"athlete" | "general" | null>(null)
  const [entryIntent, setEntryIntent] = useState<"race" | "gift" | null>(null)
  const [tierPreference, setTierPreference] = useState<SpartanRaceTierId | "">("")
  const [amountDollars, setAmountDollars] = useState("50")
  const [consent, setConsent] = useState(false)
  const [teeConsent, setTeeConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [athleteQuery, setAthleteQuery] = useState("")
  const [athleteHits, setAthleteHits] = useState<{ code: string; label: string }[]>([])
  const [athleteMenuOpen, setAthleteMenuOpen] = useState(false)
  const [athleteSearchLoading, setAthleteSearchLoading] = useState(false)
  const [athleteLookupError, setAthleteLookupError] = useState(false)

  const [shirtSize, setShirtSize] = useState("")
  const [shipLine1, setShipLine1] = useState("")
  const [shipLine2, setShipLine2] = useState("")
  const [shipCity, setShipCity] = useState("")
  const [shipState, setShipState] = useState("")
  const [shipPostal, setShipPostal] = useState("")
  const [shipCountry, setShipCountry] = useState("US")

  const wantsRace = entryIntent === "race"

  useEffect(() => {
    const mission = searchParams.get("mission") === "1"
    if (mission) {
      setEntryIntent("gift")
      setTierPreference("")
      const chip = searchParams.get("chip")
      if (chip) {
        const n = Number.parseFloat(chip)
        if (Number.isFinite(n) && n >= 5) setAmountDollars(String(Math.floor(n)))
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
    if (raw) {
      setFundraisingCode(raw)
      setAthleteQuery("")
      setAttribution("athlete")
    }
  }, [searchParams])

  useEffect(() => {
    const q = athleteQuery.trim()
    if (q.length < 2) {
      setAthleteHits([])
      setAthleteSearchLoading(false)
      setAthleteLookupError(false)
      return
    }
    const t = setTimeout(() => {
      void (async () => {
        setAthleteSearchLoading(true)
        setAthleteLookupError(false)
        try {
          const res = await fetch(`/api/spartan/fundraising-athletes?q=${encodeURIComponent(q)}`)
          const data = (await res.json()) as {
            athletes?: { code: string; label: string }[]
            error?: string
          }
          const list = data.athletes ?? []
          setAthleteHits(list)
          setAthleteLookupError(data.error === "lookup_unavailable")
          setAthleteMenuOpen(list.length > 0)
        } catch {
          setAthleteHits([])
          setAthleteLookupError(true)
        } finally {
          setAthleteSearchLoading(false)
        }
      })()
    }, 350)
    return () => clearTimeout(t)
  }, [athleteQuery])

  useEffect(() => {
    if (entryIntent !== "race") return
    if (!tierPreference) return
    const s = suggestedCentsForTier(tierPreference)
    if (s != null) setAmountDollars(String(Math.round(s / 100)))
  }, [tierPreference, entryIntent])

  useEffect(() => {
    setConsent(false)
  }, [entryIntent, tierPreference, attribution])

  const amountCents = useMemo(() => dollarsToCents(amountDollars), [amountDollars])
  const teeEligible = amountCents >= TEE_THRESHOLD_CENTS

  useEffect(() => {
    if (!teeEligible) setTeeConsent(false)
  }, [teeEligible])

  const codeForCheckout = fundraisingCode.trim() || undefined

  const trimmedAthleteQuery = athleteQuery.trim()
  const showNoDirectoryMatch =
    attribution === "athlete" &&
    trimmedAthleteQuery.length >= 2 &&
    !athleteSearchLoading &&
    !athleteLookupError &&
    athleteHits.length === 0

  function pickAttributionAthlete() {
    setAttribution("athlete")
  }

  function pickAttributionGeneral() {
    setAttribution("general")
    setFundraisingCode("")
    setAthleteQuery("")
    setAthleteHits([])
    setAthleteMenuOpen(false)
  }

  function selectCompetitorPath() {
    const next = (tierPreference || "sprint") as SpartanRaceTierId
    setEntryIntent("race")
    setTierPreference(next)
    setAmountDollars(suggestedDollarsString(next))
  }

  function selectDonorPath() {
    setEntryIntent("gift")
    setTierPreference("")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const name = donorName.trim()
    if (name.length < 2) {
      setError("Name required.")
      return
    }
    if (attribution === null) {
      setError("Choose athlete or general.")
      return
    }
    if (attribution === "athlete" && !codeForCheckout) {
      setError("Enter a code or pick from search.")
      return
    }
    if (entryIntent === null) {
      setError("Choose racing or donate-only.")
      return
    }
    if (entryIntent === "race" && !tierPreference) {
      setError("Pick your race.")
      return
    }
    if (!consent) {
      setError("Check the box to continue.")
      return
    }
    if (!amountDollars.trim() || amountCents < 500) {
      setError("Minimum $5.")
      return
    }
    if (teeEligible) {
      if (!shirtSize) {
        setError("Shirt size required for $100+.")
        return
      }
      if (!shipLine1.trim() || !shipCity.trim() || !shipState.trim() || !shipPostal.trim()) {
        setError("Shipping address required for $100+.")
        return
      }
      if (!teeConsent) {
        setError("Confirm tee terms.")
        return
      }
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
          ...(teeEligible
            ? {
                shirtSize,
                shipLine1: shipLine1.trim(),
                shipLine2: shipLine2.trim() || undefined,
                shipCity: shipCity.trim(),
                shipState: shipState.trim(),
                shipPostal: shipPostal.trim(),
                shipCountry: shipCountry.trim() || "US",
              }
            : {}),
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
      setError("No checkout URL.")
    } catch {
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }

  const readyToPay = attribution !== null && entryIntent !== null

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-lg text-left">
      <div className="rounded-lg border border-[#333] bg-[#141414] p-3 sm:p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#888]">Two taps</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={pickAttributionAthlete}
            className={`rounded border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
              attribution === "athlete"
                ? "border-[#C8A94A] bg-[#1a170d] text-[#C8A94A]"
                : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
            }`}
          >
            Athlete
          </button>
          <button
            type="button"
            onClick={pickAttributionGeneral}
            className={`rounded border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
              attribution === "general"
                ? "border-[#888] bg-[#222] text-white"
                : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
            }`}
          >
            NC United
          </button>
          <button
            type="button"
            onClick={selectCompetitorPath}
            className={`rounded border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
              entryIntent === "race"
                ? "border-[#CC0000] bg-[#2a1515] text-white"
                : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
            }`}
          >
            Racing
          </button>
          <button
            type="button"
            onClick={selectDonorPath}
            className={`rounded border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
              entryIntent === "gift"
                ? "border-[#C8A94A] bg-[#1a170d] text-[#C8A94A]"
                : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
            }`}
          >
            Donate only
          </button>
        </div>
      </div>

      {entryIntent === "race" && (
        <div className="mt-5">
          <label className="text-xs text-[#888]">Race (amount follows Spartan pricing)</label>
          <select
            value={tierPreference}
            onChange={(e) => setTierPreference(e.target.value as SpartanRaceTierId)}
            required
            className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-sm text-white focus:border-[#CC0000] focus:outline-none"
          >
            <option value="">Choose…</option>
            {SPARTAN_RACE_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {formatUsd(t.suggestedGiftCents)}
              </option>
            ))}
          </select>
        </div>
      )}

      {attribution !== null && entryIntent !== null && (
        <>
          <div className="mt-6 space-y-3">
            <div>
              <label className="text-xs text-[#888]">Name</label>
              <input
                type="text"
                required
                minLength={2}
                autoComplete="name"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-white focus:border-[#CC0000] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#888]">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-white focus:border-[#CC0000] focus:outline-none"
              />
            </div>
          </div>

          {attribution === "athlete" && (
            <>
              <div className="relative mt-5">
                <label className="text-xs text-[#888]">Find them</label>
                <input
                  type="text"
                  placeholder="Last name…"
                  value={athleteQuery}
                  onChange={(e) => {
                    setAthleteQuery(e.target.value)
                    setAthleteMenuOpen(true)
                  }}
                  onFocus={() => athleteHits.length > 0 && setAthleteMenuOpen(true)}
                  className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none"
                  autoComplete="off"
                />
                {athleteSearchLoading && <p className="mt-1 text-[11px] text-[#666]">…</p>}
                {athleteLookupError && (
                  <p className="mt-1 text-[11px] text-amber-200/80">Search down — type code.</p>
                )}
                {showNoDirectoryMatch && (
                  <p className="mt-1 text-[11px] text-[#888]">No hit — use code below.</p>
                )}
                {athleteMenuOpen && athleteHits.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded border border-[#444] bg-[#141414] py-1 shadow-lg">
                    {athleteHits.map((h) => (
                      <li key={h.code}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-[#ddd] hover:bg-[#252525]"
                          onClick={() => {
                            setFundraisingCode(h.code)
                            setAthleteQuery(h.label)
                            setAthleteHits([])
                            setAthleteMenuOpen(false)
                          }}
                        >
                          {h.label}{" "}
                          <span className="font-mono text-xs text-[#888]">{h.code}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-3">
                <label className="text-xs text-[#888]">Or code</label>
                <input
                  type="text"
                  placeholder="NCU-LAST-26"
                  value={fundraisingCode}
                  onChange={(e) => {
                    setFundraisingCode(e.target.value.toUpperCase())
                    setAthleteQuery("")
                  }}
                  className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 font-mono text-sm text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none"
                  autoComplete="off"
                />
              </div>
              <p className="mt-2 text-[11px] text-[#555]">
                <HardLink href="/athletes" className="text-[#777] hover:text-[#C8A94A]">
                  Directory
                </HardLink>
              </p>
            </>
          )}
        </>
      )}

      {attribution !== null && entryIntent !== null && (
        <div className="mt-6">
          {entryIntent === "gift" && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {GIFT_QUICK_AMOUNTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAmountDollars(String(d))}
                  className="min-w-[2.75rem] rounded border border-[#444] bg-[#0A0A0A] px-2 py-1.5 text-xs font-semibold text-[#C8A94A] hover:border-[#C8A94A]"
                >
                  ${d}
                </button>
              ))}
            </div>
          )}
          <label className="text-xs text-[#888]" htmlFor="spartan-amount-usd">
            Amount
          </label>
          <div className="mt-1 flex overflow-hidden rounded border border-[#444] bg-[#0A0A0A] focus-within:border-[#CC0000]">
            <span className="flex items-center border-r border-[#444] bg-[#1a1a1a] px-2.5 text-[#888]">$</span>
            <input
              id="spartan-amount-usd"
              type="number"
              min={5}
              step={1}
              required
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-lg font-bold tabular-nums text-white outline-none"
            />
          </div>
          <p className="mt-1.5 text-center text-[11px] text-[#666]">
            {formatUsd(amountCents)}
            {!teeEligible && amountCents > 0 && amountCents < TEE_THRESHOLD_CENTS && (
              <span className="text-[#555]"> · +{formatUsd(TEE_THRESHOLD_CENTS - amountCents)} to $100 tee</span>
            )}
            {teeEligible && <span className="text-[#C8A94A]"> · Tee unlocked</span>}
          </p>
        </div>
      )}

      {readyToPay && teeEligible && (
        <div className="mt-5 space-y-2 rounded border border-[#C8A94A]/35 bg-[#141414] px-3 py-3">
          <p className="text-xs font-medium text-[#C8A94A]">Free tee — size &amp; ship</p>
          <select
            required={teeEligible}
            value={shirtSize}
            onChange={(e) => setShirtSize(e.target.value)}
            className="w-full border border-[#444] bg-[#0A0A0A] px-2 py-2 text-sm text-white focus:border-[#C8A94A] focus:outline-none"
          >
            <option value="">Size</option>
            {TEE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Street"
            value={shipLine1}
            onChange={(e) => setShipLine1(e.target.value)}
            className="w-full border border-[#444] bg-[#0A0A0A] px-2 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none"
            autoComplete="address-line1"
          />
          <input
            type="text"
            placeholder="Apt (opt)"
            value={shipLine2}
            onChange={(e) => setShipLine2(e.target.value)}
            className="w-full border border-[#444] bg-[#0A0A0A] px-2 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none"
            autoComplete="address-line2"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="City"
              value={shipCity}
              onChange={(e) => setShipCity(e.target.value)}
              className="border border-[#444] bg-[#0A0A0A] px-2 py-2 text-sm text-white placeholder:text-[#555]"
              autoComplete="address-level2"
            />
            <input
              type="text"
              placeholder="ST"
              value={shipState}
              onChange={(e) => setShipState(e.target.value)}
              className="border border-[#444] bg-[#0A0A0A] px-2 py-2 text-sm text-white placeholder:text-[#555]"
              autoComplete="address-level1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="ZIP"
              value={shipPostal}
              onChange={(e) => setShipPostal(e.target.value)}
              className="border border-[#444] bg-[#0A0A0A] px-2 py-2 text-sm text-white placeholder:text-[#555]"
              autoComplete="postal-code"
            />
            <select
              value={shipCountry}
              onChange={(e) => setShipCountry(e.target.value)}
              className="border border-[#444] bg-[#0A0A0A] px-2 py-2 text-sm text-white"
            >
              <option value="US">US</option>
              <option value="CA">CA</option>
            </select>
          </div>
          <label className="flex cursor-pointer gap-2 text-[11px] text-[#999]">
            <input
              type="checkbox"
              checked={teeConsent}
              onChange={(e) => setTeeConsent(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-[#C8A94A]"
            />
            Tee is promo / while supplies last
          </label>
        </div>
      )}

      {readyToPay && (
        <label className="mt-5 flex cursor-pointer gap-2 text-left text-[13px] leading-snug text-[#aaa]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#CC0000]"
          />
          <span>
            {wantsRace ? (
              <>
                Tax gift to NC United. OK to share my email with Spartan for my entry code.
                {attribution === "athlete" && codeForCheckout && <> Code {codeForCheckout}.</>}
                {attribution === "general" && <> No athlete code.</>}
              </>
            ) : (
              <>
                Tax gift to NC United. Not asking for a race entry.
                {attribution === "athlete" && codeForCheckout && <> Code {codeForCheckout}.</>}
                {attribution === "general" && <> General fund.</>}
              </>
            )}
          </span>
        </label>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !readyToPay}
        className="mt-5 w-full min-h-[48px] bg-[#CC0000] font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-wide text-white hover:bg-[#990000] disabled:opacity-50"
      >
        {loading ? "…" : "Checkout"}
      </button>
      {!readyToPay && <p className="mt-2 text-center text-[11px] text-[#666]">Pick all four corners above.</p>}
    </form>
  )
}
