/** Shared responsive spacing for public unified / view-profile sections. */
export const PROFILE_SECTION_HEADER =
  "bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-4 lg:p-6"

export const PROFILE_SECTION_TITLE = "text-lg lg:text-2xl font-bold text-white"

export const PROFILE_CARD_BODY = "profile-card-body p-4 md:p-6 lg:p-8"

/** Flex order: mobile recruiter-first, desktop original document order. */
export const PROFILE_SECTION_ORDER = {
  hero: "order-first lg:order-first",
  nav: "order-2 lg:order-none",
  nationalResults: "order-3 lg:order-4",
  /** NCHSAA/States sits with tournament block; desktop order after national. */
  nchsaaStates: "order-3 lg:order-4",
  qualityWins: "order-4 lg:order-5",
  highlights: "order-5 lg:order-8",
  bio: "order-6 lg:order-2",
  programs: "order-7 lg:order-3",
  academics: "order-8 lg:order-6",
  collegeOpens: "order-9 lg:order-9",
  achievements: "order-10 lg:order-10",
  inSeason: "order-11 lg:order-11",
  /** Inline weight editor — after nav when open. */
  weightEdit: "order-[2] lg:order-[2]",
  /** Must stay after all profile sections (default order:0 would float above the hero). */
  requestEdit: "order-[98] lg:order-[98]",
  footer: "order-[99] lg:order-[99]",
} as const
