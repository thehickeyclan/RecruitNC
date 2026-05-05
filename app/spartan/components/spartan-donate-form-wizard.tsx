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

/** Read-only “journey” for checkout recap — vertical step rail (mobile-first spacing & type) */
function ProgressJourneyTimeline({ items }: { items: { id: string; kicker: string; text: string }[] }) {
  if (items.length === 0) return null
  return (
    <ol className="m-0 list-none p-0 antialiased" aria-label="Progress so far">
      {items.map((m, i) => (
        <li key={m.id} className="flex gap-3.5 sm:gap-3">
          <div className="flex w-7 shrink-0 flex-col items-center sm:w-8">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#3d3518] bg-gradient-to-b from-[#d4b85c] to-[#C8A94A] text-xs font-bold text-[#0a0a0a] shadow-sm shadow-black/20 sm:h-6 sm:w-6 sm:text-[11px]"
              aria-hidden
            >
              ✓
            </span>
            {i < items.length - 1 && (
              <span
                className="my-0.5 h-3.5 w-px flex-none bg-gradient-to-b from-[#C8A94A]/45 via-[#404040] to-[#2a2a2a] sm:my-0.5 sm:h-4"
                aria-hidden
              />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-4 last:pb-1 sm:pb-4 sm:last:pb-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b6b6b] sm:text-[10px] sm:tracking-[0.16em]">
              {m.kicker}
            </p>
            <p className="mt-1 text-[15px] font-medium leading-snug tracking-tight text-white sm:mt-0.5 sm:text-sm sm:font-normal sm:text-[#ececec]">
              {m.text}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

const VALID_TIER_PARAMS = new Set<string>(["sprint", "super", "beast", "ultra", "kids", "other"])

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

const DONATE_STEPS = 6
const RACE_STEPS = 8

const ATHLETE_CODE_RE = /^NCU-([A-Za-z0-9]+)-(\d{2})$/i

function scrollToCheckout() {
  if (typeof document === "undefined") return
  requestAnimationFrame(() => {
    document.getElementById("spartan-checkout")?.scrollIntoView({ behavior: "smooth", block: "start" })
  })
}

export function SpartanDonateFormWizard({
  fundraisingHub = false,
  fundraisingHubPrefillCode = null,
  fundraisingHubPrefillLabel = null,
  fundraisingHubReturnSlug = null,
}: {
  fundraisingHub?: boolean
  /** On athlete fundraising pages: skip wrestler search and start at amount step */
  fundraisingHubPrefillCode?: string | null
  fundraisingHubPrefillLabel?: string | null
  /** Slug for Stripe return URLs (thanks/cancel on this athlete page) */
  fundraisingHubReturnSlug?: string | null
}) {
  const searchParams = useSearchParams()
  const fh = Boolean(fundraisingHub)

  const [email, setEmail] = useState("")
  const [donorName, setDonorName] = useState("")
  /** Optional: person at the org (thank-yous) when receipt is a business name */
  const [payerContactName, setPayerContactName] = useState("")
  /** Stripe metadata payer_type — drives company vs individual hall of fame */
  const [receiptIsOrganization, setReceiptIsOrganization] = useState(false)
  const [donorListPublic, setDonorListPublic] = useState(true)
  const [fundraisingCode, setFundraisingCode] = useState("")

  const [flow, setFlow] = useState<"race" | "donate" | null>(null)
  const [donateMode, setDonateMode] = useState<"athlete" | "general" | null>(null)
  const [donateStep, setDonateStep] = useState(1)
  const [raceStep, setRaceStep] = useState(1)

  /** I'm running vs family/friend */
  const [raceFor, setRaceFor] = useState<"self" | "other" | null>(null)
  const [racerNameForRace, setRacerNameForRace] = useState("")
  const [raceRegEmail, setRaceRegEmail] = useState("")

  const [tierPreference, setTierPreference] = useState<SpartanRaceTierId | "">("")
  const [amountDollars, setAmountDollars] = useState("50")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Input ids to ring when Next/submit validation fails */
  const [fieldHighlights, setFieldHighlights] = useState<string[]>([])

  const [athleteQuery, setAthleteQuery] = useState("")
  const [athleteHits, setAthleteHits] = useState<{ code: string; label: string }[]>([])
  const [athleteMenuOpen, setAthleteMenuOpen] = useState(false)
  const [athleteSearchLoading, setAthleteSearchLoading] = useState(false)
  const [athleteLookupError, setAthleteLookupError] = useState(false)
  const [manualCreditName, setManualCreditName] = useState("")

  const [shirtSize, setShirtSize] = useState("")
  const [shipLine1, setShipLine1] = useState("")
  const [shipLine2, setShipLine2] = useState("")
  const [shipCity, setShipCity] = useState("")
  const [shipState, setShipState] = useState("")
  const [shipPostal, setShipPostal] = useState("")
  const [shipCountry, setShipCountry] = useState("US")

  useEffect(() => {
    setFieldHighlights([])
  }, [flow, donateStep, raceStep])

  const needsAthleteCode = flow === "race" || (flow === "donate" && donateMode === "athlete")

  useEffect(() => {
    const mission = searchParams.get("mission") === "1"
    if (mission) {
      setFlow("donate")
      const mode = searchParams.get("mode")?.toLowerCase()
      if (mode === "fund" || mode === "ncunited") {
        setDonateMode("general")
        setDonateStep(3)
      } else {
        setDonateMode("athlete")
        setDonateStep(2)
      }
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
      setRaceStep(1)
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
      setRaceStep(1)
    } else {
      setFlow("donate")
      setDonateMode("athlete")
      setDonateStep(2)
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get("mission") === "1") return
    if (tierFromSearchParams(searchParams)) return
    if (searchParams.get("athlete")?.trim()) return

    const flowParam = searchParams.get("flow")?.toLowerCase() ?? ""
    if (flowParam === "race") {
      setFlow("race")
      setDonateMode(null)
      setRaceStep(1)
      setTierPreference(DEFAULT_SPARTAN_RACE_TIER_ID)
      setAmountDollars(suggestedDollarsString(DEFAULT_SPARTAN_RACE_TIER_ID))
      return
    }
    if (flowParam === "sponsor") {
      setFlow("donate")
      setTierPreference("")
      setDonateMode("athlete")
      setDonateStep(2)
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
      setDonateStep(3)
      setAmountDollars("50")
      return
    }
    if (flowParam === "donate") {
      setFlow("donate")
      setTierPreference("")
      setDonateMode("athlete")
      setDonateStep(1)
      setAmountDollars("50")
      return
    }
    if (fundraisingHub) {
      const preCode = (fundraisingHubPrefillCode ?? "").trim()
      const preLabel = (fundraisingHubPrefillLabel ?? "").trim()
      if (preCode && ATHLETE_CODE_RE.test(preCode)) {
        setFlow("donate")
        setTierPreference("")
        setDonateMode("athlete")
        setFundraisingCode(preCode.toUpperCase())
        setAthleteQuery(preLabel)
        setManualCreditName("")
        setDonateStep(3)
        setAmountDollars("50")
        return
      }
      setFlow("donate")
      setTierPreference("")
      setDonateMode("athlete")
      setDonateStep(1)
      setAmountDollars("50")
    }
  }, [searchParams, fundraisingHub, fundraisingHubPrefillCode, fundraisingHubPrefillLabel])

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
    const code = fundraisingCode.trim()
    if (!code || athleteQuery.trim()) return
    const m = ATHLETE_CODE_RE.exec(code.trim())
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

  /** Don’t show the recap until past the first “pick path / pick mode” screen — defaults in state are not “choices” yet. */
  const showProgressRecap =
    flow &&
    !((flow === "donate" && donateStep === 1) || (flow === "race" && raceStep === 1))

  const progressMilestones = useMemo(() => {
    const items: { id: string; kicker: string; text: string }[] = []
    if (!flow) return items
    if (flow === "race") {
      items.push({ id: "path", kicker: "Path", text: "Race + wrestler credit" })
      if (raceFor) {
        items.push({
          id: "runner",
          kicker: "Who’s racing",
          text:
            raceFor === "self"
              ? "You’re the Spartan race runner (you on the course)"
              : "Someone else is the race runner",
        })
      }
      if (raceStep >= 4 && hasAthleteCredit) {
        items.push({
          id: "wrestler",
          kicker: "Wrestler",
          text: (athleteQuery.trim() || manualCreditTrimmed) || "—",
        })
      }
      if (raceStep >= 6 && tierPreference) {
        items.push({
          id: "distance",
          kicker: "Distance",
          text: SPARTAN_RACE_TIERS.find((t) => t.id === tierPreference)?.name ?? tierPreference,
        })
      }
      if (raceStep >= 7 && amountCents >= 500) {
        items.push({ id: "amount", kicker: "Your gift", text: formatUsd(amountCents) })
      }
      if (raceStep >= 7 && teeEligible && Boolean(shirtSize)) {
        items.push({ id: "tee", kicker: "Team tee", text: `Size ${shirtSize}` })
      }
    } else {
      items.push({ id: "path", kicker: "Path", text: "Donation" })
      if (donateMode === "athlete" && donateStep >= 2 && (codeForCheckout || hasManualCredit)) {
        items.push({
          id: "wrestler",
          kicker: "Wrestler",
          text:
            codeForCheckout && athleteQuery.trim()
              ? athleteQuery.trim()
              : hasManualCredit
                ? manualCreditTrimmed
                : "—",
        })
      }
      if (donateMode === "general" && donateStep >= 3) {
        items.push({ id: "fund", kicker: "Where it goes", text: "NC United Training Fund" })
      }
      if (donateStep >= 4 && amountCents >= 500) {
        items.push({ id: "amount", kicker: "Your gift", text: formatUsd(amountCents) })
      }
      if (donateStep >= 5 && teeEligible && Boolean(shirtSize)) {
        items.push({ id: "tee", kicker: "Tee", text: `Size ${shirtSize}` })
      }
    }
    return items
  }, [
    flow,
    raceFor,
    raceStep,
    donateMode,
    donateStep,
    hasAthleteCredit,
    athleteQuery,
    manualCreditTrimmed,
    codeForCheckout,
    hasManualCredit,
    tierPreference,
    amountCents,
    teeEligible,
    shirtSize,
  ])

  function goToDonate() {
    setFlow("donate")
    setRaceFor(null)
    setRaceStep(1)
    setRacerNameForRace("")
    setTierPreference("")
    setDonateMode(null)
    setDonateStep(1)
    setManualCreditName("")
    setError(null)
    scrollToCheckout()
  }

  function goToDonateGeneralFund() {
    setFlow("donate")
    setDonateMode("general")
    setDonateStep(3)
    setFundraisingCode("")
    setAthleteQuery("")
    setManualCreditName("")
    setAthleteHits([])
    setAthleteMenuOpen(false)
    setError(null)
    scrollToCheckout()
  }

  function goToRace() {
    setFlow("race")
    setDonateMode(null)
    setDonateStep(1)
    setRaceStep(1)
    setRaceFor(null)
    setRacerNameForRace("")
    setManualCreditName("")
    const fromUrl = searchParams.get("athlete")?.trim()
    if (!fromUrl) {
      setFundraisingCode("")
      setAthleteQuery("")
    }
    const next = DEFAULT_SPARTAN_RACE_TIER_ID
    setTierPreference(next)
    setAmountDollars(suggestedDollarsString(next))
    setError(null)
    scrollToCheckout()
  }

  /** race_participant for API */
  function resolvedRaceParticipantName(): string {
    if (flow !== "race") return ""
    if (raceFor === "other") return racerNameForRace.trim()
    if (raceFor === "self") return donorName.trim()
    return ""
  }

  function validateDonateNext(fromStep: number): FieldValidation {
    if (fromStep === 1 && !donateMode) {
      return { error: "Choose an option to continue.", fields: ["spartan-donate-step1"] }
    }
    if (fromStep === 2 && donateMode === "athlete" && !hasAthleteCredit) {
      return {
        error: "Select a wrestler or enter a name in the manual box.",
        fields: ["spartan-athlete-search", "spartan-manual-credit"],
      }
    }
    if (fromStep === 3) {
      if (!amountDollars.trim() || amountCents < 500) {
        return { error: "Minimum $5.", fields: ["spartan-amount-usd-d"] }
      }
    }
    if (fromStep === 4) {
      if (donorName.trim().length < 2) {
        return { error: "Enter the name for the receipt.", fields: ["spartan-donor-name-d"] }
      }
      if (!email.trim() || !emailOk(email)) {
        return { error: "Enter a valid email.", fields: ["spartan-donor-email-d"] }
      }
    }
    if (fromStep === 5 && teeEligible) {
      if (!shirtSize) return { error: "Choose a shirt size.", fields: ["spartan-tee-size"] }
      const miss: string[] = []
      if (!shipLine1.trim()) miss.push("spartan-ship-line1")
      if (!shipCity.trim()) miss.push("spartan-ship-city")
      if (!shipState.trim()) miss.push("spartan-ship-state")
      if (!shipPostal.trim()) miss.push("spartan-ship-postal")
      if (miss.length) {
        return { error: "Enter a full shipping address.", fields: miss }
      }
    }
    return { error: null, fields: [] }
  }

  /**
   * Step numbers must match UI: 1 payer · 2 runner? · 3 runner email · 4 wrestler credit ·
   * 5 distance · 6 amount · 7 tee+ship · 8 review. (The tee must not be validated before step 7.)
   */
  function validateRaceNext(fromStep: number): FieldValidation {
    if (fromStep === 1) {
      if (donorName.trim().length < 2) {
        return { error: "Enter your name (or the payer name for the receipt).", fields: ["spartan-race-donor-name"] }
      }
      if (!email.trim() || !emailOk(email)) {
        return { error: "Enter a valid email.", fields: ["spartan-race-donor-email"] }
      }
    }
    if (fromStep === 2 && !raceFor) {
      return { error: "Select who is running.", fields: ["spartan-race-who-runs"] }
    }
    if (fromStep === 3) {
      if (raceFor === "other") {
        if (racerNameForRace.trim().length < 2) {
          return { error: "Enter the runner's name.", fields: ["spartan-racer-name"] }
        }
        const reg = raceRegEmail.trim() || email.trim()
        if (!emailOk(reg)) {
          return { error: "Enter an email for Spartan race registration and codes.", fields: ["spartan-race-spartan-email"] }
        }
      } else {
        const reg = raceRegEmail.trim() || email.trim()
        if (!emailOk(reg)) {
          return { error: "Enter an email for Spartan race registration and codes.", fields: ["spartan-race-spartan-email"] }
        }
      }
    }
    if (fromStep === 4 && !hasAthleteCredit) {
      return {
        error: "Select a wrestler or enter a name in the manual box.",
        fields: ["spartan-race-athlete-search", "spartan-race-manual"],
      }
    }
    if (fromStep === 6) {
      if (!amountDollars.trim() || amountCents < 500) {
        return { error: "Minimum $5.", fields: ["spartan-amount-usd-r"] }
      }
    }
    if (fromStep === 7 && teeEligible) {
      if (!shirtSize) return { error: "Choose a shirt size for your team tee.", fields: ["spartan-tee-size"] }
      const miss: string[] = []
      if (!shipLine1.trim()) miss.push("spartan-ship-line1")
      if (!shipCity.trim()) miss.push("spartan-ship-city")
      if (!shipState.trim()) miss.push("spartan-ship-state")
      if (!shipPostal.trim()) miss.push("spartan-ship-postal")
      if (miss.length) {
        return { error: "Enter a full shipping address for your team tee.", fields: miss }
      }
    }
    return { error: null, fields: [] }
  }

  function donateNext() {
    setError(null)
    const v = validateDonateNext(donateStep)
    if (v.error) {
      setError(v.error)
      setFieldHighlights(v.fields)
      if (v.fields[0]) scrollToFieldId(v.fields[0])
      return
    }
    setFieldHighlights([])
    if (donateStep === 2) setDonateStep(3)
    else if (donateStep === 3) setDonateStep(4)
    else if (donateStep === 4) {
      if (teeEligible) setDonateStep(5)
      else setDonateStep(6)
    } else if (donateStep === 5) setDonateStep(6)
  }

  function donateBack() {
    setError(null)
    if (donateStep <= 1) return
    if (donateStep === 3 && donateMode === "general") {
      setDonateStep(1)
      return
    }
    if (donateStep === 3 && donateMode === "athlete") {
      setDonateStep(2)
      return
    }
    if (donateStep === 4) setDonateStep(3)
    else if (donateStep === 5) setDonateStep(4)
    else if (donateStep === 6) {
      if (teeEligible) setDonateStep(5)
      else setDonateStep(4)
    }
  }

  function raceNext() {
    setError(null)
    const v = validateRaceNext(raceStep)
    if (v.error) {
      setError(v.error)
      setFieldHighlights(v.fields)
      if (v.fields[0]) scrollToFieldId(v.fields[0])
      return
    }
    setFieldHighlights([])
    if (raceStep < RACE_STEPS) setRaceStep((s) => s + 1)
  }

  function raceBack() {
    setError(null)
    if (raceStep <= 1) return
    setRaceStep((s) => s - 1)
  }

  useEffect(() => {
    if (flow === "race" && raceStep === 3) {
      if (raceFor === "self" && !raceRegEmail.trim()) setRaceRegEmail(email.trim())
      if (raceFor === "self" && !racerNameForRace) setRacerNameForRace(donorName.trim())
    }
  }, [flow, raceStep, raceFor, email, donorName, racerNameForRace, raceRegEmail])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const name = donorName.trim()
    if (name.length < 2) {
      setError("Enter the name for the tax receipt (individual or organization).")
      return
    }
    if (flow === null) {
      setError("Choose Race or Donate to continue.")
      return
    }
    if (flow === "donate" && donateMode === null) {
      setError("Complete the steps above — choose who this gift supports.")
      return
    }
    if (flow === "donate" && donateStep < 6) {
      setError("Use Next until the review step, or fix any error shown above.")
      return
    }
    if (flow === "race" && raceStep < RACE_STEPS) {
      setError("Use Next until the review step.")
      return
    }
    if (needsAthleteCode && !hasAthleteCredit) {
      setError("Select a wrestler or enter a manual name.")
      return
    }
    if (!amountDollars.trim() || amountCents < 500) {
      setError("Minimum $5.")
      return
    }
    if (flow === "race" && !raceFor) {
      setError("Indicate who is running the race.")
      return
    }
    if (teeEligible) {
      if (!shirtSize) {
        setError(flow === "race" ? "Shirt size required for your NC United tee." : "Shirt size required for $100+ gifts.")
        return
      }
      if (!shipLine1.trim() || !shipCity.trim() || !shipState.trim() || !shipPostal.trim()) {
        setError("Shipping address required for the tee.")
        return
      }
    }

    const raceParticipant = resolvedRaceParticipantName()
    const regForStripe =
      flow === "race" ? (raceRegEmail.trim() || email.trim()) : undefined

    setLoading(true)
    try {
      const res = await fetch("/api/spartan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          donorName: name,
          ...(payerContactName.trim() ? { payerContactName: payerContactName.trim().slice(0, 120) } : {}),
          donorListPublic: flow === "donate" ? donorListPublic : true,
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
          ...(flow === "race" && raceParticipant ? { raceParticipantName: raceParticipant } : {}),
          ...(flow === "race" && regForStripe ? { raceRegistrationEmail: regForStripe } : {}),
          ...(receiptIsOrganization ? { payerType: "organization" } : {}),
          ...(fundraisingHub ? { fundraisingHub: true as const } : {}),
          ...(fundraisingHub && fundraisingHubReturnSlug?.trim()
            ? { fundraisingHubReturnSlug: fundraisingHubReturnSlug.trim().toLowerCase() }
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

  const tierOrDefault = (tierPreference || DEFAULT_SPARTAN_RACE_TIER_ID) as SpartanRaceTierId
  const canSubmitReview =
    flow === "donate"
      ? donateMode !== null && (donateMode === "general" || hasAthleteCredit) && donateStep === 6
      : flow === "race" && raceFor !== null && raceStep === RACE_STEPS

  const ringOff = fh ? "ring-offset-[#061224]" : "ring-offset-[#0a0a0a]"
  const dField = fh ? "border-white/20 bg-[#061224]" : "border-[#444] bg-[#0A0A0A]"
  const dPh = fh ? "placeholder:text-white/40" : "placeholder:text-[#555]"
  const dFocus = fh ? "focus:border-[#C8A94A]" : "focus:border-[#5a8ab0]"

  const ringInvalid = (id: string) =>
    fieldHighlights.includes(id)
      ? `ring-2 ring-amber-500/90 ring-offset-2 ${ringOff} border-amber-500/50`
      : ""

  const dismissHighlight = (id: string) => setFieldHighlights((f) => f.filter((x) => x !== id))

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-6 max-w-lg px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-left sm:mt-8 sm:px-0"
    >
      {!fundraisingHub && (
        <div className="rounded-lg border border-[#333] bg-[#141414] p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#888]">Start here</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={goToRace}
                className={`min-h-[48px] rounded border px-3 py-3 text-center text-sm font-bold leading-tight transition-colors ${
                  flow === "race"
                    ? "border-[#CC0000] bg-[#2a1515] text-white"
                    : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
                }`}
              >
                Race
              </button>
              <p className="text-[10px] leading-snug text-[#777]">
                Spartan distance + <strong className="text-[#999]">credit a wrestler</strong>. You get registration follow-up{" "}
                <strong className="text-[#999]">after</strong> you pay.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={goToDonate}
                className={`min-h-[48px] rounded border px-3 py-3 text-center text-sm font-bold leading-tight transition-colors ${
                  flow === "donate"
                    ? "border-[#C8A94A] bg-[#1a170d] text-[#C8A94A]"
                    : "border-[#444] bg-[#0A0A0A] text-[#ccc] hover:border-[#666]"
                }`}
              >
                Donate
              </button>
              <p className="text-[10px] leading-snug text-[#777]">
                <strong className="text-[#999]">Named wrestler</strong> or <strong className="text-[#8ab4d8]">NC United Training Fund</strong> —{" "}
                <strong className="text-[#C8A94A]">$5 min</strong>
              </p>
            </div>
          </div>
          <p className="mt-3 rounded border border-[#C8A94A]/35 bg-[#1a170d] px-3 py-2.5 text-[11px] leading-snug text-[#bbb] sm:text-xs">
            <strong className="text-[#C8A94A]">Two kids?</strong> Finish once, then start again for the second credit.
          </p>
        </div>
      )}

      {showProgressRecap && progressMilestones.length > 0 && (
        <div
          className={
            fh
              ? "mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0B2545]/55 to-[#061224]/90 px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.35)] sm:rounded-xl sm:px-4 sm:py-3.5 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              : "mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#161616] to-[#0a0a0a] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.35)] sm:rounded-xl sm:px-4 sm:py-3.5 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          }
          role="status"
        >
          <div className="mb-3 border-b border-white/[0.06] pb-3 sm:mb-3 sm:pb-2.5 sm:border-[#252525]">
            <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-bold uppercase tracking-[0.18em] text-[#C8A94A] sm:text-[11px] sm:tracking-[0.2em]">
              Your progress
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#7a7a7a] sm:mt-0.5 sm:text-[11px] sm:text-[#6a6a6a]">
              <span className="sm:hidden">Tap </span>
              <span className="hidden sm:inline">Use </span>
              <span className="font-medium text-[#9a9a9a]">Back</span>
              <span className="sm:hidden"> to edit a previous step.</span>
              <span className="hidden sm:inline"> to change an earlier answer.</span>
            </p>
          </div>
          <ProgressJourneyTimeline items={progressMilestones} />
        </div>
      )}

      {flow === "donate" && (
        <div className="mt-3 flex justify-center sm:mt-2">
          <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium tabular-nums text-[#8a8a8a] sm:border-transparent sm:bg-transparent sm:px-0 sm:py-0 sm:font-normal sm:text-[#555]">
            Step {donateStep} of {DONATE_STEPS} · Donate
          </span>
        </div>
      )}
      {flow === "race" && (
        <div className="mt-3 flex justify-center sm:mt-2">
          <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium tabular-nums text-[#8a8a8a] sm:border-transparent sm:bg-transparent sm:px-0 sm:py-0 sm:font-normal sm:text-[#555]">
            Step {raceStep} of {RACE_STEPS} · Race
          </span>
        </div>
      )}

      {/* Donate: step 1 — who benefits */}
      {flow === "donate" && donateStep === 1 && (
        <div
          className={`mt-5 space-y-3 rounded border border-l-4 border-l-[#C8A94A] p-3 sm:p-4 ${fh ? "border-white/15 bg-[#0B2545]/45" : "border-[#4a3d1a] bg-[#141008]"}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C8A94A]">
            {fh ? "Support an athlete or the training fund" : "Who should this support?"}
          </p>
          <p className="text-xs text-[#9ca3af]">
            {fh
              ? "Choose how your gift should count — both options use the same secure checkout ($5 minimum)."
              : "Credit a wrestler, or the NC United Training Fund."}
          </p>
          <div
            id="spartan-donate-step1"
            className={`grid gap-2 rounded-md sm:grid-cols-2 ${fieldHighlights.includes("spartan-donate-step1") ? `p-0.5 ring-2 ring-amber-500/90 ring-offset-2 ${ringOff}` : ""}`}
          >
            <button
              type="button"
              onClick={() => {
                setDonateMode("athlete")
                setError(null)
                dismissHighlight("spartan-donate-step1")
                setDonateStep(2)
              }}
              className="min-h-[48px] rounded border border-[#C8A94A] bg-[#1a170d] px-3 text-sm font-bold text-[#C8A94A] hover:bg-[#252014]"
            >
              {fh ? "Support an athlete" : "A specific wrestler"}
            </button>
            <button
              type="button"
              onClick={() => {
                goToDonateGeneralFund()
              }}
              className={`min-h-[48px] rounded border px-2 py-2.5 text-[13px] font-bold leading-snug text-[#ccc] hover:border-[#666] sm:px-3 sm:text-sm ${dField}`}
            >
              {fh ? "Donate to the NC United Training Fund" : "NC United Training Fund"}
            </button>
          </div>
        </div>
      )}

      {/* Donate: step 2 — athlete search */}
      {flow === "donate" && donateStep === 2 && donateMode === "athlete" && (
        <div
          className={`relative mt-5 rounded-lg border border-l-4 border-l-[#C8A94A] p-3 sm:p-4 ${fh ? "border-white/15 bg-[#0B2545]/45" : "border-[#4a3d1a] bg-[#141008]"}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C8A94A]">Wrestler to credit</p>
          <p className="mt-1 text-xs leading-snug text-[#b9a86e]">Search and select — or type a name if they are not in the list.</p>
          <label className="mt-3 block text-sm font-medium text-[#ddd]" htmlFor="spartan-athlete-search">
            Search
          </label>
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
            className={`mt-1.5 min-h-[48px] w-full border px-3 py-2.5 text-base text-white ${dPh} focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A] ${dField} ${ringInvalid("spartan-athlete-search")}`}
            autoComplete="off"
          />
          {athleteSearchLoading && <p className="mt-1 text-[11px] text-[#666]">…</p>}
          {athleteLookupError && (
            <p className="mt-1 text-[11px] text-amber-200/80">Search unavailable — try again in a moment.</p>
          )}
          {showNoDirectoryMatch && (
            <p className="mt-1 text-[11px] text-[#888]">
              No match — try <HardLink href="/athletes" className="text-[#C8A94A] hover:underline">the directory</HardLink> or
              the manual box.
            </p>
          )}
          {athleteMenuOpen && athleteHits.length > 0 && (
            <ul className={`absolute z-20 mt-1 max-h-[min(50vh,16rem)] w-full overflow-auto rounded border py-1 shadow-lg ${fh ? "border-white/15 bg-[#061224]/98" : "border-[#444] bg-[#141414]"}`}>
              {athleteHits.map((h) => (
                <li key={h.code}>
                  <button
                    type="button"
                    className="min-h-[48px] w-full px-3 py-3 text-left text-base text-[#ddd] hover:bg-[#252525]"
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
          <div className="mt-5 border-t border-[#333] pt-4">
            <label className="mt-0 block text-sm font-medium text-[#bbb]" htmlFor="spartan-manual-credit">
              Not in the list? Athlete name (manual)
            </label>
            <input
              id="spartan-manual-credit"
              type="text"
              autoComplete="off"
              placeholder="e.g. First Last · school if helpful"
              value={manualCreditName}
              onChange={(e) => {
                const v = e.target.value
                setManualCreditName(v)
                if (v.trim().length > 0) setFundraisingCode("")
                dismissHighlight("spartan-manual-credit")
              }}
              aria-invalid={fieldHighlights.includes("spartan-manual-credit")}
              className={`mt-1.5 min-h-[48px] w-full border px-3 py-2.5 text-base text-white ${dPh} focus:border-[#C8A94A] focus:outline-none ${dField} ${ringInvalid("spartan-manual-credit")}`}
            />
            <p className="mt-2 text-[11px] text-[#666]">
              Or the{" "}
              <button
                type="button"
                className="font-medium text-[#C8A94A] underline underline-offset-2"
                onClick={goToDonateGeneralFund}
              >
                NC United Training Fund
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Donate: amount step */}
      {flow === "donate" && donateStep === 3 && (
        <div className="mt-6">
          {donateMode === "general" && (
            <p
              className={`mb-3 rounded border px-3 py-2 text-center text-sm font-semibold text-[#C8A94A] ${fh ? "border-white/15 bg-[#061224]/90" : "border-[#333] bg-[#0A0A0A]"}`}
            >
              NC United Training Fund
            </p>
          )}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {GIFT_QUICK_AMOUNTS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setAmountDollars(String(d))}
                className={`min-h-[44px] min-w-[3rem] rounded border px-2.5 text-sm font-semibold text-[#C8A94A] hover:border-[#C8A94A] ${dField}`}
              >
                ${d}
              </button>
            ))}
          </div>
          <label className="text-xs text-[#888]" htmlFor="spartan-amount-usd-d">
            Amount <span className="text-[#666]">($5 minimum)</span>
          </label>
          <div
            className={`mt-1 flex overflow-hidden rounded border focus-within:border-[#C8A94A] ${dField} ${
              fieldHighlights.includes("spartan-amount-usd-d") ? `ring-2 ring-amber-500/90 ring-offset-2 ${ringOff}` : ""
            }`}
          >
            <span
              className={`flex items-center border-r px-2.5 text-[#888] ${fh ? "border-white/15 bg-[#061224]/80" : "border-[#444] bg-[#1a1a1a]"}`}
            >
              $
            </span>
            <input
              id="spartan-amount-usd-d"
              type="number"
              min={5}
              step={1}
              required
              value={amountDollars}
              onChange={(e) => {
                setAmountDollars(e.target.value)
                dismissHighlight("spartan-amount-usd-d")
              }}
              aria-invalid={fieldHighlights.includes("spartan-amount-usd-d")}
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-lg font-bold tabular-nums text-white outline-none"
            />
          </div>
          <p className="mt-1.5 text-center text-[11px] text-[#666]">
            {formatUsd(amountCents)}
            {!teeEligible && amountCents > 0 && amountCents < TEE_THRESHOLD_CENTS && (
              <span className="text-[#555]"> · +{formatUsd(TEE_THRESHOLD_CENTS - amountCents)} to $100 unlocks a tee</span>
            )}
            {teeEligible && <span className="text-[#C8A94A]"> · Tee eligible</span>}
          </p>
        </div>
      )}

      {/* Donate: contact + public name */}
      {flow === "donate" && donateStep === 4 && (
        <div
          className={`mt-6 space-y-3 rounded-lg border border-l-4 p-3 sm:p-4 ${
            fh
              ? "border-white/12 border-l-[#C8A94A] bg-[#0B2545]/40"
              : "border-[#2a3d4f] border-l-[#5a8ab0] bg-[#0c1014]"
          }`}
        >
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${fh ? "text-[#C8A94A]" : "text-[#8ab4d8]"}`}
          >
            Receipt & visibility
          </p>
          <p className="text-xs text-[#9ca3af]">Name on the tax receipt. This is the payer, not the wrestler (unless the same person).</p>
          <div>
            <label htmlFor="spartan-donor-name-d" className="text-sm font-medium text-[#ccc]">
              Full name or organization
            </label>
            <input
              id="spartan-donor-name-d"
              type="text"
              required
              minLength={2}
              autoComplete="name"
              value={donorName}
              onChange={(e) => {
                setDonorName(e.target.value)
                dismissHighlight("spartan-donor-name-d")
              }}
              aria-invalid={fieldHighlights.includes("spartan-donor-name-d")}
              className={`mt-1.5 min-h-[48px] w-full border px-3 py-2.5 text-base text-white focus:outline-none ${dField} ${dFocus} ${ringInvalid("spartan-donor-name-d")}`}
            />
            <p className="mt-1.5 text-[11px] text-[#666]">Individual or org — as it should read on the receipt.</p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[#ccc]">
              <input
                type="checkbox"
                checked={receiptIsOrganization}
                onChange={(e) => setReceiptIsOrganization(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border border-[#555] accent-[#C8A94A]"
              />
              <span>
                Receipt is for a <strong className="text-[#e5e5e5]">company or organization</strong> (hall of fame lists
                you under companies when your name is public).
              </span>
            </label>
          </div>
          <div>
            <label htmlFor="spartan-donor-email-d" className="text-sm font-medium text-[#ccc]">
              Email
            </label>
            <input
              id="spartan-donor-email-d"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                dismissHighlight("spartan-donor-email-d")
              }}
              aria-invalid={fieldHighlights.includes("spartan-donor-email-d")}
              className={`mt-1.5 min-h-[48px] w-full border px-3 py-2.5 text-base text-white focus:outline-none ${dField} ${dFocus} ${ringInvalid("spartan-donor-email-d")}`}
            />
          </div>
          <div>
            <label htmlFor="spartan-donor-contact-d" className="text-sm font-medium text-[#ccc]">
              Contact name <span className="font-normal text-[#666]">(optional)</span>
            </label>
            <p className="mt-0.5 text-[11px] text-[#666]">If the receipt is a company, who we should thank or follow up with.</p>
            <input
              id="spartan-donor-contact-d"
              type="text"
              autoComplete="name"
              value={payerContactName}
              onChange={(e) => setPayerContactName(e.target.value)}
              className={`mt-1.5 min-h-[48px] w-full border px-3 py-2.5 text-base text-white focus:outline-none ${dField} ${dFocus}`}
            />
          </div>
          <div>
            <label htmlFor="spartan-supporter-list-d" className="text-sm font-medium text-[#ccc]">
              Public supporter list
            </label>
            <p className="mt-0.5 text-[11px] text-[#666]">
              On {fh ? "the public fundraising hub" : "/spartan activity"}, show your name or hide it
            </p>
            <select
              id="spartan-supporter-list-d"
              value={donorListPublic ? "show" : "anon"}
              onChange={(e) => setDonorListPublic(e.target.value === "show")}
              className={`mt-1.5 min-h-[44px] w-full border px-3 py-2 text-base text-white focus:outline-none ${dField} ${dFocus}`}
            >
              <option value="show">Show my name</option>
              <option value="anon">Anonymous on the public list</option>
            </select>
          </div>
        </div>
      )}

      {/* Donate: tee */}
      {flow === "donate" && donateStep === 5 && teeEligible && (
        <div
          className={`mt-5 rounded border border-[#C8A94A]/35 px-3 py-3 ${fh ? "bg-[#0B2545]/45" : "bg-[#141414]"}`}
        >
          <p className="text-xs font-medium text-[#C8A94A]">Free tee — size & ship ($100+ gifts)</p>
          <TeeBlock
            shirtSize={shirtSize}
            setShirtSize={setShirtSize}
            shipLine1={shipLine1}
            setShipLine1={setShipLine1}
            shipLine2={shipLine2}
            setShipLine2={setShipLine2}
            shipCity={shipCity}
            setShipCity={setShipCity}
            shipState={shipState}
            setShipState={setShipState}
            shipPostal={shipPostal}
            setShipPostal={setShipPostal}
            shipCountry={shipCountry}
            setShipCountry={setShipCountry}
            fieldHighlights={fieldHighlights}
            onClearHighlight={dismissHighlight}
            ringOffsetClass={ringOff}
            fieldSurfaceClass={dField}
            fieldPhClass={dPh}
            imageFrameClass={fh ? "border border-white/15 bg-[#061224]/35" : undefined}
          />
        </div>
      )}

      {/* Donate: review */}
      {flow === "donate" && donateStep === 6 && (
        <div
          className={`mt-6 rounded border p-3 sm:p-4 ${fh ? "border-white/12 bg-[#061224]/85" : "border-[#333] bg-[#0c0c0c]"}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#888]">Review</p>
          <ul className="mt-2 space-y-1.5 text-sm text-[#ccc]">
            <li>
              <span className="text-[#666]">Type:</span> {donateMode === "general" ? "NC United Training Fund" : "Wrestler credit"}
            </li>
            {donateMode === "athlete" && (
              <li>
                <span className="text-[#666]">Wrestler:</span> {athleteQuery.trim() || manualCreditTrimmed || "—"}
              </li>
            )}
            <li>
              <span className="text-[#666]">Amount:</span> {formatUsd(amountCents)}
            </li>
            <li>
              <span className="text-[#666]">Receipt name:</span> {donorName || "—"}
            </li>
            {receiptIsOrganization ? (
              <li>
                <span className="text-[#666]">Receipt type:</span> Organization
              </li>
            ) : null}
            <li>
              <span className="text-[#666]">Email:</span> {email}
            </li>
            {payerContactName.trim() && (
              <li>
                <span className="text-[#666]">Contact:</span> {payerContactName.trim()}
              </li>
            )}
            <li>
              <span className="text-[#666]">Supporter list:</span> {donorListPublic ? "Show name" : "Anonymous"}
            </li>
            {teeEligible && (
              <li>
                <span className="text-[#666]">Tee:</span> {shirtSize} · ship to {shipCity}, {shipState}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Race: step 1 — payer */}
      {flow === "race" && raceStep === 1 && (
        <div className="mt-5 space-y-3 rounded border border-[#CC0000]/30 bg-[#1a0a0a] p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8A94A]">Who is paying (receipt)?</p>
          <p className="text-xs text-[#9ca3af]">Name and email for the card / tax receipt. The wrestler you credit is in a later step.</p>
          <div>
            <label htmlFor="spartan-race-donor-name" className="text-sm font-medium text-[#ccc]">
              Full name or organization
            </label>
            <input
              id="spartan-race-donor-name"
              type="text"
              required
              minLength={2}
              autoComplete="name"
              value={donorName}
              onChange={(e) => {
                setDonorName(e.target.value)
                dismissHighlight("spartan-race-donor-name")
              }}
              aria-invalid={fieldHighlights.includes("spartan-race-donor-name")}
              className={`mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#CC0000] focus:outline-none ${ringInvalid("spartan-race-donor-name")}`}
            />
            <p className="mt-1.5 text-[11px] text-[#666]">Individual or org — as it should read on the receipt.</p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[#ccc]">
              <input
                type="checkbox"
                checked={receiptIsOrganization}
                onChange={(e) => setReceiptIsOrganization(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border border-[#555] accent-[#C8A94A]"
              />
              <span>
                Receipt is for a <strong className="text-[#e5e5e5]">company or organization</strong>.
              </span>
            </label>
          </div>
          <div>
            <label htmlFor="spartan-race-donor-email" className="text-sm font-medium text-[#ccc]">
              Payer email
            </label>
            <input
              id="spartan-race-donor-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setRaceRegEmail((r) => (r === e.target.value ? r : r))
                dismissHighlight("spartan-race-donor-email")
              }}
              aria-invalid={fieldHighlights.includes("spartan-race-donor-email")}
              className={`mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#CC0000] focus:outline-none ${ringInvalid("spartan-race-donor-email")}`}
            />
          </div>
          <div>
            <label htmlFor="spartan-race-donor-contact" className="text-sm font-medium text-[#ccc]">
              Contact name <span className="font-normal text-[#666]">(optional)</span>
            </label>
            <p className="mt-0.5 text-[11px] text-[#666]">If the receipt is a company, who we should thank or follow up with.</p>
            <input
              id="spartan-race-donor-contact"
              type="text"
              autoComplete="name"
              value={payerContactName}
              onChange={(e) => setPayerContactName(e.target.value)}
              className="mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#CC0000] focus:outline-none"
            />
          </div>
        </div>
      )}

      {flow === "race" && raceStep === 2 && (
        <div className="mt-5 space-y-3 rounded border border-[#CC0000]/30 bg-[#1a0a0a] p-3 sm:p-4">
          <p className="text-[11px] font-medium text-[#C8A94A]">Who is running the race?</p>
          <div
            id="spartan-race-who-runs"
            className={`grid gap-2 rounded-md sm:grid-cols-2 ${fieldHighlights.includes("spartan-race-who-runs") ? "p-0.5 ring-2 ring-amber-500/90 ring-offset-2 ring-offset-[#1a0a0a]" : ""}`}
          >
            <button
              type="button"
              onClick={() => {
                setRaceFor("self")
                setRacerNameForRace(donorName)
                setRaceRegEmail(email)
                setError(null)
                dismissHighlight("spartan-race-who-runs")
              }}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded border px-2 py-2.5 text-center text-sm font-bold ${
                raceFor === "self" ? "border-[#CC0000] bg-[#2a1515] text-white" : "border-[#444] bg-[#0A0A0A] text-[#ccc]"
              }`}
            >
              <span className="leading-tight">You&apos;re the Spartan</span>
              <span
                className={`text-[10px] font-medium leading-tight ${
                  raceFor === "self" ? "text-[#d4d4d4]" : "text-[#888]"
                }`}
              >
                Race runner (you, on the course)
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRaceFor("other")
                setRacerNameForRace("")
                setRaceRegEmail((prev) => prev || email)
                setError(null)
                dismissHighlight("spartan-race-who-runs")
              }}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded border px-2 py-2.5 text-center text-sm font-bold ${
                raceFor === "other" ? "border-[#CC0000] bg-[#2a1515] text-white" : "border-[#444] bg-[#0A0A0A] text-[#ccc]"
              }`}
            >
              <span className="leading-tight">Someone else runs</span>
              <span
                className={`text-[10px] font-medium leading-tight ${
                  raceFor === "other" ? "text-[#d4d4d4]" : "text-[#888]"
                }`}
              >
                Family or friend is the race runner
              </span>
            </button>
          </div>
        </div>
      )}

      {flow === "race" && raceStep === 3 && (
        <div className="mt-5 space-y-3 rounded border border-[#CC0000]/30 bg-[#1a0a0a] p-3 sm:p-4">
          <p className="text-[11px] font-medium text-[#C8A94A]">Runner & Spartan email</p>
          <p className="text-xs text-[#9ca3af]">
            Spartan sends registration codes and race email to the address you list below. Parent/guardian is fine.
          </p>
          {raceFor === "other" && (
            <div>
              <label htmlFor="spartan-racer-name" className="text-sm font-medium text-[#ccc]">
                Runner’s full name
              </label>
              <input
                id="spartan-racer-name"
                type="text"
                value={racerNameForRace}
                onChange={(e) => {
                  setRacerNameForRace(e.target.value)
                  dismissHighlight("spartan-racer-name")
                }}
                aria-invalid={fieldHighlights.includes("spartan-racer-name")}
                className={`mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#CC0000] focus:outline-none ${ringInvalid("spartan-racer-name")}`}
                autoComplete="name"
              />
            </div>
          )}
          {raceFor === "self" && (
            <p className="text-sm text-[#ccc]">
              Runner: <strong className="text-white">{donorName || "—"}</strong> (from receipt name)
            </p>
          )}
          <div>
            <label htmlFor="spartan-race-spartan-email" className="text-sm font-medium text-[#ccc]">
              Email for registration & codes
            </label>
            <p className="mt-0.5 text-[11px] text-[#666]">We pass this to Spartan. Defaults to the payer email — change if a parent should get everything.</p>
            <input
              id="spartan-race-spartan-email"
              type="email"
              value={raceRegEmail}
              onChange={(e) => {
                setRaceRegEmail(e.target.value)
                dismissHighlight("spartan-race-spartan-email")
              }}
              placeholder={email}
              aria-invalid={fieldHighlights.includes("spartan-race-spartan-email")}
              className={`mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#CC0000] focus:outline-none ${ringInvalid("spartan-race-spartan-email")}`}
              autoComplete="email"
            />
          </div>
        </div>
      )}

      {flow === "race" && raceStep === 4 && (
        <div className="relative mt-5 rounded-lg border border-[#4a3d1a] border-l-4 border-l-[#C8A94A] bg-[#141008] p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C8A94A]">Wrestler to credit (required)</p>
          <p className="mt-1 text-xs text-[#b9a86e]">Search and select, or use manual name. Parent pays, child gets credit is fine.</p>
          <label className="mt-2 block text-sm text-[#ddd]" htmlFor="spartan-race-athlete-search">
            Search
          </label>
          <input
            id="spartan-race-athlete-search"
            type="text"
            placeholder="Type last name…"
            value={athleteQuery}
            onChange={(e) => {
              setAthleteQuery(e.target.value)
              setAthleteMenuOpen(true)
              dismissHighlight("spartan-race-athlete-search")
            }}
            onFocus={() => athleteHits.length > 0 && setAthleteMenuOpen(true)}
            aria-invalid={fieldHighlights.includes("spartan-race-athlete-search")}
            className={`mt-1.5 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white ${ringInvalid("spartan-race-athlete-search")}`}
            autoComplete="off"
          />
          {athleteSearchLoading && <p className="mt-1 text-[11px] text-[#666]">…</p>}
          {athleteMenuOpen && athleteHits.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border border-[#444] bg-[#141414] py-1 shadow-lg">
              {athleteHits.map((h) => (
                <li key={h.code}>
                  <button
                    type="button"
                    className="w-full px-3 py-3 text-left text-[#ddd] hover:bg-[#252525]"
                    onClick={() => {
                      setFundraisingCode(h.code)
                      setAthleteQuery(h.label)
                      setManualCreditName("")
                      setAthleteHits([])
                      setAthleteMenuOpen(false)
                      dismissHighlight("spartan-race-athlete-search")
                      dismissHighlight("spartan-race-manual")
                    }}
                  >
                    {h.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <label className="text-sm text-[#bbb]" htmlFor="spartan-race-manual">
              Not in the list? Manual name
            </label>
            <input
              id="spartan-race-manual"
              type="text"
              value={manualCreditName}
              onChange={(e) => {
                setManualCreditName(e.target.value)
                if (e.target.value.trim()) setFundraisingCode("")
                dismissHighlight("spartan-race-manual")
              }}
              aria-invalid={fieldHighlights.includes("spartan-race-manual")}
              className={`mt-1 min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white ${ringInvalid("spartan-race-manual")}`}
            />
          </div>
        </div>
      )}

      {flow === "race" && raceStep === 5 && (
        <div className="mt-5 space-y-3 rounded border border-[#CC0000]/35 bg-[#1a0a0a] px-3 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#C8A94A]">Which distance?</p>
          <p className="text-[12px] leading-relaxed text-[#aaa]">
            Choose the <span className="text-[#ccc]">Spartan distance</span> you are signing up for (name and weekend only here).
            The next step suggests a <span className="text-[#ccc]">recommended</span> NC United gift for that track — you can
            donate more or less ($5 minimum).
          </p>
          <label htmlFor="spartan-race-tier-w" className="text-[11px] text-[#888]">
            Your distance
          </label>
          <select
            id="spartan-race-tier-w"
            value={tierOrDefault}
            onChange={(e) => {
              const id = e.target.value as SpartanRaceTierId
              setTierPreference(id)
              setAmountDollars(suggestedDollarsString(id))
            }}
            className="min-h-[48px] w-full border border-[#444] bg-[#0A0A0A] px-3 py-2.5 text-base text-white focus:border-[#CC0000] focus:outline-none"
          >
            {SPARTAN_RACE_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.featured ? "★ " : ""}
                {t.name} · {t.scheduleChip}
              </option>
            ))}
          </select>
          <a
            href={FAYETTEVILLE_SPARTAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[11px] font-medium text-[#C8A94A] underline-offset-2 hover:underline"
          >
            Venue &amp; distances (reference) →
          </a>
        </div>
      )}

      {flow === "race" && raceStep === 6 && (
        <div className="mt-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#C8A94A]">Your gift amount</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#aaa]">
            <strong className="font-medium text-[#e5e5e5]">Recommended</strong> team fundraising for{" "}
            {SPARTAN_RACE_TIERS.find((t) => t.id === tierOrDefault)?.name ?? "this distance"}. It aligns with the usual
            suggested gift for that race — not a second Spartan entry fee. This is your tax-deductible{" "}
            <span className="text-[#ccc]">donation to NC United</span>; change the number to give more, less, or the same
            (minimum $5).
          </p>
          <label className="mt-3 block text-xs text-[#888]" htmlFor="spartan-amount-usd-r">
            Gift amount (dollars)
          </label>
          <div
            className={`mt-1 flex overflow-hidden rounded border border-[#444] bg-[#0A0A0A] focus-within:border-[#CC0000] ${
              fieldHighlights.includes("spartan-amount-usd-r") ? "ring-2 ring-amber-500/90 ring-offset-2 ring-offset-[#0a0a0a]" : ""
            }`}
          >
            <span className="flex items-center border-r border-[#444] bg-[#1a1a1a] px-2.5 text-[#888]">$</span>
            <input
              id="spartan-amount-usd-r"
              type="number"
              min={5}
              step={1}
              value={amountDollars}
              onChange={(e) => {
                setAmountDollars(e.target.value)
                dismissHighlight("spartan-amount-usd-r")
              }}
              aria-invalid={fieldHighlights.includes("spartan-amount-usd-r")}
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-lg font-bold tabular-nums text-white outline-none"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[#666]">
            {formatUsd(amountCents)} · <span className="text-[#C8A94A]">NC United tee included with race</span>
          </p>
        </div>
      )}

      {flow === "race" && raceStep === 7 && (
        <div className="mt-5 rounded border border-[#C8A94A]/35 bg-[#141414] px-3 py-3">
          <p className="text-xs font-medium text-[#C8A94A]">NC United tee (included) — size &amp; ship</p>
          <TeeBlock
            shirtSize={shirtSize}
            setShirtSize={setShirtSize}
            shipLine1={shipLine1}
            setShipLine1={setShipLine1}
            shipLine2={shipLine2}
            setShipLine2={setShipLine2}
            shipCity={shipCity}
            setShipCity={setShipCity}
            shipState={shipState}
            setShipState={setShipState}
            shipPostal={shipPostal}
            setShipPostal={setShipPostal}
            shipCountry={shipCountry}
            setShipCountry={setShipCountry}
            fieldHighlights={fieldHighlights}
            onClearHighlight={dismissHighlight}
          />
        </div>
      )}

      {flow === "race" && raceStep === 8 && (
        <div className="mt-6 rounded border border-[#333] bg-[#0c0c0c] p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#888]">Review</p>
          <ul className="mt-2 space-y-1.5 text-sm text-[#ccc]">
            <li>
              <span className="text-[#666]">Payer:</span> {donorName} · {email}
              {receiptIsOrganization ? (
                <span className="block text-[11px] text-[#888] sm:inline sm:before:content-['·_']">Organization receipt</span>
              ) : null}
            </li>
            {payerContactName.trim() && (
              <li>
                <span className="text-[#666]">Contact:</span> {payerContactName.trim()}
              </li>
            )}
            <li>
              <span className="text-[#666]">Runner:</span> {resolvedRaceParticipantName() || "—"} · reg email:{" "}
              {raceRegEmail.trim() || email}
            </li>
            <li>
              <span className="text-[#666]">Distance:</span> {SPARTAN_RACE_TIERS.find((t) => t.id === tierOrDefault)?.name}
            </li>
            <li>
              <span className="text-[#666]">Wrestler credit:</span>{" "}
              {athleteQuery.trim() || manualCreditTrimmed || "—"}
            </li>
            <li>
              <span className="text-[#666]">Amount:</span> {formatUsd(amountCents)}
            </li>
            <li>
              <span className="text-[#666]">Tee:</span> {shirtSize} · {shipCity}, {shipState}
            </li>
          </ul>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {/* Nav */}
      {flow === "donate" && donateStep > 1 && donateStep < 6 && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={donateBack}
            className={`min-h-[44px] flex-1 rounded border px-3 text-sm font-medium text-[#ccc] transition-colors ${fh ? "border-white/15 bg-[#061224]/80 hover:bg-[#0B2545]/55" : "border-[#444] bg-[#1a1a1a] hover:bg-[#252525]"}`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={donateNext}
            className="min-h-[44px] flex-1 rounded bg-[#C8A94A] text-sm font-bold text-black hover:brightness-110"
          >
            Next
          </button>
        </div>
      )}
      {flow === "donate" && donateStep === 6 && (
        <button
          type="submit"
          disabled={loading || !canSubmitReview}
          className="mt-5 w-full min-h-[48px] bg-[#CC0000] font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-wide text-white hover:bg-[#990000] disabled:opacity-50"
        >
          {loading ? "…" : "Continue to payment"}
        </button>
      )}

      {flow === "race" && raceStep >= 1 && raceStep < RACE_STEPS && (
        <div className="mt-4 flex gap-2">
          {raceStep > 1 && (
            <button
              type="button"
              onClick={raceBack}
              className="min-h-[44px] flex-1 rounded border border-[#444] bg-[#1a1a1a] text-sm text-[#ccc]"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={raceNext}
            className={`min-h-[44px] rounded bg-[#CC0000] text-sm font-bold text-white hover:bg-[#990000] ${raceStep === 1 ? "w-full" : "flex-1"}`}
          >
            Next
          </button>
        </div>
      )}
      {flow === "race" && raceStep === RACE_STEPS && (
        <button
          type="submit"
          disabled={loading || !canSubmitReview || !hasAthleteCredit}
          className="mt-5 w-full min-h-[48px] bg-[#CC0000] font-[family-name:var(--font-barlow-spartan)] text-base font-bold uppercase tracking-wide text-white hover:bg-[#990000] disabled:opacity-50"
        >
          {loading ? "…" : "Continue to payment"}
        </button>
      )}

      {flow === "race" && raceStep === RACE_STEPS && !hasAthleteCredit && (
        <p className="mt-2 text-center text-[11px] text-amber-200/90">Go back to the wrestler step and select or enter a name to credit.</p>
      )}

      {!flow && !fundraisingHub && <p className="mt-4 text-center text-[11px] text-[#666]">Choose Race or Donate to begin.</p>}
      {!flow && fundraisingHub && <p className="mt-4 text-center text-[11px] text-white/45">Loading checkout…</p>}
    </form>
  )
}

function TeeBlock({
  shirtSize,
  setShirtSize,
  shipLine1,
  setShipLine1,
  shipLine2,
  setShipLine2,
  shipCity,
  setShipCity,
  shipState,
  setShipState,
  shipPostal,
  setShipPostal,
  shipCountry,
  setShipCountry,
  fieldHighlights,
  onClearHighlight,
  ringOffsetClass = "ring-offset-[#0a0a0a]",
  fieldSurfaceClass = "border-[#444] bg-[#0A0A0A]",
  fieldPhClass = "placeholder:text-[#555]",
  imageFrameClass = "border border-[#333] bg-black",
}: {
  shirtSize: string
  setShirtSize: (s: string) => void
  shipLine1: string
  setShipLine1: (s: string) => void
  shipLine2: string
  setShipLine2: (s: string) => void
  shipCity: string
  setShipCity: (s: string) => void
  shipState: string
  setShipState: (s: string) => void
  shipPostal: string
  setShipPostal: (s: string) => void
  shipCountry: string
  setShipCountry: (s: string) => void
  fieldHighlights: string[]
  onClearHighlight: (id: string) => void
  ringOffsetClass?: string
  fieldSurfaceClass?: string
  fieldPhClass?: string
  imageFrameClass?: string
}) {
  const ringTee = (id: string) =>
    fieldHighlights.includes(id)
      ? `ring-2 ring-amber-500/90 ring-offset-2 ${ringOffsetClass} border-amber-500/50`
      : ""

  return (
    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="mx-auto shrink-0 sm:mx-0">
        <div className={`relative aspect-square w-[min(100%,200px)] overflow-hidden rounded sm:w-[180px] ${imageFrameClass}`}>
          <Image
            src="/images/spartan-nc-united-tee.png"
            alt="NC United team tee"
            fill
            sizes="200px"
            className="object-contain object-center"
          />
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor="spartan-tee-size" className="sr-only">
          Shirt size
        </label>
        <select
          id="spartan-tee-size"
          required
          value={shirtSize}
          onChange={(e) => {
            setShirtSize(e.target.value)
            onClearHighlight("spartan-tee-size")
          }}
          aria-invalid={fieldHighlights.includes("spartan-tee-size")}
          className={`min-h-[48px] w-full border px-2 py-2.5 text-base text-white focus:border-[#C8A94A] focus:outline-none ${fieldSurfaceClass} ${ringTee("spartan-tee-size")}`}
        >
          <option value="">Size</option>
          {TEE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          id="spartan-ship-line1"
          type="text"
          placeholder="Street"
          value={shipLine1}
          onChange={(e) => {
            setShipLine1(e.target.value)
            onClearHighlight("spartan-ship-line1")
          }}
          aria-invalid={fieldHighlights.includes("spartan-ship-line1")}
          className={`min-h-[44px] w-full border px-2 py-2.5 text-base text-white focus:border-[#C8A94A] focus:outline-none ${fieldPhClass} ${fieldSurfaceClass} ${ringTee("spartan-ship-line1")}`}
          autoComplete="address-line1"
        />
        <input
          type="text"
          placeholder="Apt (opt)"
          value={shipLine2}
          onChange={(e) => setShipLine2(e.target.value)}
          className={`min-h-[44px] w-full border px-2 py-2.5 text-base text-white ${fieldPhClass} focus:border-[#C8A94A] focus:outline-none ${fieldSurfaceClass}`}
          autoComplete="address-line2"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            id="spartan-ship-city"
            type="text"
            placeholder="City"
            value={shipCity}
            onChange={(e) => {
              setShipCity(e.target.value)
              onClearHighlight("spartan-ship-city")
            }}
            aria-invalid={fieldHighlights.includes("spartan-ship-city")}
            className={`min-h-[44px] border px-2 py-2.5 text-base text-white ${fieldSurfaceClass} ${ringTee("spartan-ship-city")}`}
            autoComplete="address-level2"
          />
          <input
            id="spartan-ship-state"
            type="text"
            placeholder="ST"
            value={shipState}
            onChange={(e) => {
              setShipState(e.target.value)
              onClearHighlight("spartan-ship-state")
            }}
            aria-invalid={fieldHighlights.includes("spartan-ship-state")}
            className={`min-h-[44px] border px-2 py-2.5 text-base text-white ${fieldSurfaceClass} ${ringTee("spartan-ship-state")}`}
            autoComplete="address-level1"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            id="spartan-ship-postal"
            type="text"
            placeholder="ZIP"
            value={shipPostal}
            onChange={(e) => {
              setShipPostal(e.target.value)
              onClearHighlight("spartan-ship-postal")
            }}
            aria-invalid={fieldHighlights.includes("spartan-ship-postal")}
            className={`min-h-[44px] border px-2 py-2.5 text-base text-white ${fieldSurfaceClass} ${ringTee("spartan-ship-postal")}`}
            autoComplete="postal-code"
          />
          <select
            value={shipCountry}
            onChange={(e) => setShipCountry(e.target.value)}
            className={`min-h-[44px] border px-2 py-2.5 text-base text-white ${fieldSurfaceClass}`}
          >
            <option value="US">US</option>
            <option value="CA">CA</option>
          </select>
        </div>
        <p className="text-[10px] text-[#666]">Use a ship-to you trust for merch — it may differ from the card on Stripe.</p>
      </div>
    </div>
  )
}
