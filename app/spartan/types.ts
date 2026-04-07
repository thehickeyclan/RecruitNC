export type SpartanRaceTierId = "kids" | "sprint" | "super" | "beast" | "ultra"

export interface SpartanRaceTier {
  id: SpartanRaceTierId
  badge: string
  name: string
  detail: string
  dates: string
  priceLabel: string
  /** Typical Spartan list price for that distance — used as suggested tax-deductible gift to NC United, not a ticket purchase. */
  suggestedGiftCents: number
  featured?: boolean
  registerUrl: string
}
