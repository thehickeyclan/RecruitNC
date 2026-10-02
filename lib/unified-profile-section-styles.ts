/** Shared responsive spacing for public unified / view-profile sections. */
/**
 * Section headers in the banner's language (Matt, 1 Oct 2026): flat, a gold icon and a heavy
 * uppercase title over a hairline - not the gradient bar, which read as an admin panel under the
 * banner.
 */
export const PROFILE_SECTION_HEADER =
  "border-b border-white/10 bg-transparent px-4 pb-3 pt-4 lg:px-7 lg:pb-4 lg:pt-6"

export const PROFILE_SECTION_TITLE = "text-base lg:text-xl font-black uppercase tracking-[0.06em] text-white"

export const PROFILE_CARD_BODY = "profile-card-body p-4 md:p-6 lg:p-8"

/**
 * Flex order, the same on phone and desktop: who he is, then the jump links, a short bio and the
 * video, then the folkstyle record in one run - in-state (Tournament of Champions, then NCHSAA
 * States), national, significant wins, the season log - then school and honours, and Freestyle &
 * Greco-Roman last (Matt). The claim prompt and edit request sit at the foot of the page.
 * Every child of the profile column needs a class: an unclassed one computes to order 0 and
 * floats above the jump links.
 */
export const PROFILE_SECTION_ORDER = {
  hero: "order-first",
  nav: "order-[1]",
  /** Viewer-specific panels (recruiting views, scouting report link, profile stats, edit forms). */
  panels: "order-[2]",
  profileViews: "order-[2]",
  weightEdit: "order-[2]",
  bio: "order-[3]",
  highlights: "order-[4]",
  nationalResults: "order-[5]",
  /** Kept for callers: the NCHSAA block now renders inside the tournament results slot. */
  nchsaaStates: "order-[5]",
  qualityWins: "order-[6]",
  inSeason: "order-[7]",
  programs: "order-[8]",
  academics: "order-[9]",
  collegeOpens: "order-[10]",
  achievements: "order-[11]",
  olympicStyles: "order-[12]",
  claim: "order-[97]",
  requestEdit: "order-[98]",
  footer: "order-[99]",
} as const
