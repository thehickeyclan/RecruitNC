import type { SpartanRaceTier, SpartanRaceTierId } from "./types"

/** Official Spartan.com event page — distances, waves, Open vs Age Group. */
export const FAYETTEVILLE_SPARTAN_URL = "https://www.spartan.com/en/races/fayetteville-north-carolina?index=0"

/**
 * Ballpark “from” prices from Spartan.com — suggested gift only; donors can override.
 * Schedule & waves: set when you complete registration on Spartan.com.
 */
export const SPARTAN_RACE_TIERS: SpartanRaceTier[] = [
  {
    id: "super",
    badge: "Super 10K — crew line-up",
    name: "Super 10K",
    detail: "10K · ~25 obstacles · lots of teammates on Sun May 3 (any distance is fine)",
    scheduleChip: "May 3",
    dates: "Fayetteville May 2–3, 2026 · Super 10K Sun May 3 (popular with NC United)",
    priceLabel: "~$155",
    suggestedGiftCents: 15_500,
    featured: true,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
  {
    id: "sprint",
    badge: "Challenge a friend",
    name: "Sprint 5K",
    detail: "~5K · ~20 obstacles",
    scheduleChip: "May 2–3",
    dates: "May 2–3, 2026 · Fayetteville",
    priceLabel: "~$129",
    suggestedGiftCents: 12_900,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
  {
    id: "beast",
    badge: "South National Series",
    name: "Beast 21K",
    detail: "~21K · ~30 obstacles",
    scheduleChip: "May 2",
    dates: "May 2, 2026 · Fayetteville",
    priceLabel: "~$195",
    suggestedGiftCents: 19_500,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
  {
    id: "ultra",
    badge: "For the few",
    name: "Ultra 50K",
    detail: "~50K · ~60 obstacles",
    scheduleChip: "May 2",
    dates: "May 2, 2026 · Fayetteville",
    priceLabel: "~$255",
    suggestedGiftCents: 25_500,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
  {
    id: "kids",
    badge: "Family fun",
    name: "Kids race",
    detail: "~1–3K + obstacles",
    scheduleChip: "May 2–3",
    dates: "May 2–3, 2026 · Fayetteville",
    priceLabel: "~$29",
    suggestedGiftCents: 2900,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
  {
    id: "other",
    badge: "Not sure yet",
    name: "Other / TBD",
    detail: "Pick a ballpark amount; tell us the race when you lock it on Spartan",
    scheduleChip: "May 2–3",
    dates: "Fayetteville weekend · pick distance when you register",
    priceLabel: "Your choice",
    suggestedGiftCents: 5000,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
]

/** Form defaults to Super 10K; dropdown lists every Fayetteville distance. */
export const DEFAULT_SPARTAN_RACE_TIER_ID: SpartanRaceTierId = "super"

export const SPARTAN_SUPER_10K: SpartanRaceTier =
  SPARTAN_RACE_TIERS.find((t) => t.id === "super") ?? SPARTAN_RACE_TIERS[0]

const TIER_IDS = new Set(SPARTAN_RACE_TIERS.map((t) => t.id))

export function isSpartanRaceTierId(id: string): id is SpartanRaceTierId {
  return TIER_IDS.has(id as SpartanRaceTierId)
}

export function getSpartanRaceTierOrDefault(id: string): SpartanRaceTier {
  if (isSpartanRaceTierId(id)) {
    const row = SPARTAN_RACE_TIERS.find((t) => t.id === id)
    if (row) return row
  }
  return SPARTAN_SUPER_10K
}

export function suggestedCentsForTier(id: SpartanRaceTierId | ""): number | null {
  if (!id) return null
  const row = SPARTAN_RACE_TIERS.find((t) => t.id === id)
  return row ? row.suggestedGiftCents : null
}

/** May 3, 2026 — 7:00 AM US Eastern (EDT) — many NC United athletes on the Super 10K wave. */
export const SPARTAN_COUNTDOWN_ISO = "2026-05-03T11:00:00.000Z"

export const NCU_EIN = "99-3757238"
