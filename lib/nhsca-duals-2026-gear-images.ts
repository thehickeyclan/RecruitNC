/** NHSCA Duals 2026 team gear mockups (public/images). */
const GEAR = "/images/nhsca-duals-2026-gear"

/** Legacy composite paths — prefer individual crops in GEAR folder. */
export const NHSCA_DUALS_2026_SINGLET_NATIONAL = "/images/nhsca-duals-2026-singlet-national.png"
export const NHSCA_DUALS_2026_SINGLET_SELECT = "/images/nhsca-duals-2026-singlet-select.png"
export const NHSCA_DUALS_2026_APPAREL = "/images/nhsca-duals-2026-apparel.png"

export type NhscaSingletColor = "blue" | "white"

export const NHSCA_SINGLET_COLOR_LABELS: Record<NhscaSingletColor, string> = {
  blue: "Blue",
  white: "White",
}

export type NhscaGearPhoto = {
  id: string
  src: string
  label: string
  alt: string
}

export const NHSCA_DUALS_2026_SINGLET_PHOTOS: NhscaGearPhoto[] = [
  {
    id: "blue-front",
    src: `${GEAR}/singlet-blue-front.png`,
    label: "Blue — front",
    alt: "NC United blue singlet front — light blue top with North Carolina script",
  },
  {
    id: "blue-back",
    src: `${GEAR}/singlet-blue-back.png`,
    label: "Blue — back",
    alt: "NC United blue singlet back — custom name band and NC state silhouette",
  },
  {
    id: "white-front",
    src: `${GEAR}/singlet-white-front.png`,
    label: "White — front",
    alt: "NC United white singlet front — navy and pinstripe with NC logo",
  },
  {
    id: "white-back",
    src: `${GEAR}/singlet-white-back.png`,
    label: "White — back",
    alt: "NC United white singlet back — name plate and NC crest",
  },
]

/** Front views only — hub hero / homepage banner. */
export const NHSCA_DUALS_2026_SINGLET_FRONTS = NHSCA_DUALS_2026_SINGLET_PHOTOS.filter((p) =>
  p.id.endsWith("-front")
)

export const NHSCA_DUALS_2026_APPAREL_PHOTOS: NhscaGearPhoto[] = [
  {
    id: "long-sleeve-front",
    src: `${GEAR}/apparel-long-sleeve-front.png`,
    label: "Long sleeve — front",
    alt: "NC United black long sleeve tee front — Wrestling United logo",
  },
  {
    id: "long-sleeve-back",
    src: `${GEAR}/apparel-long-sleeve-back.png`,
    label: "Long sleeve — back",
    alt: "NC United black long sleeve tee back — Strength in Unity",
  },
  {
    id: "shorts",
    src: `${GEAR}/apparel-shorts.png`,
    label: "Team shorts",
    alt: "NC United black team shorts with NC Wrestling logo",
  },
  {
    id: "short-sleeve-tee",
    src: `${GEAR}/apparel-short-sleeve-tee.png`,
    label: "Short sleeve tee",
    alt: "NC United white short sleeve tee — Together We Are N. Carolina",
  },
]

/** @deprecated Use NHSCA_DUALS_2026_SINGLET_FRONTS for compact previews. */
export const NHSCA_DUALS_2026_SINGLETS = [
  {
    color: "blue" as const,
    src: `${GEAR}/singlet-blue-front.png`,
    label: "Blue singlet",
    alt: "NC United blue competition singlet — light blue and black with North Carolina script",
  },
  {
    color: "white" as const,
    src: `${GEAR}/singlet-white-front.png`,
    label: "White singlet",
    alt: "NC United white competition singlet — navy, red, and white with NC logo",
  },
] as const

/** All product photos — singlets first, then apparel (carousel order). */
export const NHSCA_DUALS_2026_ALL_GEAR_PHOTOS: NhscaGearPhoto[] = [
  ...NHSCA_DUALS_2026_SINGLET_PHOTOS,
  ...NHSCA_DUALS_2026_APPAREL_PHOTOS,
]
