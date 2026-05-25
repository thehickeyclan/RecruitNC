import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"

export type NhscaDualsFeaturedSpotlight = {
  id: string
  wrestler: string
  weightClass: string
  team: "national" | "select"
  photoSrc: string
  caption: string
}

export const NHSCA_DUALS_2026_FEATURED_SPOTLIGHTS: NhscaDualsFeaturedSpotlight[] = [
  {
    id: "keyshon-morrison-hwt",
    wrestler: "Keyson Morrison",
    weightClass: "HWT",
    team: "national",
    photoSrc: "/national-team/nhsca-duals-2026/featured-keyshon-morrison-hwt.png",
    caption:
      "Keyson Morrison (HWT) goes 6-2 on the weekend with big wins against NHSCA champions and All-Americans.",
  },
]

export function featuredSpotlightsForScope(scope: CommandCenterScope): NhscaDualsFeaturedSpotlight[] {
  if (scope === "all") return NHSCA_DUALS_2026_FEATURED_SPOTLIGHTS
  return NHSCA_DUALS_2026_FEATURED_SPOTLIGHTS.filter((s) => s.team === scope)
}
