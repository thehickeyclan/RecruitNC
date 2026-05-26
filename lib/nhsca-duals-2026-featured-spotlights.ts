import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"

export type NhscaDualsFeaturedSpotlight = {
  id: string
  wrestler: string
  weightClass: string
  team: "national" | "select"
  photoSrc: string
  caption: string
  /** CSS object-position for portrait action shots */
  objectPosition?: string
}

export const NHSCA_DUALS_2026_FEATURED_SPOTLIGHTS: NhscaDualsFeaturedSpotlight[] = [
  {
    id: "danny-mcdermott-day-2",
    wrestler: "Danny McDermott",
    weightClass: "120",
    team: "select",
    photoSrc: "/national-team/nhsca-duals-2026/danny-mcdermott-day-2-big-win.png",
    caption: "Danny McDermott with a big win over NY state champion Andrew Juliano on Day 2",
    objectPosition: "center 30%",
  },
  {
    id: "keyshon-morrison-hwt",
    wrestler: "Keyshon Morrison",
    weightClass: "HWT",
    team: "national",
    photoSrc: "/national-team/nhsca-duals-2026/featured-keyshon-morrison-hwt.png",
    caption:
      "Keyshon Morrison (HWT) goes 6-2 on the weekend with big wins against NHSCA champions and All-Americans.",
    objectPosition: "center 8%",
  },
]

export function featuredSpotlightsForScope(scope: CommandCenterScope): NhscaDualsFeaturedSpotlight[] {
  if (scope === "all") return NHSCA_DUALS_2026_FEATURED_SPOTLIGHTS
  return NHSCA_DUALS_2026_FEATURED_SPOTLIGHTS.filter((s) => s.team === scope)
}
