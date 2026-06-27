/** Shared manifesto copy — landing page, invites, social. Fan marketing only. */

import { TOC_EVENT_DATES_DISPLAY, TOC_MATS_LINE, TOC_SATURDAY_COMPETITION_DATE } from "@/lib/toc/constants"

export const TOC_HERO = {
  eventName: "Tournament of Champions",
  /** Locked hero stack — tagline = stakes + single-mat finals; buckleUp = emotional punch; lead = format detail. */
  tagline: "The Best in the State. One Mat. One Question.",
  buckleUp: "North Carolina, buckle up. The brackets are stacked.",
  lead: `Eleven weight classes. Eight wrestlers each. The best North Carolina has — and nobody else. College weights. Stacked brackets. ${TOC_MATS_LINE} This isn't another bracket to grind through.`,
  showLine: "Under the lights. Eleven champions.",
} as const

export const TOC_TAGLINE_BANK = [
  "North Carolina, buckle up.",
  "The brackets are stacked.",
  "By invitation only.",
  "One mat. One champion. No excuses.",
  "The best in the state. In one building.",
  "You don't enter. You get the call.",
  "College weights. Stacked draws. Single-mat finals.",
  "Under the lights. Eleven champions.",
] as const

/** Phase 2 athlete invitation — Resend templates can import these. */
export const TOC_ATHLETE_INVITE = {
  subjectOptions: [
    "You're invited. (That's not a word we use lightly.)",
    "The call you've been working for.",
    "North Carolina's best. You're one of them.",
  ],
  bodyIntro: (firstName: string, weightClass: number | string) =>
    `${firstName} —\n\nThis isn't a registration link. It's an invitation.\n\nThe NC United Tournament of Champions is invite-only — eight wrestlers per weight, the best this state has at ${weightClass} lbs. We built the field by hand, and your name is on it.`,
  bodyDetails:
    "Here's what you're walking into: college weights, stacked brackets, no easy draws. True double-elimination with top-four placement — two mats until the titles. And if you make the finals, you wrestle on one mat under the lights for a championship jacket and a title that only means something because of who you had to beat to get it.",
  bodyClose: "We think you belong here. Confirm your spot below.",
} as const

export const TOC_SOCIAL_POSTS = {
  tease:
    "Something's coming for North Carolina wrestling.\nInvitation only. The best at every weight. One mat. One champion.\n09.18.26. Buckle up.",
  reveal:
    `Introducing the NC United Tournament of Champions.\n11 weight classes, 8 elite wrestlers each · College weights · Invitation only · Two mats until finals\nThe best in the state, in one building. ${TOC_EVENT_DATES_DISPLAY}.`,
  showAngle:
    "Other tournaments are something you compete in.\nThis is something you come to watch.\nGreat wrestling. Great entertainment. One mat when it matters.",
  stakes:
    "When the brackets drop, you'll understand.\nNo easy roads. No soft draws. Every weight, stacked top to bottom.\nIf you're in this field, you earned it.",
} as const
