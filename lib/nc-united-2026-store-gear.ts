/**
 * NC United 2026 national team gear — public store catalog (singlets + apparel).
 * Images live under public/images/nhsca-duals-2026-gear/.
 * Seed with: npm run store:seed-2026-gear
 */

import { NHSCA_HUB_GEAR_SIZES } from "@/lib/nhsca-hub-checkout-pricing"

const GEAR = "/images/nhsca-duals-2026-gear"

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

export const NC_UNITED_2026_STORE_GEAR: NcUnitedStoreGearProduct[] = [
  {
    slug: "nc-united-2026-singlet",
    name: "NC United 2026 Competition Singlet",
    description:
      "Official NC United competition singlet — blue or white. Custom name on back. Same gear worn at NHSCA Duals and AAU Scholastic Duals; required at weigh-ins.",
    category: "athletic-wear",
    price: 65,
    featured: true,
    displayOrder: 1,
    skuPrefix: "NCU26-SING",
    colors: ["Blue", "White"],
    sizes: NHSCA_HUB_GEAR_SIZES,
    images: [
      { url: `${GEAR}/singlet-blue-front.png`, color: "Blue", displayOrder: 0 },
      { url: `${GEAR}/singlet-blue-back.png`, color: "Blue", displayOrder: 1 },
      { url: `${GEAR}/singlet-white-front.png`, color: "White", displayOrder: 2 },
      { url: `${GEAR}/singlet-white-back.png`, color: "White", displayOrder: 3 },
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
    displayOrder: 2,
    skuPrefix: "NCU26-LS",
    colors: ["Black"],
    sizes: NHSCA_HUB_GEAR_SIZES,
    images: [
      { url: `${GEAR}/apparel-long-sleeve-front.png`, color: "Black", displayOrder: 0 },
      { url: `${GEAR}/apparel-long-sleeve-back.png`, color: "Black", displayOrder: 1 },
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
    displayOrder: 3,
    skuPrefix: "NCU26-SHT",
    colors: ["Black"],
    sizes: NHSCA_HUB_GEAR_SIZES,
    images: [{ url: `${GEAR}/apparel-shorts.png`, color: "Black", displayOrder: 0 }],
    defaultStockPerVariant: 50,
  },
  {
    slug: "nc-united-2026-tee",
    name: "NC United Short Sleeve Tee",
    description: "White NC United short sleeve tee — Wrestling United logo. Adult sizes S–2XL.",
    category: "t-shirts",
    price: 30,
    featured: false,
    displayOrder: 4,
    skuPrefix: "NCU26-TEE",
    colors: ["White"],
    sizes: NHSCA_HUB_GEAR_SIZES,
    images: [{ url: `${GEAR}/apparel-short-sleeve-tee.png`, color: "White", displayOrder: 0 }],
    defaultStockPerVariant: 50,
  },
]
