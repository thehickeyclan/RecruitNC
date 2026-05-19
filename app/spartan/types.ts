/** Fayetteville 2026 — distances available on fundraising checkout (ballpark Spartan “from” pricing). */
export type SpartanRaceTierId = "sprint" | "super" | "beast" | "ultra" | "kids" | "other"

export interface SpartanRaceTier {
  id: SpartanRaceTierId
  badge: string
  name: string
  detail: string
  /** Short schedule line for compact UI */
  scheduleChip: string
  dates: string
  priceLabel: string
  /** Typical Spartan list price — suggested charitable gift routed through NC United checkout (editable; deduction eligibility donor-specific). */
  suggestedGiftCents: number
  /** NC United crew / team race highlight */
  featured?: boolean
  registerUrl: string
}
