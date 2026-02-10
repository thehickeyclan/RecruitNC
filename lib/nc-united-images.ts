/**
 * NC United Image Mapping
 * Maps all images used in the NC United National Team portal
 *
 * Images are stored in /public/images/ and referenced by path
 */

export const imageMapping = {
  // Logo and branding
  branding: {
    ncUnitedLogo: "/images/nc-united-logo.png",
    ucdLogo: "/images/ultimate-club-duals-logo.png",
  },

  // Team photos
  teamPhotos: {
    nhsca2025: "/images/team-photo.png",
  },

  // Coach photos
  coaches: {
    mikeMacchiavello: "/images/coach-macchiavello.png",
    coltonPalmer: "/images/coach-palmer.png",
  },

  // NHSCA 2025 wrestler photos
  nhsca2025Wrestlers: {
    lukeRichards: "/images/nhsca-luke-richards-action-new.png",
    jekaiSedgwick: "/images/jekai-sedgwick-nhsca.png",
    eliTaylor: "/images/eli-taylor-nhsca.png",
    carsonRaper: "/images/carson-raper-nhsca.png",
    blaydenThompson: "/images/blayden-thompson-nhsca.png",
    braylonButts: "/images/braylon-butts-nhsca.png",
    jaxsonThomas: "/images/jaxson-thomas-nhsca.png",
    aaronEllison: "/images/aaron-ellison-nhsca.png",
    bentleySly: "/images/bentley-sly-nhsca.png",
    macJohnson: "/images/mac-johnson-nhsca.png",
    aidenWhite: "/images/aiden-white-nhsca.png",
    samHarper: "/images/sam-harper-nhsca.png",
    tobinMcnair: "/images/tobin-mcnair-nhsca.png",
    jackHarty: "/images/jack-harty-nhsca.png",
  },

  // UCD 2025 wrestler photos
  ucd2025Wrestlers: {
    jekaiSedgwick: "/images/ucd-2025-jekai-sedgwick.png",
    eliTaylor: "/images/ucd-2025-eli-taylor.png",
    carsonRaper: "/images/ucd-2025-carson-raper.png",
    blaydenThompson: "/images/ucd-2025-blayden-thompson.png",
    braylonButts: "/images/ucd-2025-braylon-butts.png",
    jaxsonThomas: "/images/ucd-2025-jaxson-thomas.png",
    aaronEllison: "/images/ucd-2025-aaron-ellison.png",
    jacobPerry: "/images/ucd-2025-jacob-perry.png",
    macJohnson: "/images/ucd-2025-mac-johnson.png",
    aidenWhite: "/images/ucd-2025-aiden-white.png",
    samHarper: "/images/ucd-2025-sam-harper.png",
    tobinMcnair: "/images/ucd-2025-tobin-mcnair.png",
    jackHarty: "/images/ucd-2025-jack-harty.png",
    gavinLopez: "/images/ucd-2025-gavin-lopez.png",
    bentleySly: "/images/ucd-2025-bentley-sly.png",
  },

  // UCD 2024 wrestler photos and action shots
  ucd2024Wrestlers: {
    // Action shots
    johnsonAction: "/images/ucd-johnson.png",
    chitavongAction: "/images/ucd-chitavong.png",
    quincyAction: "/images/ucd-quincy.png",
    // Team results
    leaderboard: "/images/ucd-2024-leaderboard.png",
    dualResults: "/images/ucd-2024-dual-results.png",
  },

  // Gallery photos (can be expanded as more are added)
  gallery: {
    nhsca2025: [],
    ucd2025: [],
    ucd2024: [],
  },
} as const

/**
 * Helper function to get image path by category and key
 */
export function getImage(category: keyof typeof imageMapping, key: string): string {
  const categoryImages = imageMapping[category] as Record<string, string>
  return categoryImages[key] || "/images/placeholder.svg"
}

/**
 * Export flat list of all images for migration/verification
 */
export const allImages = Object.entries(imageMapping).flatMap(([category, images]) => {
  if (Array.isArray(images)) return []
  return Object.entries(images).map(([key, path]) => ({
    category,
    key,
    path,
  }))
})
