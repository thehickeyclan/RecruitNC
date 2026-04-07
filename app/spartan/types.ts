export type SpartanRaceTierId = "kids" | "sprint" | "super" | "beast" | "ultra"

export interface SpartanRaceTier {
  id: SpartanRaceTierId
  badge: string
  name: string
  detail: string
  dates: string
  priceLabel: string
  featured?: boolean
  registerUrl: string
}
