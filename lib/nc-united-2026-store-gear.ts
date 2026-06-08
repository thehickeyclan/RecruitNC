/**
 * NC United 2026 national team gear — public store catalog (singlets + apparel).
 * Uses processed Blob images (transparent) from nhsca-gear-processed-manifest.json.
 * Seed with: npm run store:seed-2026-gear
 */

import { nhscaGearPhotoSrc } from "@/lib/nhsca-duals-2026-gear-images"
import { NHSCA_HUB_GEAR_SIZES } from "@/lib/nhsca-hub-checkout-pricing"

export type NcUnitedStoreGearImage = {
  url: string
  color?: string
  displayOrder: number
}

export type NcUnitedStoreGearProduct = {
  slug: string
  name: string
  description: string
  category: "t-shirts" | "athletic-wear"
  price: number
  featured: boolean
  displayOrder: number
  skuPrefix: string
  colors: string[]
  sizes: readonly string[]
  images: NcUnitedStoreGearImage[]
  defaultStockPerVariant: number
}

/**
 * Legacy store listings hidden once 2026 gear is live.
 * Re-run `npm run store:seed-2026-gear` to apply show_in_public_store = false.
 * Do not add slugs in NC_UNITED_STORE_SINGLET_SLUGS_PUBLIC — those stay visible.
 */
export const NC_UNITED_STORE_SINGLET_SLUGS_PUBLIC = [
  "nc-united-first-in-flight-singlet-1773453792672",
] as const

/** Public store product id — First In Flight singlet hero / deep links */
export const NC_UNITED_FIRST_IN_FLIGHT_PRODUCT_ID = "5beafde6-acbf-4bdd-aa68-9b80722eb7a9"

export const NC_UNITED_2026_DEPRECATED_STORE_SLUGS = [
  "nc-united-2026-singlet",
  "first-in-flight-singlet",
  "ultimate-club-duals-2025-singlet",
  "nhsca-duals-2025-singlet",
  "womens-ultimate-club-duals-2025-singlet",
  "womens-blue-ultimate-club-duals-2025-singlet",
] as const

/** Admin duplicates may append a timestamp — retire by prefix (except kept public slugs). */
export const NC_UNITED_2026_DEPRECATED_STORE_SLUG_PREFIXES = [] as const

export const NC_UNITED_2026_STORE_GEAR: NcUnitedStoreGearProduct[] = [
  {
    slug: "nc-united-2026-blue-singlet",
    name: "NC United 2026 Blue Singlet",
    description:
      'Official NC United "Pepsi" blue competition singlet — light blue top with North Carolina script and custom name on back. Required at weigh-ins for NHSCA Duals and AAU Scholastic Duals.',
    category: "athletic-wear",
    price: 75,
    featured: true,
    displayOrder: 1,
    skuPrefix: "NCU26-SING-BLU",
    colors: ["Blue"],
    sizes: NHSCA_HUB_GEAR_SIZES,
    images: [
      { url: nhscaGearPhotoSrc("blue-front"), color: "Blue", displayOrder: 0 },
      { url: nhscaGearPhotoSrc("blue-back"), color: "Blue", displayOrder: 1 },
    ],
    defaultStockPerVariant: 50,
  },
  {
    slug: "nc-united-2026-pinstripe-singlet",
    name: "NC United 2026 Pinstripe Singlet",
    description:
      'Official NC United "Pinstripes" competition singlet — navy, red, and white with NC logo and custom name on back. Required at weigh-ins for NHSCA Duals and AAU Scholastic Duals.',
    category: "athletic-wear",
    price: 75,
    featured: true,
    displayOrder: 2,
    skuPrefix: "NCU26-SING-PIN",
    colors: ["Pinstripe"],
    sizes: NHSCA_HUB_GEAR_SIZES,
    images: [
      { url: nhscaGearPhotoSrc("white-front"), color: "Pinstripe", displayOrder: 0 },
      { url: nhscaGearPhotoSrc("white-back"), color: "Pinstripe", displayOrder: 1 },
    ],
    defaultStockPerVariant: 50,
  },
  {
    slug: "nc-united-2026-long-sleeve-tee",
    name: "NC United Long Sleeve Tee",
    description:
      "Black NC United long sleeve tee — Wrestling United logo on front, Strength in Unity on back. Adult sizes S–2XL.",
    category: "t-shirts",
    price: 40,
    featured: true,
    displayOrder: 3,
    skuPrefix: "NCU26-LS",
    colors: ["Black"],
    sizes: NHSCA_HUB_GEAR_SIZES,
    images: [
      { url: nhscaGearPhotoSrc("long-sleeve-front"), color: "Black", displayOrder: 0 },
      { url: nhscaGearPhotoSrc("long-sleeve-back"), color: "Black", displayOrder: 1 },
    ],
    defaultStockPerVariant: 50,
  },
  {
    slug: "nc-united-2026-shorts",
    name: "NC United Team Shorts",
    description: "Black NC United team shorts with NC Wrestling logo. Adult sizes S–2XL.",
    category: "athletic-wear",
    price: 40,
    featured: false,
    displayOrder: 4,
    skuPrefix: "NCU26-SHT",
    colors: ["Black"],
    sizes: NHSCA_HUB_GEAR_SIZES,
    images: [{ url: nhscaGearPhotoSrc("shorts"), color: "Black", displayOrder: 0 }],
    defaultStockPerVariant: 50,
  },
  {
    slug: "nc-united-2026-tee",
    name: "NC United Short Sleeve Tee",
    description: "White NC United short sleeve tee — Wrestling United logo. Adult sizes S–2XL.",
    category: "t-shirts",
    price: 30,
    featured: false,
    displayOrder: 5,
    skuPrefix: "NCU26-TEE",
    colors: ["White"],
    sizes: NHSCA_HUB_GEAR_SIZES,
    images: [{ url: nhscaGearPhotoSrc("short-sleeve-tee"), color: "White", displayOrder: 0 }],
    defaultStockPerVariant: 50,
  },
]
