/** Super 10K (Team NC) only — single race on checkout. */
export type SpartanRaceTierId = "super"

export interface SpartanRaceTier {
  id: SpartanRaceTierId
  badge: string
  name: string
  detail: string
  /** Short schedule line for compact UI */
  scheduleChip: string
  dates: string
  priceLabel: string
  /** Typical Spartan list price — suggested tax-deductible gift to NC United */
  suggestedGiftCents: number
  featured?: boolean
  registerUrl: string
}
