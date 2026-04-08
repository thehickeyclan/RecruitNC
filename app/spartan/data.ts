import type { SpartanRaceTier, SpartanRaceTierId } from "./types"

/** Form default — only distance offered for Race path. */
export const DEFAULT_SPARTAN_RACE_TIER_ID: SpartanRaceTierId = "super"

const FAYETTEVILLE_SPARTAN_URL = "https://www.spartan.com/en/races/fayetteville-north-carolina?index=0"

/** Team NC / Spartan Fayetteville — Super 10K only on this page. */
export const SPARTAN_SUPER_10K: SpartanRaceTier = {
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
}

export const SPARTAN_RACE_TIERS: SpartanRaceTier[] = [SPARTAN_SUPER_10K]

export function suggestedCentsForTier(id: SpartanRaceTierId | ""): number | null {
  if (!id) return null
  const row = SPARTAN_RACE_TIERS.find((t) => t.id === id)
  return row ? row.suggestedGiftCents : null
}

/** May 3, 2026 — 7:00 AM US Eastern (EDT) — Super 10K team race day for Team NC. */
export const SPARTAN_COUNTDOWN_ISO = "2026-05-03T11:00:00.000Z"

export const NCU_EIN = "99-3757238"
