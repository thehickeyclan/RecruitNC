"use client"

import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { HardLink } from "@/components/hard-link"
import type { SpartanRaceTierId } from "../types"
import {
  DEFAULT_SPARTAN_RACE_TIER_ID,
  FAYETTEVILLE_SPARTAN_URL,
  SPARTAN_RACE_TIERS,
  suggestedCentsForTier,
} from "../data"

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

const VALID_TIER_PARAMS = new Set<string>(["sprint", "super", "beast", "ultra", "kids", "other"])

/** Legacy ?tier=… deep links — must match a known distance. */
function tierFromSearchParams(searchParams: ReturnType<typeof useSearchParams>): SpartanRaceTierId | null {
  const raw = searchParams.get("tier")?.toLowerCase() ?? ""
  if (!raw || !VALID_TIER_PARAMS.has(raw)) return null
  return raw as SpartanRaceTierId
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
  /** Race path: optional — who is actually running if not the donor (shown on public supporter table) */
  const [raceParticipantName, setRaceParticipantName] = useState("")
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [athleteQuery, setAthleteQuery] = useState("")
  const [athleteHits, setAthleteHits] = useState<{ code: string; label: string }[]>([])
  const [athleteMenuOpen, setAthleteMenuOpen] = useState(false)
  const [athleteSearchLoading, setAthleteSearchLoading] = useState(false)
  const [athleteLookupError, setAthleteLookupError] = useState(false)
  /** Wrestler not in directory — staff credit via Stripe manual_credit_name (up to 120 chars) */
  const [manualCreditName, setManualCreditName] = useState("")

  const [shirtSize, setShirtSize] = useState("")
  const [shipLine1, setShipLine1] = useState("")
  const [shipLine2, setShipLine2] = useState("")
  const [shipCity, setShipCity] = useState("")
  const [shipState, setShipState] = useState("")
  const [shipPostal, setShipPostal] = useState("")
  const [shipCountry, setShipCountry] = useState("US")

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
    setManualCreditName("")
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

  /** Resolve directory label for bookmark URLs (?athlete=NCU-…) so checkout sends athlete_display_name. */
  useEffect(() => {
    const code = fundraisingCode.trim()
    if (!code || athleteQuery.trim()) return
    const m = /^NCU-([A-Za-z]+)-(\d{2})$/i.exec(code)
    if (!m) return
    const last = m[1]
    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/spartan/fundraising-athletes?q=${encodeURIComponent(last)}`)
          const data = (await res.json()) as { athletes?: { code: string; label: string }[] }
          if (cancelled) return
          const hit = data.athletes?.find((a) => a.code.trim().toLowerCase() === code.toLowerCase())
          if (hit) setAthleteQuery(hit.label)
        } catch {
          /* ignore */
        }
      })()
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [fundraisingCode, athleteQuery])

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

  const codeForCheckout = fundraisingCode.trim() || undefined
  const manualCreditTrimmed = manualCreditName.trim()
  const hasManualCredit = manualCreditTrimmed.length >= 2
  const hasAthleteCredit = Boolean(codeForCheckout) || hasManualCredit

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
    setManualCreditName("")
    setTierPreference(next)
    setAmountDollars(suggestedDollarsString(next))
  }

  function selectDonate() {
    setFlow("donate")
    setTierPreference("")
    setDonateMode(null)
    setManualCreditName("")
  }

  function pickDonateAthlete() {
    setDonateMode("athlete")
  }

  function pickDonateGeneral() {
    setDonateMode("general")
    setFundraisingCode("")
    setAthleteQuery("")
    setManualCreditName("")
    setAthleteHits([])
    setAthleteMenuOpen(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const name = donorName.trim()
    if (name.length < 2) {
      setError("Enter your name (the person paying).")
      return
    }
    if (flow === null) {
      setError("Choose Race with us or Not racing.")
      return
    }
    if (flow === "donate" && donateMode === null) {
      setError("Choose a wrestler to sponsor or NC United (general fund).")
      return
    }
    if (needsAthleteCode && !hasAthleteCredit) {
      setError("Select a wrestler from the list, or enter their name in the box below.")
      return
    }
    if (flow === "donate" && !consent) {
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
          tierPreference:
            flow === "race" ? tierPreference || DEFAULT_SPARTAN_RACE_TIER_ID : undefined,
          athleteCode: codeForCheckout,
          ...(codeForCheckout && athleteQuery.trim()
            ? { athleteDisplayName: athleteQuery.trim() }
            : {}),
          ...(!codeForCheckout && hasManualCredit ? { manualAthleteName: manualCreditTrimmed } : {}),
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
          ...(flow === "race" && raceParticipantName.trim()
            ? { raceParticipantName: raceParticipantName.trim() }
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
    stepUnlocked &&
    (!needsAthleteCode || hasAthleteCredit) &&
    (flow !== "donate" || consent)

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-6 max-w-lg px-1 pb-[max(1rem,env(safe-area-inset-bottom))] text-left sm:mt-8 sm:px-0"
    >
      <p className="mb-3 rounded border border-[#333] bg-[#0f0f0f] px-3 py-2.5 text-left text-[13px] leading-snug text-[#ccc] sm:text-sm">
        <span className="font-semibold text-white">Two different people: </span>
        <span className="text-[#aaa]">the </span>
        <span className="font-medium text-[#8ab4d8]">donor</span>
        <span className="text-[#aaa]"> (you — whoever pays) and the </span>
        <span className="font-medium text-[#C8A94A]">wrestler</span>
        <span className="text-[#aaa]"> (who gets credit — chosen in search).</span>
      </p>
      <div className="rounded-lg border border-[#333] bg-[#141414] p-3 sm:p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#888]">Start here</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={selectRace}
            className={`min-h-[48px] rounded border px-2 py-3 text-center text-sm font-bold leading-tight transition-colors sm:px-3 ${
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
            className={`min-h-[48px] rounded border px-2 py-3 text-center text-sm font-bold transition-colors sm:px-3 ${
              flow === "donate"
                ? "border-[#C8A94A] bg-[#1a170d] text-[#C8A94A]"
                : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
            }`}
          >
            Not racing
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-[#666]">
          <strong className="text-[#888]">Race with us</strong> — choose any Spartan distance below; credit one wrestler in
          search.
          <br />
          <strong className="text-[#888]">Not racing</strong> — sponsor a wrestler or give to NC United.{" "}
          <strong className="text-[#aaa]">Any amount from $5.</strong>
        </p>
        <p className="mt-3 rounded border border-[#C8A94A]/35 bg-[#1a170d] px-3 py-2.5 text-xs leading-snug text-[#ccc] sm:text-[11px]">
          <strong className="text-[#C8A94A]">More than one wrestler?</strong> Each payment credits{" "}
          <strong className="text-white">one</strong> athlete — check out for the first, then repeat for the next.{" "}
          <strong className="text-[#8ab4d8]">Donor</strong> fields = who pays (can be the same parent both times).{" "}
          <strong className="text-[#C8A94A]">Wrestler</strong> = pick in search each time.
        </p>
      </div>

      {flow === "donate" && (
        <div className="mt-5 rounded-lg border border-[#333] bg-[#141414] p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#888]">Not racing — send support to</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={pickDonateAthlete}
              className={`min-h-[48px] rounded border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
                donateMode === "athlete"
                  ? "border-[#C8A94A] bg-[#1a170d] text-[#C8A94A]"
                  : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
              }`}
            >
              Sponsor a wrestler
            </button>
            <button
              type="button"
              onClick={pickDonateGeneral}
              className={`min-h-[48px] rounded border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
                donateMode === "general"
                  ? "border-[#888] bg-[#222] text-white"
                  : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
              }`}
            >
              NC United (general)
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#666]">Every amount helps — minimum $5 at checkout.</p>
        </div>
      )}

      {flow === "race" && (
        <div className="mt-5 space-y-3 rounded border border-[#CC0000]/35 bg-[#1a0a0a] px-3 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8A94A]">Come race with us</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#aaa]">
              Choose the <strong className="text-white">Spartan distance</strong> you&apos;re registering for (Team NC&apos;s
              crew race is the Super 10K on May 3). Suggested amounts are ballparks — change the number to match what you
              need.
            </p>
          </div>
          <div>
            <label htmlFor="spartan-race-tier" className="text-[11px] text-[#888]">
              Which race are you targeting?
            </label>
            <select
              id="spartan-race-tier"
              value={tierPreference || DEFAULT_SPARTAN_RACE_TIER_ID}
              onChange={(e) => setTierPreference(e.target.value as SpartanRaceTierId)}
              className="mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#CC0000] focus:outline-none"
            >
              {SPARTAN_RACE_TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.featured ? "★ " : ""}
                  {t.name} · {t.priceLabel} suggested · {t.scheduleChip}
                  {t.featured ? " — Team NC" : ""}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[10px] leading-relaxed text-[#666]">
              Open vs Age Group / competitive waves are selected when you register on{" "}
              <span className="text-[#888]">Spartan.com</span>.
            </p>
            <a
              href={FAYETTEVILLE_SPARTAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[11px] font-medium text-[#C8A94A] underline-offset-2 hover:underline"
            >
              Learn more about Fayetteville race options on Spartan.com →
            </a>
          </div>
        </div>
      )}

      {stepUnlocked && (
        <>
          <div className="mt-6 space-y-3 rounded-lg border border-[#2a3d4f] border-l-4 border-l-[#5a8ab0] bg-[#0c1014] p-3 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8ab4d8]">1 · Donor (who pays)</p>
            <p className="text-xs leading-snug text-[#9ca3af]">
              Receipt and card holder — parent, friend, or you.{" "}
              <span className="text-[#666]">Not the wrestler&apos;s name unless they pay themselves.</span>
            </p>
            <div>
              <label htmlFor="spartan-donor-name" className="text-sm font-medium text-[#ccc]">
                Full name
              </label>
              <input
                id="spartan-donor-name"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#5a8ab0] focus:outline-none focus:ring-1 focus:ring-[#5a8ab0]"
              />
            </div>
            <div>
              <label htmlFor="spartan-donor-email" className="text-sm font-medium text-[#ccc]">
                Email
              </label>
              <input
                id="spartan-donor-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#5a8ab0] focus:outline-none focus:ring-1 focus:ring-[#5a8ab0]"
              />
            </div>
            {flow === "race" && (
              <div>
                <label htmlFor="spartan-race-runner" className="text-sm font-medium text-[#ccc]">
                  Runner / race participant <span className="font-normal text-[#666]">(optional)</span>
                </label>
                <p className="mt-0.5 text-[11px] leading-snug text-[#888]">
                  If someone other than the donor is racing (e.g. parent pays, child runs), enter their name. Shown on
                  the public list; donor name above stays on the tax receipt.
                </p>
                <input
                  id="spartan-race-runner"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Roland Owen"
                  value={raceParticipantName}
                  onChange={(e) => setRaceParticipantName(e.target.value)}
                  className="mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white placeholder:text-[#555] focus:border-[#5a8ab0] focus:outline-none focus:ring-1 focus:ring-[#5a8ab0]"
                />
              </div>
            )}
            {flow === "donate" && (
              <div className="space-y-4 border-t border-[#2a3d4f] pt-4">
                <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-left text-[13px] leading-relaxed text-[#999] sm:text-[13px]">
                  <input
                    type="checkbox"
                    checked={donorListPublic}
                    onChange={(e) => setDonorListPublic(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#C8A94A]"
                  />
                  <span className="min-w-0 flex-1 break-words">
                    Show my name on the public supporter list (uncheck to stay anonymous)
                  </span>
                </label>
                <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-left text-[13px] leading-relaxed text-[#aaa] sm:text-[13px]">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#CC0000]"
                  />
                  <span className="min-w-0 flex-1 break-words">
                    {donateMode === "general" ? (
                      <>Tax gift to NC United — general programs.</>
                    ) : (
                      <>
                        <span className="block">Tax gift to NC United. Not requesting a race entry.</span>
                        {codeForCheckout && athleteQuery.trim() && (
                          <span className="mt-1 block text-[#bbb]">
                            Gift credited to {athleteQuery} (directory).
                          </span>
                        )}
                        {codeForCheckout && !athleteQuery.trim() && (
                          <span className="mt-1 block text-[#bbb]">
                            Gift credited to the wrestler you selected at checkout.
                          </span>
                        )}
                        {!codeForCheckout && hasManualCredit && (
                          <span className="mt-1 block text-[#bbb]">
                            Gift credit request for {manualCreditTrimmed} (manual — not in directory yet).
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </label>
              </div>
            )}
          </div>

          {needsAthleteCode && (
            <>
              <div className="relative mt-5 rounded-lg border border-[#4a3d1a] border-l-4 border-l-[#C8A94A] bg-[#141008] p-3 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C8A94A]">2 · Wrestler (credit)</p>
                <p className="mt-1 text-xs leading-snug text-[#b9a86e]">
                  Who the gift counts for — search and tap their name. This is separate from the donor name above.
                </p>
                <label className="mt-3 block text-sm font-medium text-[#ddd]" htmlFor="spartan-athlete-search">
                  Find wrestler
                </label>
                <p className="mt-0.5 text-[11px] leading-snug text-[#888]">
                  One wrestler per payment — pay again for a second athlete.
                </p>
                <input
                  id="spartan-athlete-search"
                  type="text"
                  placeholder="Type last name…"
                  value={athleteQuery}
                  onChange={(e) => {
                    setAthleteQuery(e.target.value)
                    setAthleteMenuOpen(true)
                  }}
                  onFocus={() => athleteHits.length > 0 && setAthleteMenuOpen(true)}
                  className="mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {athleteSearchLoading && <p className="mt-1 text-[11px] text-[#666]">…</p>}
                {athleteLookupError && (
                  <p className="mt-1 text-[11px] text-amber-200/80">Search unavailable — try again in a moment.</p>
                )}
                {showNoDirectoryMatch && (
                  <p className="mt-1 text-[11px] text-[#888]">
                    No match — try another spelling or the{" "}
                    <HardLink href="/athletes" className="text-[#C8A94A] hover:underline">
                      directory
                    </HardLink>
                    . You can still give: use the box below or switch to a general gift.
                  </p>
                )}
                {athleteMenuOpen && athleteHits.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-[min(50vh,16rem)] w-full overflow-auto rounded border border-[#444] bg-[#141414] py-1 shadow-lg">
                    {athleteHits.map((h) => (
                      <li key={h.code}>
                        <button
                          type="button"
                          className="min-h-[48px] w-full px-3 py-3 text-left text-base text-[#ddd] hover:bg-[#252525] active:bg-[#303030]"
                          onClick={() => {
                            setFundraisingCode(h.code)
                            setAthleteQuery(h.label)
                            setManualCreditName("")
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
                <p className="mt-3 text-[11px] text-[#666]">
                  <HardLink href="/athletes" className="text-[#C8A94A] underline-offset-2 hover:underline">
                    Open full athlete directory
                  </HardLink>
                </p>

                <div className="mt-5 border-t border-[#333] pt-4">
                  <p className="text-[11px] leading-relaxed text-[#999]">
                    <strong className="text-[#C8A94A]">Wrestler not in search?</strong> Type their name for staff to
                    credit — still the <strong className="text-[#ccc]">athlete</strong>, not the donor.
                  </p>
                  <label className="mt-3 block text-sm font-medium text-[#bbb]" htmlFor="spartan-manual-credit">
                    Athlete name (manual)
                  </label>
                  <input
                    id="spartan-manual-credit"
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. Jordan Smith · school if helpful"
                    value={manualCreditName}
                    onChange={(e) => {
                      const v = e.target.value
                      setManualCreditName(v)
                      if (v.trim().length > 0) setFundraisingCode("")
                    }}
                    className="mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none"
                  />
                  <p className="mt-2 text-[11px] text-[#666]">
                    Or give to{" "}
                    <button
                      type="button"
                      className="font-medium text-[#C8A94A] underline underline-offset-2 hover:text-[#dfd08a]"
                      onClick={pickDonateGeneral}
                    >
                      NC United (general)
                    </button>{" "}
                    with no wrestler.
                  </p>
                </div>
              </div>
            </>
          )}

          {flow === "donate" && donateMode === "general" && (
            <p className="mt-5 rounded border border-[#333] bg-[#0A0A0A] px-3 py-2 text-[11px] text-[#999]">
              General fund — not tied to a specific wrestler.
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
                    className="min-h-[44px] min-w-[3rem] rounded border border-[#444] bg-[#0A0A0A] px-2.5 text-sm font-semibold text-[#C8A94A] hover:border-[#C8A94A] active:scale-[0.98]"
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
        <div className="mt-5 rounded border border-[#C8A94A]/35 bg-[#141414] px-3 py-3">
          <p className="text-xs font-medium text-[#C8A94A]">
            {flow === "race" ? "NC United tee (included) — size & ship" : "Free tee — size & ship"}
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="mx-auto shrink-0 sm:mx-0">
              <div className="relative aspect-square w-[min(100%,220px)] overflow-hidden rounded border border-[#333] bg-black sm:w-[200px]">
                <Image
                  src="/images/spartan-nc-united-tee.png"
                  alt="2026 Fayetteville team tee: front and back on black shirt"
                  fill
                  sizes="220px"
                  className="object-contain object-center"
                />
              </div>
              <p className="mt-1.5 text-center text-[10px] leading-snug text-[#666] sm:text-left">Artwork may vary.</p>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
          <select
            required={teeEligible}
            value={shirtSize}
            onChange={(e) => setShirtSize(e.target.value)}
            className="min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white focus:border-[#C8A94A] focus:outline-none"
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
            className="min-h-[44px] w-full border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none"
            autoComplete="address-line1"
          />
          <input
            type="text"
            placeholder="Apt (opt)"
            value={shipLine2}
            onChange={(e) => setShipLine2(e.target.value)}
            className="min-h-[44px] w-full border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none"
            autoComplete="address-line2"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="City"
              value={shipCity}
              onChange={(e) => setShipCity(e.target.value)}
              className="min-h-[44px] border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white placeholder:text-[#555]"
              autoComplete="address-level2"
            />
            <input
              type="text"
              placeholder="ST"
              value={shipState}
              onChange={(e) => setShipState(e.target.value)}
              className="min-h-[44px] border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white placeholder:text-[#555]"
              autoComplete="address-level1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="ZIP"
              value={shipPostal}
              onChange={(e) => setShipPostal(e.target.value)}
              className="min-h-[44px] border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white placeholder:text-[#555]"
              autoComplete="postal-code"
            />
            <select
              value={shipCountry}
              onChange={(e) => setShipCountry(e.target.value)}
              className="min-h-[44px] border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white"
            >
              <option value="US">US</option>
              <option value="CA">CA</option>
            </select>
          </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !canCheckout}
        className="mt-5 w-full min-h-[48px] bg-[#CC0000] font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-wide text-white hover:bg-[#990000] disabled:opacity-50"
      >
        {loading ? "…" : "Checkout"}
      </button>
      {stepUnlocked && needsAthleteCode && !hasAthleteCredit && (
        <p className="mt-2 text-center text-[11px] text-[#888]">
          Search and select a wrestler, or enter a name under &quot;Not in the directory.&quot;
        </p>
      )}
      {!stepUnlocked && flow === null && (
        <p className="mt-2 text-center text-[11px] text-[#666]">Choose Race with us or Give.</p>
      )}
      {!stepUnlocked && flow === "donate" && donateMode === null && (
        <p className="mt-2 text-center text-[11px] text-[#666]">Choose wrestler or NC United.</p>
      )}
    </form>
  )
}
