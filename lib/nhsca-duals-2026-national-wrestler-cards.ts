/** NHSCA Duals 2026 — National team wrestler graphics (add images under public/national-team/nhsca-duals-2026/national-cards/). */
export type NationalWrestlerCard = {
  weightClass: string
  wrestler: string
  /** Path under /public, e.g. /national-team/nhsca-duals-2026/national-cards/xan-moody-106.png */
  imageSrc: string
}

const CARD_BASE = "/national-team/nhsca-duals-2026/national-cards"

/** Sorted lightest → HWT. Add entries as you receive card art (filename: slug-weight.png). */
export const NHSCA_DUALS_2026_NATIONAL_WRESTLER_CARDS: NationalWrestlerCard[] = [
  { weightClass: "106", wrestler: "Xan Moody", imageSrc: `${CARD_BASE}/xan-moody-106.png` },
  { weightClass: "113", wrestler: "Jaxon Thomas", imageSrc: `${CARD_BASE}/jaxon-thomas-113.png` },
  { weightClass: "120", wrestler: "Jekai Sedgwick", imageSrc: `${CARD_BASE}/jekai-sedgwick-120.png` },
  { weightClass: "126", wrestler: "Ayden Sumners", imageSrc: `${CARD_BASE}/ayden-sumners-126.png` },
  { weightClass: "132", wrestler: "Mac Johnson", imageSrc: `${CARD_BASE}/mac-johnson-132.png` },
  { weightClass: "138", wrestler: "Tye Johnson", imageSrc: `${CARD_BASE}/tye-johnson-138.png` },
  { weightClass: "145", wrestler: "Sammy Gantt", imageSrc: `${CARD_BASE}/sammy-gantt-145.png` },
  { weightClass: "152", wrestler: "Aidan Gore", imageSrc: `${CARD_BASE}/aidan-gore-152.png` },
  { weightClass: "160", wrestler: "Tobin McNair", imageSrc: `${CARD_BASE}/tobin-mcnair-160.png` },
  { weightClass: "170", wrestler: "Dom Blue", imageSrc: `${CARD_BASE}/dom-blue-170.png` },
  { weightClass: "182", wrestler: "Brieon Mayfield", imageSrc: `${CARD_BASE}/brieon-mayfield-182.png` },
  { weightClass: "195", wrestler: "Fares Alkurdasi", imageSrc: "/national-team/nhsca-duals-2026/select-cards/fares-alkurdasi-160.png" },
  { weightClass: "220", wrestler: "Gavin Lopez", imageSrc: `${CARD_BASE}/gavin-lopez-220.png` },
  { weightClass: "HWT", wrestler: "Keyshon Morrison", imageSrc: `${CARD_BASE}/keyshon-morrison-hwt.png` },
]

export function sortDualsWeightClass(a: string, b: string): number {
  const rank = (w: string) => {
    const u = w.trim().toUpperCase()
    if (u === "HWT") return 999
    const n = parseInt(u, 10)
    return Number.isFinite(n) ? n : 500
  }
  return rank(a) - rank(b)
}

export function getNationalWrestlerCardsSorted(): NationalWrestlerCard[] {
  return [...NHSCA_DUALS_2026_NATIONAL_WRESTLER_CARDS].sort((a, b) =>
    sortDualsWeightClass(a.weightClass, b.weightClass)
  )
}
