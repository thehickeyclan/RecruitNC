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

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

type FieldValidation = { error: null; fields: [] } | { error: string; fields: string[] }

function scrollToFieldId(id: string) {
  if (typeof document === "undefined") return
  requestAnimationFrame(() => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.focus()
    } else {
      el.querySelector<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button")?.focus()
    }
  })
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

/** Single-page checkout (pre-wizard). Use `?classic=1` on /spartan or `NEXT_PUBLIC_SPARTAN_CLASSIC_CHECKOUT=1` to fall back. */
export function SpartanDonateFormClassic() {
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [donorName, setDonorName] = useState("")
  /** Optional: contact person if receipt is an organization (Stripe: payer_contact_name) */
  const [payerContactName, setPayerContactName] = useState("")
  /** Race path: optional — who is actually running if not the donor (shown on public supporter table) */
  const [raceParticipantName, setRaceParticipantName] = useState("")
  /** Public supporter list shows name; false = anonymous on /api/spartan/supporters */
  const [donorListPublic, setDonorListPublic] = useState(true)
  /** Stripe payer_type — company / org hall of fame when name is public */
  const [receiptIsOrganization, setReceiptIsOrganization] = useState(false)
  const [fundraisingCode, setFundraisingCode] = useState("")
  /** Race vs donate first */
  const [flow, setFlow] = useState<"race" | "donate" | null>(null)
  /** Donate only: credit athlete vs general fund */
  const [donateMode, setDonateMode] = useState<"athlete" | "general" | null>(null)
  const [tierPreference, setTierPreference] = useState<SpartanRaceTierId | "">("")
  const [amountDollars, setAmountDollars] = useState("50")
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
      // Default mission landing to sponsoring a wrestler; ?mode=fund switches to NC United fund only
      const mode = searchParams.get("mode")?.toLowerCase()
      setDonateMode(mode === "fund" || mode === "ncunited" ? "general" : "athlete")
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

  /** Hero CTAs: ?flow=race | ?flow=sponsor | ?flow=fund | legacy ?flow=donate */
  useEffect(() => {
    if (searchParams.get("mission") === "1") return
    if (tierFromSearchParams(searchParams)) return
    if (searchParams.get("athlete")?.trim()) return

    const flowParam = searchParams.get("flow")?.toLowerCase() ?? ""
    if (flowParam === "race") {
      setFlow("race")
      setDonateMode(null)
      setTierPreference(DEFAULT_SPARTAN_RACE_TIER_ID)
      setAmountDollars(suggestedDollarsString(DEFAULT_SPARTAN_RACE_TIER_ID))
      return
    }
    if (flowParam === "sponsor") {
      setFlow("donate")
      setTierPreference("")
      setDonateMode("athlete")
      setAmountDollars("50")
      return
    }
    if (flowParam === "fund" || flowParam === "ncunited") {
      setFlow("donate")
      setTierPreference("")
      setDonateMode("general")
      setFundraisingCode("")
      setAthleteQuery("")
      setManualCreditName("")
      setAmountDollars("50")
      return
    }
    if (flowParam === "donate") {
      setFlow("donate")
      setTierPreference("")
      setDonateMode("athlete")
      setAmountDollars("50")
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
    setFieldHighlights([])
  }, [flow, donateMode, tierPreference])

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

  function selectSponsoring() {
    setFlow("donate")
    setTierPreference("")
    setDonateMode("athlete")
    setManualCreditName("")
  }

  function selectDonatingFund() {
    setFlow("donate")
    setTierPreference("")
    setDonateMode("general")
    setFundraisingCode("")
    setAthleteQuery("")
    setManualCreditName("")
    setAthleteHits([])
    setAthleteMenuOpen(false)
  }

  function validateClassicSubmit(): FieldValidation {
    const name = donorName.trim()
    if (name.length < 2) {
      return {
        error:
          "Enter the name that should appear on the receipt — individual or organization — not the wrestler you're sponsoring.",
        fields: ["spartan-donor-name"],
      }
    }
    if (!email.trim() || !emailOk(email)) {
      return { error: "Enter a valid email.", fields: ["spartan-donor-email"] }
    }
    if (flow === null) {
      return { error: "Choose racing, sponsoring, or donating.", fields: ["spartan-classic-pick-support"] }
    }
    if (flow === "donate" && donateMode === null) {
      return {
        error: "Choose sponsoring (a wrestler) or donating (NC United Training Fund).",
        fields: ["spartan-classic-pick-support"],
      }
    }
    if (needsAthleteCode && !hasAthleteCredit) {
      return {
        error: "Select a wrestler from the list, or enter their name in the box below.",
        fields: ["spartan-athlete-search", "spartan-manual-credit"],
      }
    }
    if (!amountDollars.trim() || amountCents < 500) {
      return { error: "Minimum $5.", fields: ["spartan-amount-usd"] }
    }
    if (teeEligible) {
      if (!shirtSize) {
        return {
          error: flow === "race" ? "Shirt size required for your NC United tee." : "Shirt size required for $100+.",
          fields: ["spartan-c-tee-size"],
        }
      }
      const miss: string[] = []
      if (!shipLine1.trim()) miss.push("spartan-c-ship-line1")
      if (!shipCity.trim()) miss.push("spartan-c-ship-city")
      if (!shipState.trim()) miss.push("spartan-c-ship-state")
      if (!shipPostal.trim()) miss.push("spartan-c-ship-postal")
      if (miss.length) {
        return {
          error:
            flow === "race" ? "Shipping address required for your NC United tee." : "Shipping address required for $100+.",
          fields: miss,
        }
      }
    }
    return { error: null, fields: [] }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const v = validateClassicSubmit()
    if (v.error) {
      setError(v.error)
      setFieldHighlights(v.fields)
      if (v.fields[0]) scrollToFieldId(v.fields[0])
      return
    }
    setFieldHighlights([])
    setLoading(true)
    try {
      const res = await fetch("/api/spartan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          donorName: name,
          ...(payerContactName.trim() ? { payerContactName: payerContactName.trim().slice(0, 120) } : {}),
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
          ...(receiptIsOrganization ? { payerType: "organization" } : {}),
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

  const canCheckout = stepUnlocked && (!needsAthleteCode || hasAthleteCredit)

  const ringInvalid = (id: string) =>
    fieldHighlights.includes(id)
      ? "ring-2 ring-amber-500/90 ring-offset-2 ring-offset-[#0a0a0a] border-amber-500/50"
      : ""

  const dismissHighlight = (id: string) => setFieldHighlights((f) => f.filter((x) => x !== id))

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-6 max-w-lg px-1 pb-[max(1rem,env(safe-area-inset-bottom))] text-left sm:mt-8 sm:px-0"
    >
      <div className="rounded-lg border border-[#333] bg-[#141414] p-3 sm:p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#888]">Pick how you want to support:</p>
        <div
          id="spartan-classic-pick-support"
          className={`mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 ${
            fieldHighlights.includes("spartan-classic-pick-support")
              ? "rounded-md p-0.5 ring-2 ring-amber-500/90 ring-offset-2 ring-offset-[#141414]"
              : ""
          }`}
        >
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                selectRace()
                dismissHighlight("spartan-classic-pick-support")
              }}
              className={`min-h-[48px] rounded border px-2 py-3 text-center text-sm font-bold leading-tight transition-colors sm:px-2 ${
                flow === "race"
                  ? "border-[#CC0000] bg-[#2a1515] text-white"
                  : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
              }`}
            >
              Racing
            </button>
            <p className="text-[10px] leading-snug text-[#777] sm:min-h-[4.5rem]">
              Sign up for a Spartan race and <strong className="text-[#999]">credit a wrestler</strong>. You&apos;ll receive
              registration steps <strong className="text-[#999]">after checkout</strong> — not here. Amount is a{" "}
              <strong className="text-[#999]">suggestion</strong>.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                selectSponsoring()
                dismissHighlight("spartan-classic-pick-support")
              }}
              className={`min-h-[48px] rounded border px-2 py-3 text-center text-sm font-bold leading-tight transition-colors sm:px-2 ${
                flow === "donate" && donateMode === "athlete"
                  ? "border-[#C8A94A] bg-[#1a170d] text-[#C8A94A]"
                  : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
              }`}
            >
              Sponsoring
            </button>
            <p className="text-[10px] leading-snug text-[#777] sm:min-h-[2.75rem]">
              <strong className="text-[#999]">Sponsor one athlete</strong> · <strong className="text-[#C8A94A]">$5 minimum</strong>{" "}
              · any amount
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                selectDonatingFund()
                dismissHighlight("spartan-classic-pick-support")
              }}
              className={`min-h-[48px] rounded border px-2 py-3 text-center text-sm font-bold leading-tight transition-colors sm:px-2 ${
                flow === "donate" && donateMode === "general"
                  ? "border-[#888] bg-[#222] text-white"
                  : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
              }`}
            >
              Donating
            </button>
            <p className="text-[10px] leading-snug text-[#777] sm:min-h-[2.75rem]">
              <strong className="text-[#999]">NC United Training Fund</strong> ·{" "}
              <strong className="text-[#8ab4d8]">$5 min</strong>
            </p>
          </div>
        </div>
        <p className="mt-3 rounded border border-[#C8A94A]/35 bg-[#1a170d] px-3 py-2.5 text-[11px] leading-snug text-[#bbb] sm:text-xs">
          <strong className="text-[#C8A94A]">Two kids?</strong> Finish checkout once, start again. Same parent name is fine —
          pick a different wrestler each time.
        </p>
      </div>

      <div className="mx-auto mt-6 w-full max-w-[240px] text-center">
        <div className="relative aspect-square overflow-hidden rounded border border-[#333] bg-[#0a0a0a]">
          <Image
            src="/images/spartan-nc-united-tee.png"
            alt="2026 Fayetteville team tee: black shirt, NC mark and Spartan helmet on front; back reads Strength in Unity, Fayetteville May 2026"
            fill
            sizes="240px"
            className="object-contain object-center"
          />
        </div>
        <p className="mt-2 text-center text-[10px] text-[#666]">Artwork may vary; while supplies last.</p>
      </div>
      <p className="mx-auto mt-4 max-w-md text-center text-sm text-[#888]">
        Team tee: included for race signups; $100+ gifts without a race also qualify (while supplies last). Size and ship on
        this form.
      </p>

      {flow === "race" && (
        <div className="mt-5 space-y-3 rounded border border-[#CC0000]/35 bg-[#1a0a0a] px-3 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8A94A]">Come race with us</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#aaa]">
              Pick <strong className="text-white">any Fayetteville Spartan distance</strong> below (no prices in the menu).
              The amount field lower on this form fills in a <strong className="text-white">recommended</strong> NC United gift
              for that race — donate more, less, or the same ($5 minimum).
            </p>
          </div>
          <div>
            <label htmlFor="spartan-race-tier" className="text-[11px] text-[#888]">
              Which race are you signing up for?
            </label>
            <p className="mt-1.5 text-[10px] leading-snug text-[#777]">
              <strong className="text-[#999]">Super 10K</strong> is the default — many NC United athletes line up on{" "}
              <strong className="text-[#999]">Sunday, May 3</strong>. You can select any race in the menu.
            </p>
            <select
              id="spartan-race-tier"
              value={tierPreference || DEFAULT_SPARTAN_RACE_TIER_ID}
              onChange={(e) => {
                const id = e.target.value as SpartanRaceTierId
                setTierPreference(id)
                setAmountDollars(suggestedDollarsString(id))
              }}
              className="mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#CC0000] focus:outline-none"
            >
              {SPARTAN_RACE_TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.featured ? "★ " : ""}
                  {t.name} · {t.scheduleChip}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[10px] leading-relaxed text-[#666]">
              After checkout, NC United sends your details to Spartan — you&apos;ll get email to finish registration on
              Spartan.com (no extra hoops before you pay here).
            </p>
            <a
              href={FAYETTEVILLE_SPARTAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[11px] font-medium text-[#C8A94A] underline-offset-2 hover:underline"
            >
              Fayetteville venue &amp; distances (reference) →
            </a>
          </div>
        </div>
      )}

      {stepUnlocked && (
        <>
          <div className="mt-6 space-y-3 rounded-lg border border-[#2a3d4f] border-l-4 border-l-[#5a8ab0] bg-[#0c1014] p-3 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8ab4d8]">
              1 · Name on receipt
            </p>
            <p className="text-xs leading-snug text-[#9ca3af]">
              Individual <strong className="font-medium text-[#c5d4e0]">or</strong> company / foundation — whoever is on the
              card or should appear on the tax receipt. Not the wrestler (that&apos;s step 2).
            </p>
            <div>
              <label htmlFor="spartan-donor-name" className="text-sm font-medium text-[#ccc]">
                Full name or organization
              </label>
              <input
                id="spartan-donor-name"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                placeholder="e.g. Jane Doe — or Acme Industries, LLC / Your Town Rotary"
                aria-label="Full name or organization on receipt — not the wrestler you sponsor"
                value={donorName}
                onChange={(e) => {
                  setDonorName(e.target.value)
                  dismissHighlight("spartan-donor-name")
                }}
                aria-invalid={fieldHighlights.includes("spartan-donor-name")}
                className={`mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white placeholder:text-[#555] focus:border-[#5a8ab0] focus:outline-none focus:ring-1 focus:ring-[#5a8ab0] ${ringInvalid("spartan-donor-name")}`}
              />
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-[#ccc]">
                <input
                  type="checkbox"
                  checked={receiptIsOrganization}
                  onChange={(e) => setReceiptIsOrganization(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border border-[#555] accent-[#5a8ab0]"
                />
                <span>
                  Receipt is for a <strong className="text-[#e5e5e5]">company or organization</strong> (hall of fame —
                  companies — when your name is public).
                </span>
              </label>
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
                onChange={(e) => {
                  setEmail(e.target.value)
                  dismissHighlight("spartan-donor-email")
                }}
                aria-invalid={fieldHighlights.includes("spartan-donor-email")}
                className={`mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#5a8ab0] focus:outline-none focus:ring-1 focus:ring-[#5a8ab0] ${ringInvalid("spartan-donor-email")}`}
              />
            </div>
            <div>
              <label htmlFor="spartan-donor-contact" className="text-sm font-medium text-[#ccc]">
                Contact name <span className="font-normal text-[#666]">(optional)</span>
              </label>
              <p className="mt-0.5 text-[11px] text-[#666]">If the receipt is a company, who we should thank or follow up with.</p>
              <input
                id="spartan-donor-contact"
                type="text"
                autoComplete="name"
                value={payerContactName}
                onChange={(e) => setPayerContactName(e.target.value)}
                className="mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#5a8ab0] focus:outline-none focus:ring-1 focus:ring-[#5a8ab0]"
              />
            </div>
            {flow === "race" && (
              <div>
                <label htmlFor="spartan-race-runner" className="text-sm font-medium text-[#ccc]">
                  Runner / race participant <span className="font-normal text-[#666]">(optional)</span>
                </label>
                <p className="mt-0.5 text-[11px] leading-snug text-[#888]">
                  Only if someone else is running (e.g. you pay, your kid runs). Receipt still uses your name above.
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
              <div className="border-t border-[#2a3d4f] pt-4">
                <label htmlFor="spartan-supporter-list" className="text-sm font-medium text-[#ccc]">
                  Supporter page
                </label>
                <p className="mt-0.5 text-[11px] text-[#666]">Optional — how you appear on public activity</p>
                <select
                  id="spartan-supporter-list"
                  value={donorListPublic ? "show" : "anon"}
                  onChange={(e) => setDonorListPublic(e.target.value === "show")}
                  className="mt-1.5 min-h-[44px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2 text-base text-white focus:border-[#5a8ab0] focus:outline-none"
                >
                  <option value="show">Show my name</option>
                  <option value="anon">Anonymous</option>
                </select>
              </div>
            )}
          </div>

          {needsAthleteCode && (
            <>
              <div className="relative mt-5 rounded-lg border border-[#4a3d1a] border-l-4 border-l-[#C8A94A] bg-[#141008] p-3 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C8A94A]">2 · Wrestler credit</p>
                <p className="mt-1 text-xs leading-snug text-[#b9a86e]">
                  Who gets training credit — search and tap them (parent pays → child&apos;s name here).
                </p>
                <label className="mt-3 block text-sm font-medium text-[#ddd]" htmlFor="spartan-athlete-search">
                  Search wrestler
                </label>
                <p className="mt-0.5 text-[11px] leading-snug text-[#888]">One wrestler per checkout.</p>
                <input
                  id="spartan-athlete-search"
                  type="text"
                  placeholder="Type last name…"
                  value={athleteQuery}
                  onChange={(e) => {
                    setAthleteQuery(e.target.value)
                    setAthleteMenuOpen(true)
                    dismissHighlight("spartan-athlete-search")
                  }}
                  onFocus={() => athleteHits.length > 0 && setAthleteMenuOpen(true)}
                  aria-invalid={fieldHighlights.includes("spartan-athlete-search")}
                  className={`mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A] ${ringInvalid("spartan-athlete-search")}`}
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
                    . You can still sponsor or use the box below, or switch to the NC United Training Fund.
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
                            dismissHighlight("spartan-athlete-search")
                            dismissHighlight("spartan-manual-credit")
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
                    <strong className="text-[#C8A94A]">Not in the list?</strong> Type the athlete&apos;s name for staff (not
                    the payer&apos;s name).
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
                      dismissHighlight("spartan-manual-credit")
                    }}
                    aria-invalid={fieldHighlights.includes("spartan-manual-credit")}
                    className={`mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none ${ringInvalid("spartan-manual-credit")}`}
                  />
                  <p className="mt-2 text-[11px] text-[#666]">
                    Or the{" "}
                    <button
                      type="button"
                      className="font-medium text-[#C8A94A] underline underline-offset-2 hover:text-[#dfd08a]"
                      onClick={selectDonatingFund}
                    >
                      NC United Training Fund
                    </button>{" "}
                    (no named wrestler).
                  </p>
                </div>
              </div>
            </>
          )}

          {flow === "donate" && donateMode === "general" && (
            <p className="mt-5 rounded border border-[#333] bg-[#0A0A0A] px-3 py-2 text-center text-sm font-semibold text-[#C8A94A]">
              NC United Training Fund
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
              {flow === "race" ? (
                <>
                  Gift amount{" "}
                  <span className="font-normal text-[#666]">($5 min · recommended for your distance is pre-filled — edit anytime)</span>
                </>
              ) : (
                <>
                  Amount <span className="font-normal text-[#666]">($5 minimum — any amount)</span>
                </>
              )}
            </label>
            <div
              className={`mt-1 flex overflow-hidden rounded border border-[#444] bg-[#0A0A0A] focus-within:border-[#CC0000] ${
                fieldHighlights.includes("spartan-amount-usd")
                  ? "ring-2 ring-amber-500/90 ring-offset-2 ring-offset-[#0a0a0a]"
                  : ""
              }`}
            >
              <span className="flex items-center border-r border-[#444] bg-[#1a1a1a] px-2.5 text-[#888]">$</span>
              <input
                id="spartan-amount-usd"
                type="number"
                min={5}
                step={1}
                required
                value={amountDollars}
                onChange={(e) => {
                  setAmountDollars(e.target.value)
                  dismissHighlight("spartan-amount-usd")
                }}
                aria-invalid={fieldHighlights.includes("spartan-amount-usd")}
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
          <label htmlFor="spartan-c-tee-size" className="sr-only">
            Shirt size
          </label>
          <select
            id="spartan-c-tee-size"
            required={teeEligible}
            value={shirtSize}
            onChange={(e) => {
              setShirtSize(e.target.value)
              dismissHighlight("spartan-c-tee-size")
            }}
            aria-invalid={fieldHighlights.includes("spartan-c-tee-size")}
            className={`min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white focus:border-[#C8A94A] focus:outline-none ${ringInvalid("spartan-c-tee-size")}`}
          >
            <option value="">Size</option>
            {TEE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            id="spartan-c-ship-line1"
            type="text"
            placeholder="Street"
            value={shipLine1}
            onChange={(e) => {
              setShipLine1(e.target.value)
              dismissHighlight("spartan-c-ship-line1")
            }}
            aria-invalid={fieldHighlights.includes("spartan-c-ship-line1")}
            className={`min-h-[44px] w-full border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white placeholder:text-[#555] focus:border-[#C8A94A] focus:outline-none ${ringInvalid("spartan-c-ship-line1")}`}
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
              id="spartan-c-ship-city"
              type="text"
              placeholder="City"
              value={shipCity}
              onChange={(e) => {
                setShipCity(e.target.value)
                dismissHighlight("spartan-c-ship-city")
              }}
              aria-invalid={fieldHighlights.includes("spartan-c-ship-city")}
              className={`min-h-[44px] border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white placeholder:text-[#555] ${ringInvalid("spartan-c-ship-city")}`}
              autoComplete="address-level2"
            />
            <input
              id="spartan-c-ship-state"
              type="text"
              placeholder="ST"
              value={shipState}
              onChange={(e) => {
                setShipState(e.target.value)
                dismissHighlight("spartan-c-ship-state")
              }}
              aria-invalid={fieldHighlights.includes("spartan-c-ship-state")}
              className={`min-h-[44px] border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white placeholder:text-[#555] ${ringInvalid("spartan-c-ship-state")}`}
              autoComplete="address-level1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              id="spartan-c-ship-postal"
              type="text"
              placeholder="ZIP"
              value={shipPostal}
              onChange={(e) => {
                setShipPostal(e.target.value)
                dismissHighlight("spartan-c-ship-postal")
              }}
              aria-invalid={fieldHighlights.includes("spartan-c-ship-postal")}
              className={`min-h-[44px] border border-[#444] bg-[#0A0A0A] px-2 py-2.5 text-base text-white placeholder:text-[#555] ${ringInvalid("spartan-c-ship-postal")}`}
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

      {stepUnlocked && flow === "donate" && (
        <div className="mt-5 rounded border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-3 text-[12px] leading-snug text-[#9ca3af]">
          <p>
            {donateMode === "general"
              ? "Charitable contribution to NC United Wrestling for the NC United Training Fund pool — IRC-aligned acknowledgement; deductibility varies by donor (ask your advisor)."
              : "Charitable contribution to NC United Wrestling for the NC United Training Fund with wrestler notation as selected — support only through nonprofit checkout (not Spartan retail)."}{" "}
          </p>
          {donateMode === "athlete" && codeForCheckout && athleteQuery.trim() && (
            <p className="mt-1.5 font-medium text-[#ccc]">Training Fund notation: {athleteQuery}</p>
          )}
          {donateMode === "athlete" && !codeForCheckout && hasManualCredit && (
            <p className="mt-1.5 font-medium text-[#ccc]">Training Fund notation (manual): {manualCreditTrimmed}</p>
          )}
          <p className="mt-2 text-[11px] text-[#666]">
            Stripe emails acknowledgement after payment. Whether you deduct is between you and your tax advisor — not tax advice here.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !canCheckout}
        className="mt-5 w-full min-h-[48px] bg-[#CC0000] font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-wide text-white hover:bg-[#990000] disabled:opacity-50"
      >
        {loading ? "…" : "Continue to payment"}
      </button>
      {stepUnlocked && needsAthleteCode && !hasAthleteCredit && (
        <p className="mt-2 text-center text-[11px] text-[#888]">
          Select a wrestler from search or use the manual name box.
        </p>
      )}
      {!stepUnlocked && flow === null && (
        <p className="mt-2 text-center text-[11px] text-[#666]">Pick Racing, Sponsoring, or Donating above.</p>
      )}
      {!stepUnlocked && flow === "donate" && donateMode === null && (
        <p className="mt-2 text-center text-[11px] text-[#666]">Choose a wrestler or the NC United Training Fund.</p>
      )}
    </form>
  )
}
