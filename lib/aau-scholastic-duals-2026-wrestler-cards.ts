import { AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS } from "@/lib/aau-scholastic-duals-2026-results"
import { sortDualsWeightClass } from "@/lib/nhsca-duals-2026-national-wrestler-cards"

/** AAU Scholastic Duals 2026 — wrestler card art (add images under public/national-team/aau-scholastic-duals-2026/cards/). */
export type AauScholasticWrestlerCard = {
  weightClass: string
  wrestler: string
  /** Path under /public */
  imageSrc: string
  /** Optional highlight reel — card flips to play on tap */
  highlightVideoSrc?: string
}

const CARD_BASE = "/national-team/aau-scholastic-duals-2026/cards"

/** Sorted lightest → HWT. Add entries as card art arrives (filename: slug-weight.png). */
export const AAU_SCHOLASTIC_DUALS_2026_WRESTLER_CARDS: AauScholasticWrestlerCard[] = [
  { weightClass: "106", wrestler: "Xan Moody", imageSrc: `${CARD_BASE}/xan-moody-106.png` },
  { weightClass: "113", wrestler: "Aiden Burkholder", imageSrc: `${CARD_BASE}/aiden-burkholder-113.png` },
  { weightClass: "120", wrestler: "Luke Richards", imageSrc: `${CARD_BASE}/luke-richards-120.png`, highlightVideoSrc: "/national-team/aau-scholastic-duals-2026/videos/luke-richards-highlight.mov" },
  { weightClass: "126", wrestler: "Paxton Kearns", imageSrc: `${CARD_BASE}/paxton-kearns-126.png` },
  { weightClass: "132", wrestler: "Mac Johnson", imageSrc: `${CARD_BASE}/mac-johnson-132.png`, highlightVideoSrc: "/national-team/aau-scholastic-duals-2026/videos/mac-johnson-highlight.mov" },
  { weightClass: "138", wrestler: "Tye Johnson", imageSrc: `${CARD_BASE}/tye-johnson-138.png` },
  { weightClass: "144", wrestler: "Jake Amiott", imageSrc: `${CARD_BASE}/jake-amiott-144.png` },
  { weightClass: "150", wrestler: "Jacob Perry", imageSrc: `${CARD_BASE}/jacob-perry-150.png` },
  { weightClass: "157", wrestler: "Aaron Ellison", imageSrc: `${CARD_BASE}/aaron-ellison-157.png`, highlightVideoSrc: "/national-team/aau-scholastic-duals-2026/videos/aaron-ellison-highlight.mov" },
  { weightClass: "165", wrestler: "Tobin McNair", imageSrc: `${CARD_BASE}/tobin-mcnair-165.png` },
]

export function getAauScholasticWrestlerCardsSorted(): AauScholasticWrestlerCard[] {
  return [...AAU_SCHOLASTIC_DUALS_2026_WRESTLER_CARDS].sort((a, b) =>
    sortDualsWeightClass(a.weightClass, b.weightClass)
  )
}

export function getAauScholasticWrestlerCardsPendingCount(): number {
  const rosterSize = AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS.length
  return Math.max(0, rosterSize - AAU_SCHOLASTIC_DUALS_2026_WRESTLER_CARDS.length)
}

export function aauScholasticCardRecord(wrestler: string): string | null {
  const row = AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS.find((r) => r.wrestler === wrestler)
  return row ? `${row.wins}–${row.losses}` : null
}
