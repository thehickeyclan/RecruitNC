"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { HardLink } from "@/components/hard-link"
import type { SpartanRaceTierId } from "../types"
import { DEFAULT_SPARTAN_RACE_TIER_ID, SPARTAN_SUPER_10K, suggestedCentsForTier } from "../data"

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

/** Legacy ?tier=sprint|kids|… deep links → 10K team race (this page). */
function tierFromSearchParams(searchParams: ReturnType<typeof useSearchParams>): SpartanRaceTierId | null {
  const raw = searchParams.get("tier")?.toLowerCase() ?? ""
  if (!raw) return null
  if (["super", "sprint", "kids", "beast", "ultra"].includes(raw)) return "super"
  return null
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
  /** Public supporter list shows name; false = anonymous on /api/spartan/supporters */
  const [donorListPublic, setDonorListPublic] = useState(true)
  const [fundraisingCode, setFundraisingCode] = useState("")
  /** Race vs donate first */
  const [flow, setFlow] = useState<"race" | "donate" | null>(null)
  /** Donate only: credit athlete vs general fund */
  const [donateMode, setDonateMode] = useState<"athlete" | "general" | null>(null)
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

  const wantsRace = flow === "race"
  const needsAthleteCode = flow === "race" || (flow === "donate" && donateMode === "athlete")

  useEffect(() => {
    const mission = searchParams.get("mission") === "1"
    if (mission) {
      setFlow("donate")
      setDonateMode(null)
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
      setFlow("race")
      setDonateMode(null)
      setTierPreference(t)
      setAmountDollars(suggestedDollarsString(t))
    }
  }, [searchParams])

  useEffect(() => {
    const raw = searchParams.get("athlete")?.trim()
    if (!raw) return
    setFundraisingCode(raw)
    setAthleteQuery("")
    const hasTier = tierFromSearchParams(searchParams) != null
    if (hasTier) {
      setFlow("race")
      setDonateMode(null)
    } else {
      setFlow("donate")
      setDonateMode("athlete")
    }
  }, [searchParams])

  /** Hero CTAs: ?flow=race | ?flow=donate — after mission, tier, and athlete deep links */
  useEffect(() => {
    if (searchParams.get("mission") === "1") return
    if (tierFromSearchParams(searchParams)) return
    if (searchParams.get("athlete")?.trim()) return

    const flowParam = searchParams.get("flow")
    if (flowParam === "race") {
      setFlow("race")
      setDonateMode(null)
      setTierPreference(DEFAULT_SPARTAN_RACE_TIER_ID)
      setAmountDollars(suggestedDollarsString(DEFAULT_SPARTAN_RACE_TIER_ID))
      return
    }
    if (flowParam === "donate") {
      setFlow("donate")
      setTierPreference("")
      setDonateMode(null)
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
    if (flow !== "race") return
    if (!tierPreference) return
    const s = suggestedCentsForTier(tierPreference)
    if (s != null) setAmountDollars(String(Math.round(s / 100)))
  }, [tierPreference, flow])

  useEffect(() => {
    setConsent(false)
  }, [flow, donateMode, tierPreference])

  const amountCents = useMemo(() => dollarsToCents(amountDollars), [amountDollars])
  /** Race path: every participant gets an NC United tee. Donate-only: $100+. */
  const teeEligible = flow === "race" || amountCents >= TEE_THRESHOLD_CENTS

  useEffect(() => {
    if (!teeEligible) setTeeConsent(false)
  }, [teeEligible])

  const codeForCheckout = fundraisingCode.trim() || undefined

  const trimmedAthleteQuery = athleteQuery.trim()
  const showNoDirectoryMatch =
    needsAthleteCode &&
    trimmedAthleteQuery.length >= 2 &&
    !athleteSearchLoading &&
    !athleteLookupError &&
    athleteHits.length === 0

  function selectRace() {
    const next = (tierPreference || DEFAULT_SPARTAN_RACE_TIER_ID) as SpartanRaceTierId
    setFlow("race")
    setDonateMode(null)
    setTierPreference(next)
    setAmountDollars(suggestedDollarsString(next))
  }

  function selectDonate() {
    setFlow("donate")
    setTierPreference("")
    setDonateMode(null)
  }

  function pickDonateAthlete() {
    setDonateMode("athlete")
  }

  function pickDonateGeneral() {
    setDonateMode("general")
    setFundraisingCode("")
    setAthleteQuery("")
    setAthleteHits([])
    setAthleteMenuOpen(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const name = donorName.trim()
    if (name.length < 2) {
      setError("Name required.")
      return
    }
    if (flow === null) {
      setError("Choose Race with us or Give.")
      return
    }
    if (flow === "donate" && donateMode === null) {
      setError("Choose athlete or NC United.")
      return
    }
    if (needsAthleteCode && !codeForCheckout) {
      setError("Search and select an athlete to credit.")
      return
    }
    if (flow === "race" && tierPreference !== "super") {
      setError("This checkout is the Team NC 10K team race — pick Race with us again or refresh.")
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
        setError(flow === "race" ? "Shirt size required for your NC United tee." : "Shirt size required for $100+.")
        return
      }
      if (!shipLine1.trim() || !shipCity.trim() || !shipState.trim() || !shipPostal.trim()) {
        setError(
          flow === "race" ? "Shipping address required for your NC United tee." : "Shipping address required for $100+.",
        )
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
          donorListPublic,
          amountCents,
          tierPreference: flow === "race" ? tierPreference : undefined,
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

  /** Show name / amount / athlete fields */
  const stepUnlocked =
    flow === "race" ? Boolean(tierPreference) : flow === "donate" && donateMode !== null

  const canCheckout =
    stepUnlocked && (!needsAthleteCode || Boolean(codeForCheckout))

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-lg text-left">
      <div className="rounded-lg border border-[#333] bg-[#141414] p-3 sm:p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#888]">Start here</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={selectRace}
            className={`rounded border px-3 py-3 text-center text-sm font-bold leading-tight transition-colors ${
              flow === "race"
                ? "border-[#CC0000] bg-[#2a1515] text-white"
                : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
            }`}
          >
            Race with us
          </button>
          <button
            type="button"
            onClick={selectDonate}
            className={`rounded border px-3 py-3 text-center text-sm font-bold transition-colors ${
              flow === "donate"
                ? "border-[#C8A94A] bg-[#1a170d] text-[#C8A94A]"
                : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
            }`}
          >
            Give
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-[#666]">
          <strong className="text-[#888]">Race with us</strong> — Super 10K with Team NC; search below to credit one
          athlete.
          <br />
          <strong className="text-[#888]">Give</strong> — no race; then <strong className="text-[#777]">an athlete</strong> or{" "}
          <strong className="text-[#777]">NC United</strong>.
        </p>
      </div>

      {flow === "donate" && (
        <div className="mt-5 rounded-lg border border-[#333] bg-[#141414] p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#888]">Your gift goes to</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={pickDonateAthlete}
              className={`rounded border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
                donateMode === "athlete"
                  ? "border-[#C8A94A] bg-[#1a170d] text-[#C8A94A]"
                  : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
              }`}
            >
              An athlete
            </button>
            <button
              type="button"
              onClick={pickDonateGeneral}
              className={`rounded border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
                donateMode === "general"
                  ? "border-[#888] bg-[#222] text-white"
                  : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
              }`}
            >
              NC United
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#666]">Travel, ops, all teams — or one wrestler.</p>
        </div>
      )}

      {flow === "race" && (
        <div className="mt-5 rounded border border-[#CC0000]/35 bg-[#1a0a0a] px-3 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8A94A]">Come race with us</p>
          <p className="mt-2 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase text-white">
            {SPARTAN_SUPER_10K.name}
          </p>
          <p className="mt-1 text-sm text-[#bbb]">
            {SPARTAN_SUPER_10K.detail} · Suggested gift {formatUsd(SPARTAN_SUPER_10K.suggestedGiftCents)} ·{" "}
            {SPARTAN_SUPER_10K.scheduleChip}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-[#888]">{SPARTAN_SUPER_10K.dates}</p>
        </div>
      )}

      {stepUnlocked && (
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
            <label className="flex cursor-pointer items-start gap-2 text-left text-[12px] leading-snug text-[#999]">
              <input
                type="checkbox"
                checked={donorListPublic}
                onChange={(e) => setDonorListPublic(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8A94A]"
              />
              <span>Show my name on the public supporter list (uncheck to stay anonymous)</span>
            </label>
          </div>

          {needsAthleteCode && (
            <>
              <div className="relative mt-5">
                <label className="text-xs text-[#888]">Which athlete? (search)</label>
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
                  <p className="mt-1 text-[11px] text-amber-200/80">Search unavailable — try again in a moment.</p>
                )}
                {showNoDirectoryMatch && (
                  <p className="mt-1 text-[11px] text-[#888]">No match — try another spelling or check the directory.</p>
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
                          {h.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="mt-2 text-[11px] text-[#555]">
                <HardLink href="/athletes" className="text-[#777] hover:text-[#C8A94A]">
                  Directory
                </HardLink>
              </p>
            </>
          )}

          {flow === "donate" && donateMode === "general" && (
            <p className="mt-5 rounded border border-[#333] bg-[#0A0A0A] px-3 py-2 text-[11px] text-[#999]">
              General fund — not tied to a specific athlete.
            </p>
          )}

          <div className="mt-6">
            {flow === "donate" && (
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
              {!teeEligible && flow === "donate" && amountCents > 0 && amountCents < TEE_THRESHOLD_CENTS && (
                <span className="text-[#555]"> · +{formatUsd(TEE_THRESHOLD_CENTS - amountCents)} to $100 tee</span>
              )}
              {teeEligible && flow === "race" && (
                <span className="text-[#C8A94A]"> · NC United tee included</span>
              )}
              {teeEligible && flow === "donate" && (
                <span className="text-[#C8A94A]"> · Tee unlocked</span>
              )}
            </p>
          </div>
        </>
      )}

      {stepUnlocked && teeEligible && (
        <div className="mt-5 space-y-2 rounded border border-[#C8A94A]/35 bg-[#141414] px-3 py-3">
          <p className="text-xs font-medium text-[#C8A94A]">
            {flow === "race" ? "NC United tee (included) — size & ship" : "Free tee — size & ship"}
          </p>
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

      {stepUnlocked && (
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
                {codeForCheckout && (
                  <>
                    {" "}
                    {athleteQuery.trim() ? (
                      <>Gift attributed to {athleteQuery}.</>
                    ) : (
                      <>Gift attributed to the athlete you selected at checkout.</>
                    )}
                  </>
                )}
              </>
            ) : donateMode === "general" ? (
              <>Tax gift to NC United — general programs.</>
            ) : (
              <>
                Tax gift to NC United. Not requesting a race entry.
                {codeForCheckout && (
                  <>
                    {" "}
                    {athleteQuery.trim() ? (
                      <>Gift attributed to {athleteQuery}.</>
                    ) : (
                      <>Gift attributed to the athlete you selected at checkout.</>
                    )}
                  </>
                )}
              </>
            )}
          </span>
        </label>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !canCheckout}
        className="mt-5 w-full min-h-[48px] bg-[#CC0000] font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-wide text-white hover:bg-[#990000] disabled:opacity-50"
      >
        {loading ? "…" : "Checkout"}
      </button>
      {stepUnlocked && needsAthleteCode && !codeForCheckout && (
        <p className="mt-2 text-center text-[11px] text-[#888]">Search and select an athlete to continue.</p>
      )}
      {!stepUnlocked && flow === null && (
        <p className="mt-2 text-center text-[11px] text-[#666]">Choose Race with us or Give.</p>
      )}
      {!stepUnlocked && flow === "donate" && donateMode === null && (
        <p className="mt-2 text-center text-[11px] text-[#666]">Choose athlete or NC United.</p>
      )}
    </form>
  )
}
