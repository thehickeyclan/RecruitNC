// NHSCA Duals 2026 - Product catalog (server-side source of truth)

export interface NhscaProduct {
  id: string
  name: string
  description: string
  priceInCents: number
  category: 'bundle' | 'registration' | 'apparel' | 'transport'
  selectable?: boolean // can select quantity
  includedIn?: string[] // which bundles include this
}

export const NHSCA_2026_PRODUCTS: NhscaProduct[] = [
  // Main bundle
  {
    id: 'nhsca-2026-team-package',
    name: 'NHSCA Team Package',
    description: 'Tournament Registration & Team Fee, 2 NC United Singlets, Team Shorts, Short Sleeve Tee, Long Sleeve Tee',
    priceInCents: 25000, // $250
    category: 'bundle',
  },
  // Individual items
  {
    id: 'nhsca-2026-registration',
    name: 'Tournament Registration & Team Fee',
    description: 'Entry fee for NHSCA National Duals 2026',
    priceInCents: 7500, // $75
    category: 'registration',
  },
  {
    id: 'nhsca-2026-singlet',
    name: 'NC United Singlet',
    description: 'Official NC United competition singlet',
    priceInCents: 7500, // $75
    category: 'apparel',
    selectable: true,
  },
  {
    id: 'nhsca-2026-apparel-package',
    name: 'NC United Apparel Package',
    description: 'Team Shorts + Short Sleeve Tee + Long Sleeve Tee',
    priceInCents: 11000, // $110
    category: 'apparel',
  },
  {
    id: 'nhsca-2026-shorts',
    name: 'Team Shorts',
    description: 'Official NC United team shorts',
    priceInCents: 4000, // $40
    category: 'apparel',
  },
  {
    id: 'nhsca-2026-short-sleeve',
    name: 'Short Sleeve Tee',
    description: 'NC United short sleeve t-shirt',
    priceInCents: 3000, // $30
    category: 'apparel',
  },
  {
    id: 'nhsca-2026-long-sleeve',
    name: 'Long Sleeve Tee',
    description: 'NC United long sleeve t-shirt',
    priceInCents: 4000, // $40
    category: 'apparel',
  },
  {
    id: 'nhsca-2026-transport',
    name: 'Transportation / Van Fee',
    description: 'Round-trip transportation from Raleigh to Virginia Beach',
    priceInCents: 0, // TBD - will be updated
    category: 'transport',
  },
]

export function getNhscaProduct(id: string): NhscaProduct | undefined {
  return NHSCA_2026_PRODUCTS.find(p => p.id === id)
}

export function calculateNhscaTotal(items: Array<{ productId: string; quantity: number }>): number {
  return items.reduce((sum, item) => {
    const product = getNhscaProduct(item.productId)
    if (!product) return sum
    return sum + (product.priceInCents * item.quantity)
  }, 0)
}
