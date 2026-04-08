import type { SpartanRaceTier } from "./types"

/** Fayetteville 2026 — update registerUrl when Spartan sends per-distance links or codes. */
export const SPARTAN_RACE_TIERS: SpartanRaceTier[] = [
  {
    id: "kids",
    badge: "Family fun",
    name: "Kids Race",
    detail: "1–3 km · Obstacles",
    dates: "May 2–3, 2026 · Fayetteville, NC",
    priceLabel: "From $29",
    suggestedGiftCents: 2900,
    registerUrl: "https://www.spartan.com",
  },
  {
    id: "sprint",
    badge: "Challenge a friend",
    name: "Sprint",
    detail: "5K · 20 Obstacles",
    dates: "May 2–3, 2026 · Fayetteville, NC",
    priceLabel: "From $129",
    suggestedGiftCents: 12_900,
    registerUrl: "https://www.spartan.com",
  },
  {
    id: "super",
    badge: "Great for teams",
    name: "Super 10K",
    detail: "10K · 25 Obstacles — team distance (same day for the whole crew)",
    dates: "Sunday May 3, 2026 · Fayetteville, NC — team race day",
    priceLabel: "From $155",
    suggestedGiftCents: 15_500,
    featured: true,
    registerUrl: "https://www.spartan.com",
  },
  {
    id: "beast",
    badge: "Test the mind & body",
    name: "Beast 21K",
    detail: "21K · 30 Obstacles · South National Series",
    dates: "May 2, 2026 · Fayetteville, NC",
    priceLabel: "From $195",
    suggestedGiftCents: 19_500,
    registerUrl: "https://www.spartan.com",
  },
  {
    id: "ultra",
    badge: "For the few",
    name: "Ultra 50K",
    detail: "50K · 60 Obstacles",
    dates: "May 2, 2026 · Fayetteville, NC",
    priceLabel: "From $255",
    suggestedGiftCents: 25_500,
    registerUrl: "https://www.spartan.com",
  },
]

export function suggestedCentsForTier(id: SpartanRaceTierId | ""): number | null {
  if (!id) return null
  const row = SPARTAN_RACE_TIERS.find((t) => t.id === id)
  return row ? row.suggestedGiftCents : null
}

/** May 3, 2026 — 7:00 AM US Eastern (EDT) — Super 10K team race day for NC United crew. */
export const SPARTAN_COUNTDOWN_ISO = "2026-05-03T11:00:00.000Z"

export const NCU_EIN = "99-3757238"
