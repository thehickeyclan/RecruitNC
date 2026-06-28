/** Shared responsive spacing for public unified / view-profile sections. */
export const PROFILE_SECTION_HEADER =
  "bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-4 lg:p-6"

export const PROFILE_SECTION_TITLE = "text-lg lg:text-2xl font-bold text-white"

export const PROFILE_CARD_BODY = "profile-card-body p-4 md:p-6 lg:p-8"

/** Flex order: mobile recruiter-first, desktop original document order. */
export const PROFILE_SECTION_ORDER = {
  hero: "order-1 lg:order-1",
  nav: "order-2 lg:order-none",
  nationalResults: "order-3 lg:order-4",
  highlights: "order-4 lg:order-7",
  bio: "order-5 lg:order-2",
  programs: "order-6 lg:order-3",
  contact: "order-7 lg:order-5",
  academics: "order-8 lg:order-6",
  collegeOpens: "order-9 lg:order-8",
  achievements: "order-10 lg:order-9",
  inSeason: "order-11 lg:order-10",
} as const
