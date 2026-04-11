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
      setError("Name required.")
      return
    }
    if (flow === null) {
      setError("Choose Race with us or Give.")
      return
    }
    if (flow === "donate" && donateMode === null) {
      setError("Choose wrestler or NC United.")
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
          <strong className="text-[#888]">Race with us</strong> — pick your Spartan distance (Team NC centers on the{" "}
          <strong className="text-[#ccc]">Super 10K</strong>); search below to credit one wrestler.
          <br />
          <strong className="text-[#888]">Give</strong> — no race; then <strong className="text-[#777]">a wrestler</strong> or{" "}
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
              A wrestler
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
        <div className="mt-5 space-y-3 rounded border border-[#CC0000]/35 bg-[#1a0a0a] px-3 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8A94A]">Come race with us</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#aaa]">
              <strong className="text-white">Team NC</strong> is on the <strong className="text-[#C8A94A]">Super 10K</strong>{" "}
              (May 3). Choose any distance below — suggested gift is ballpark vs Spartan&apos;s &quot;from&quot; pricing; change
              the amount if you like.
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
              className="mt-1.5 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white focus:border-[#CC0000] focus:outline-none"
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
            {flow === "donate" && (
              <div className="space-y-4 border-t border-[#2a2a2a] pt-4">
                <label className="flex cursor-pointer items-start gap-3 text-left text-[12px] leading-relaxed text-[#999] sm:text-[13px]">
                  <input
                    type="checkbox"
                    checked={donorListPublic}
                    onChange={(e) => setDonorListPublic(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#C8A94A]"
                  />
                  <span className="min-w-0 flex-1 break-words">
                    Show my name on the public supporter list (uncheck to stay anonymous)
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-left text-[12px] leading-relaxed text-[#aaa] sm:text-[13px]">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#CC0000]"
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
              <div className="relative mt-5">
                <label className="text-xs text-[#888]">Which wrestler? (search)</label>
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
                  <p className="mt-1 text-[11px] text-[#888]">
                    No match — try another spelling or the{" "}
                    <HardLink href="/athletes" className="text-[#C8A94A] hover:underline">
                      directory
                    </HardLink>
                    . You can still give: use the box below or switch to a general gift.
                  </p>
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
              </div>
              <p className="mt-2 text-[11px] text-[#555]">
                <HardLink href="/athletes" className="text-[#777] hover:text-[#C8A94A]">
                  Directory
                </HardLink>
              </p>

              <div className="mt-5 rounded border border-[#333] bg-[#101010] px-3 py-3 text-left">
                <p className="text-[11px] leading-relaxed text-[#999]">
                  <strong className="text-[#ccc]">You can still give.</strong> Support{" "}
                  <button
                    type="button"
                    className="font-medium text-[#C8A94A] underline underline-offset-2 hover:text-[#dfd08a]"
                    onClick={pickDonateGeneral}
                  >
                    NC United (general)
                  </button>{" "}
                  with no wrestler attached — or enter their name in the box below if they&apos;re not in search yet; we
                  credit the gift from that line on our side.
                </p>
                <label className="mt-3 block text-xs text-[#888]" htmlFor="spartan-manual-credit">
                  Not in the directory yet? Wrestler to credit (freeform)
                </label>
                <input
                  id="spartan-manual-credit"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Jordan Smith · school or team if helpful"
                  value={manualCreditName}
                  onChange={(e) => {
                    const v = e.target.value
                    setManualCreditName(v)
                    if (v.trim().length > 0) setFundraisingCode("")
                  }}
                  className="mt-1 w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none"
                />
                <p className="mt-1.5 text-[10px] text-[#666]">
                  Same line is fine—staff match this in Stripe. Two or more characters to continue checkout.
                </p>
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
