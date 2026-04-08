export type SpartanRaceTierId = "kids" | "sprint" | "super" | "beast" | "ultra"

export interface SpartanRaceTier {
  id: SpartanRaceTierId
  badge: string
  name: string
  detail: string
  /** Short schedule line from Spartan.com (e.g. May 2–3 vs May 3) — used in checkout dropdown. */
  scheduleChip: string
  dates: string
  priceLabel: string
  /** Typical Spartan list price for that distance — used as suggested tax-deductible gift to NC United, not a ticket purchase. */
  suggestedGiftCents: number
  featured?: boolean
  registerUrl: string
}
