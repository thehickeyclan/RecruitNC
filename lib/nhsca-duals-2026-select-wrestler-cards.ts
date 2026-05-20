import { sortDualsWeightClass } from "@/lib/nhsca-duals-2026-national-wrestler-cards"

export type SelectWrestlerCard = {
  weightClass: string
  wrestler: string
  /** Omit until PNG is in public/.../select-cards/ */
  imageSrc?: string
}

const CARD_BASE = "/national-team/nhsca-duals-2026/select-cards"

/** Sorted lightest → HWT. Add imageSrc when card art is uploaded (slug-weight.png). */
export const NHSCA_DUALS_2026_SELECT_WRESTLER_CARDS: SelectWrestlerCard[] = [
  // Missing art — user will provide
  { weightClass: "106", wrestler: "Kristopher Kerr" },
  { weightClass: "113", wrestler: "Xavier Bernthal", imageSrc: `${CARD_BASE}/xavier-bernthal-113.png` },
  { weightClass: "120", wrestler: "Adam Walker", imageSrc: `${CARD_BASE}/adam-walker-120.png` },
  { weightClass: "120", wrestler: "Danny McDermott", imageSrc: `${CARD_BASE}/danny-mcdermott-120.png` },
  { weightClass: "126", wrestler: "Holt Quincy", imageSrc: `${CARD_BASE}/holt-quincy-126.png` },
  { weightClass: "132", wrestler: "Shane Schuster", imageSrc: `${CARD_BASE}/shane-schuster-132.png` },
  { weightClass: "138", wrestler: "Cole Schuster", imageSrc: `${CARD_BASE}/cole-schuster-138.png` },
  { weightClass: "144", wrestler: "Jack Kancler", imageSrc: `${CARD_BASE}/jack-kancler-144.png` },
  { weightClass: "152", wrestler: "Jacob Perry", imageSrc: `${CARD_BASE}/jacob-perry-152.png` },
  { weightClass: "160", wrestler: "Fares Alkurdasi", imageSrc: `${CARD_BASE}/fares-alkurdasi-160.png` },
  { weightClass: "170", wrestler: "John Bane", imageSrc: `${CARD_BASE}/john-bane-170.png` },
  { weightClass: "183", wrestler: "Manny Kahsai", imageSrc: `${CARD_BASE}/manny-kahsai-183.png` },
  { weightClass: "190", wrestler: "Tillman Caskey", imageSrc: `${CARD_BASE}/tillman-caskey-190.png` },
  { weightClass: "220", wrestler: "Cory Thomas", imageSrc: `${CARD_BASE}/cory-thomas-220.png` },
  // Missing art
  { weightClass: "HWT", wrestler: "Mason Hocker" },
]

export function getSelectWrestlerCardsWithArt(): Array<SelectWrestlerCard & { imageSrc: string }> {
  return [...NHSCA_DUALS_2026_SELECT_WRESTLER_CARDS]
    .filter((c): c is SelectWrestlerCard & { imageSrc: string } => Boolean(c.imageSrc))
    .sort((a, b) => {
      const byWt = sortDualsWeightClass(a.weightClass, b.weightClass)
      if (byWt !== 0) return byWt
      return a.wrestler.localeCompare(b.wrestler)
    })
}

export function getSelectWrestlerCardsPendingCount(): number {
  return NHSCA_DUALS_2026_SELECT_WRESTLER_CARDS.filter((c) => !c.imageSrc).length
}
