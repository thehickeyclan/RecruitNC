import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"

type MomentBase = {
  id: string
  caption: string
  aspectClass?: string
  /** Default: both teams / all scopes */
  team?: "national" | "select" | "both"
}

export type NhscaDualsPhotoMoment = MomentBase & {
  type: "photo"
  photoSrc: string
  alt: string
}

export type NhscaDualsVideoMoment = MomentBase & {
  type: "video"
  videoSrc: string
  /** Optional MP4 for Chrome/Android — add when converted from iPhone .mov */
  mp4Src?: string
  ariaLabel: string
}

export type NhscaDualsTournamentMoment = NhscaDualsPhotoMoment | NhscaDualsVideoMoment

export const NHSCA_DUALS_2026_DAY3_WARMUP_PHOTO =
  "/national-team/nhsca-duals-2026/day-3-both-teams-warmup.png"

export const NHSCA_DUALS_2026_LAST_MATCH_MATSIDE_PHOTO =
  "/national-team/nhsca-duals-2026/both-teams-matside-last-match.png"

export const NHSCA_DUALS_2026_MAC_JOHNSON_RECOVERING_PHOTO =
  "/national-team/nhsca-duals-2026/mac-johnson-recovering.png"

export const NHSCA_DUALS_2026_JEKAI_SEDGWICK_BIRTHDAY_PHOTO =
  "/national-team/nhsca-duals-2026/jekai-sedgwick-birthday-day-2.png"

export const NHSCA_DUALS_2026_DAY2_TEAM_DINNER_PHOTO =
  "/national-team/nhsca-duals-2026/day-2-team-dinner.png"

export const NHSCA_DUALS_2026_COLTON_PALMER_DAY2_RECAP_VIDEO =
  "/national-team/nhsca-duals-2026/videos/colton-palmer-day-2-recap.mov"

export const NHSCA_DUALS_2026_MOW_TOBIN_DANNY_VIDEO =
  "/national-team/nhsca-duals-2026/videos/mow-tobin-danny.mov"

export const NHSCA_DUALS_2026_XAN_JAXON_INTERVIEW_VIDEO =
  "/national-team/nhsca-duals-2026/videos/xan-moody-jaxon-thomas-interview.mov"

export const NHSCA_DUALS_2026_XAN_MOODY_HIGHLIGHT_REEL_VIDEO =
  "/national-team/nhsca-duals-2026/videos/xan-moody-highlight-reel.mov"

export const NHSCA_DUALS_2026_NC_UNITED_APPAREL_VIDEO =
  "/national-team/nhsca-duals-2026/videos/nc-united-apparel.mov"

export const NHSCA_DUALS_2026_APPAREL_VIDEO_MOMENT: NhscaDualsVideoMoment = {
  id: "nc-united-apparel",
  type: "video",
  videoSrc: NHSCA_DUALS_2026_NC_UNITED_APPAREL_VIDEO,
  caption:
    'NC United team apparel — official "Pepsi" and "Pinstripes" singlets, plus black long sleeve, shorts, and tee',
  ariaLabel: "NC United NHSCA Duals 2026 team apparel including Pepsi and Pinstripes singlets",
  aspectClass: "aspect-[9/16] sm:aspect-video max-w-2xl mx-auto",
}

export const NHSCA_DUALS_2026_MOW_VIDEO_MOMENT: NhscaDualsVideoMoment = {
  id: "mow-tobin-danny-video",
  type: "video",
  videoSrc: NHSCA_DUALS_2026_MOW_TOBIN_DANNY_VIDEO,
  caption: "Tobin McNair and Danny McDermott — NC United Most Outstanding Wrestlers",
  ariaLabel: "Highlight video of Tobin McNair and Danny McDermott, NHSCA Duals 2026 Most Outstanding Wrestlers",
  aspectClass: "aspect-[9/16] sm:aspect-video max-w-2xl mx-auto",
}

export const NHSCA_DUALS_2026_TOURNAMENT_MOMENTS: NhscaDualsTournamentMoment[] = [
  {
    id: "day-2-palmer-recap",
    type: "video",
    videoSrc: NHSCA_DUALS_2026_COLTON_PALMER_DAY2_RECAP_VIDEO,
    caption: "Head Coach Colton Palmer recapping a phenomenal Day 2",
    ariaLabel: "Head Coach Colton Palmer recaps NC United Day 2 at NHSCA Duals 2026",
    aspectClass: "aspect-[9/16] sm:aspect-video max-w-2xl mx-auto",
  },
  {
    id: "jekai-sedgwick-birthday",
    type: "photo",
    team: "national",
    photoSrc: NHSCA_DUALS_2026_JEKAI_SEDGWICK_BIRTHDAY_PHOTO,
    caption: "120 lb National Team birthday boy Jekai Sedgwick turned 17 on May 24 — Day 2",
    alt: "Jekai Sedgwick, NC United National Team 120 lbs, on his 17th birthday at NHSCA Duals 2026",
    aspectClass: "aspect-[3/4] sm:aspect-[4/5] max-w-md mx-auto",
  },
  {
    id: "day-2-team-dinner",
    type: "photo",
    photoSrc: NHSCA_DUALS_2026_DAY2_TEAM_DINNER_PHOTO,
    caption: "Team dinner celebrating a great Day 2 for both squads",
    alt: "NC United National and Select teams at team dinner after Day 2 at NHSCA Duals 2026",
    aspectClass: "aspect-[3/4] sm:aspect-[4/5] max-w-2xl mx-auto",
  },
  {
    id: "day-3-warmup",
    type: "photo",
    photoSrc: NHSCA_DUALS_2026_DAY3_WARMUP_PHOTO,
    caption: "Day 3 National and Select Team post warm-up",
    alt: "NC United National and Select teams together after warm-up on Day 3 at NHSCA Duals 2026",
    aspectClass: "aspect-[4/3] sm:aspect-[21/9]",
  },
  {
    id: "mac-johnson-recovering",
    type: "photo",
    team: "national",
    photoSrc: NHSCA_DUALS_2026_MAC_JOHNSON_RECOVERING_PHOTO,
    caption: 'Mac Johnson — "Recovering"',
    alt: "Mac Johnson resting between matches at NHSCA Duals 2026",
    aspectClass: "aspect-[3/4] sm:aspect-[4/5] max-w-md mx-auto",
  },
  {
    id: "last-match-matside",
    type: "photo",
    photoSrc: NHSCA_DUALS_2026_LAST_MATCH_MATSIDE_PHOTO,
    caption: "Both teams mat side supporting the last match of the tournament",
    alt: "NC United National and Select teams mat side at the final match of NHSCA Duals 2026",
    aspectClass: "aspect-[4/3] sm:aspect-[21/9]",
  },
]

/** Filter moments by page team scope. */
export function tournamentMomentsForScope(scope: CommandCenterScope): NhscaDualsTournamentMoment[] {
  return NHSCA_DUALS_2026_TOURNAMENT_MOMENTS.filter((m) => {
    const team = m.team ?? "both"
    if (team === "both") return true
    if (scope === "all") return true
    return scope === team
  })
}
