import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"

/** NHSCA Duals 2026 team photos under public/national-team/nhsca-duals-2026/ */

export const NHSCA_DUALS_2026_SELECT_TEAM_PHOTO =
  "/national-team/nhsca-duals-2026/select-team-photo.png"

export const NHSCA_DUALS_2026_NATIONAL_TEAM_PHOTO =
  "/national-team/nhsca-duals-2026/national-team-photo.png"

export const NHSCA_DUALS_2026_BOTH_TEAMS_PHOTO =
  "/national-team/nhsca-duals-2026/both-teams-photo.png"

export const NHSCA_DUALS_2026_BOTH_TEAMS_WARMUP_PHOTO =
  "/national-team/nhsca-duals-2026/day-3-both-teams-warmup.png"

export const NHSCA_DUALS_2026_MAIN_BANNER_PHOTO =
  "/national-team/nhsca-duals-2026/main-banner-both-teams.png"

/** Wide journey-card hero — portrait team shot needs a higher focal point than banner hero. */
export const NHSCA_DUALS_2026_NATIONAL_JOURNEY_CARD_PHOTO: NhscaDualsHeroTeamPhoto = {
  src: NHSCA_DUALS_2026_NATIONAL_TEAM_PHOTO,
  alt: "NC United National Team at NHSCA Duals 2026",
  objectPosition: "center 36%",
}

export type NhscaDualsHeroTeamPhoto = {
  src: string
  alt: string
  /** CSS object-position — portrait team shots need a lower focal point. */
  objectPosition: string
}

/** Banner hero image per team filter — avoids ceiling-only crops on portrait photos. */
export function heroTeamPhotoForScope(scope: CommandCenterScope): NhscaDualsHeroTeamPhoto {
  if (scope === "national") {
    return {
      src: NHSCA_DUALS_2026_NATIONAL_TEAM_PHOTO,
      alt: "NC United National Team at NHSCA Duals 2026",
      objectPosition: "center 78%",
    }
  }
  if (scope === "select") {
    return {
      src: NHSCA_DUALS_2026_SELECT_TEAM_PHOTO,
      alt: "NC United Select Team at NHSCA Duals 2026",
      objectPosition: "center 72%",
    }
  }
  return {
    src: NHSCA_DUALS_2026_MAIN_BANNER_PHOTO,
    alt: "NC United National and Select teams together at NHSCA Duals 2026",
    objectPosition: "center 72%",
  }
}
