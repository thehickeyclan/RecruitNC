import type { SpartanRaceTier, SpartanRaceTierId } from "./types"

/** Form default when user picks Race — Super 10K (Team NC distance). */
export const DEFAULT_SPARTAN_RACE_TIER_ID: SpartanRaceTierId = "super"

const FAYETTEVILLE_SPARTAN_URL = "https://www.spartan.com/en/races/fayetteville-north-carolina?index=0"

/** Fayetteville 2026 — schedule chips match Spartan.com Trifecta weekend listings. */
export const SPARTAN_RACE_TIERS: SpartanRaceTier[] = [
  {
    id: "kids",
    badge: "Family fun",
    name: "Kids Race",
    detail: "1–3 km · obstacles",
    scheduleChip: "May 2–3",
    dates: "May 2–3, 2026 · Fayetteville, NC — Kids heats (weekend)",
    priceLabel: "From $29",
    suggestedGiftCents: 2900,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
  {
    id: "sprint",
    badge: "Challenge a friend",
    name: "Sprint",
    detail: "5K · 20 obstacles",
    scheduleChip: "May 2–3",
    dates: "May 2–3, 2026 · Fayetteville, NC — Sprint (Sat & Sun heats)",
    priceLabel: "From $129",
    suggestedGiftCents: 12_900,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
  {
    id: "super",
    badge: "Great for teams",
    name: "Super 10K",
    detail: "10K · 25 obstacles — team distance (same day for the whole crew)",
    scheduleChip: "May 3",
    dates: "May 3, 2026 · Fayetteville, NC — Super 10K (Sun) · Team NC",
    priceLabel: "From $155",
    suggestedGiftCents: 15_500,
    featured: true,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
  {
    id: "beast",
    badge: "Test the mind & body",
    name: "Beast 21K",
    detail: "21K · 30 obstacles · South National Series",
    scheduleChip: "May 2",
    dates: "May 2, 2026 · Fayetteville, NC — Beast (Sat)",
    priceLabel: "From $195",
    suggestedGiftCents: 19_500,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
  {
    id: "ultra",
    badge: "For the few",
    name: "Ultra 50K",
    detail: "50K · 60 obstacles",
    scheduleChip: "May 2",
    dates: "May 2, 2026 · Fayetteville, NC — Ultra (Sat)",
    priceLabel: "From $255",
    suggestedGiftCents: 25_500,
    registerUrl: FAYETTEVILLE_SPARTAN_URL,
  },
]

export function suggestedCentsForTier(id: SpartanRaceTierId | ""): number | null {
  if (!id) return null
  const row = SPARTAN_RACE_TIERS.find((t) => t.id === id)
  return row ? row.suggestedGiftCents : null
}

/** May 3, 2026 — 7:00 AM US Eastern (EDT) — Super 10K team race day for Team NC. */
export const SPARTAN_COUNTDOWN_ISO = "2026-05-03T11:00:00.000Z"

export const NCU_EIN = "99-3757238"
