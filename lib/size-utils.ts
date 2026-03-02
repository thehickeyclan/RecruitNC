/**
 * Standard size order for clothing
 */
const SIZE_ORDER = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "One Size",
  "One Size Fits All",
  "OS",
]

/**
 * Sort sizes in standard order
 */
export function sortSizes(sizes: string[]): string[] {
  if (!sizes?.length) return []
  return [...sizes].sort((a, b) => {
    const aIndex = SIZE_ORDER.findIndex(
      (size) => size.toUpperCase() === a.toUpperCase()
    )
    const bIndex = SIZE_ORDER.findIndex(
      (size) => size.toUpperCase() === b.toUpperCase()
    )

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }

    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1

    return a.localeCompare(b)
  })
}

/**
 * Check if a product should show size selection
 * Products that are "one size" or in categories like socks should not show size
 */
export function shouldShowSizeSelector(
  sizes: string[],
  category?: string | null,
  productName?: string | null
): boolean {
  if (!sizes?.length) return false

  if (sizes.length === 1) {
    const size = sizes[0]?.toUpperCase() || ""
    if (
      size === "ONE SIZE" ||
      size === "ONE SIZE FITS ALL" ||
      size === "OS" ||
      size === "ONE-SIZE"
    ) {
      return false
    }
  }

  const noSizeCategories = [
    "socks",
    "sock",
    "accessories",
    "accessory",
    "stickers",
    "sticker",
    "magnets",
    "magnet",
    "car-magnet",
    "practice-fee",
  ]

  if (category) {
    const categoryLower = category.toLowerCase()
    if (noSizeCategories.some((cat) => categoryLower.includes(cat))) {
      return false
    }
  }

  if (productName) {
    const nameLower = productName.toLowerCase()
    if (
      nameLower.includes("sock") ||
      nameLower.includes("one size") ||
      nameLower.includes("one-size")
    ) {
      return false
    }
  }

  return true
}
