/**
 * AAU Scholastic Duals 2026 — public results page data.
 * Set `published: false` to show the coming-soon state.
 */
import { AAU_SCHOLASTIC_DUALS_2026 } from "@/lib/aau-scholastic-duals-2026-content"

export const AAU_SCHOLASTIC_DUALS_2026_RESULTS_PATH = "/national-team/aau-scholastic-duals-2026-results"

export const AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED = true

export type AauScholasticDualResult = {
  matchNumber?: number
  opponent: string
  result: "W" | "L"
  ourScore: number
  opponentScore: number
  notes?: string
}

export type AauScholasticWinTypes = {
  falls: number
  techFalls: number
  majorDecisions: number
  decisions: number
  forfeits: number
  injuryDefault: number
  totalWins: number
}

export type AauScholasticIndividualResult = {
  wrestler: string
  weightLabel: string
  wins: number
  losses: number
  grossPts: number
  allowedPts: number
  netPts: number
  bonusWins: number
  highSchool?: string
  notes?: string
}

export type AauScholasticGalleryImage = {
  src: string
  alt: string
  caption?: string
}

export type AauScholasticMowSpotlight = {
  wrestler: string
  title: string
  record?: string
  description: string
  imageSrc?: string
  imageAlt?: string
}

export const AAU_SCHOLASTIC_DUALS_2026_MOW_SPOTLIGHTS: AauScholasticMowSpotlight[] = [
  {
    wrestler: "Mac Johnson",
    title: "All Star Division Most Outstanding Wrestler",
    record: "12-0",
    description:
      "Mac went a perfect 12-0 with a team-high +65 net points, six falls, and 11 bonus wins — earning the All Star Division MOW honor and the AAU Varsity District Division Most Outstanding Wrestler award.",
    imageSrc: "/images/aau-scholastic-2026-results/mac-johnson-team-mow-plaque.png",
    imageAlt: "Mac Johnson with AAU Scholastic Duals Most Outstanding Wrestler plaque and medals",
  },
  {
    wrestler: "Tye Johnson",
    title: "Referees' Choice Tournament Most Outstanding Wrestler",
    record: "11-1",
    description:
      "Tye’s dominant weekend included a team-high six tech falls, 10 bonus wins, and +49 net team points — recognized by the officiating crew as the tournament’s Referees’ Choice MOW.",
  },
  {
    wrestler: "Aaron Ellison",
    title: "Undefeated · 12-0",
    record: "12-0",
    description:
      "Aaron matched Mac with a flawless 12-0 run at 157+5, posting +54 net team points with nine bonus wins in his first NC United national-team trip.",
    imageSrc: "/images/aau-scholastic-2026-results/mac-johnson-aaron-ellison-undefeated.png",
    imageAlt: "Mac Johnson and Aaron Ellison with AAU championship medals and rings",
  },
]

export const AAU_SCHOLASTIC_DUALS_2026_RESULTS_META = {
  headline: "NC United Takes 2nd in Gold Pool at AAU Scholastic Duals 2026",
  subheadline: "11-1 overall · 9-0 pool play · Team trophy · Fort Lauderdale",
  badge: "AAU Scholastic Duals 2026",
  dates: AAU_SCHOLASTIC_DUALS_2026.datesLabel,
  location: AAU_SCHOLASTIC_DUALS_2026.location,
  venue: AAU_SCHOLASTIC_DUALS_2026.venue,
  placement: "2nd Place · Gold Pool",
  teamRecord: "11-1",
  individualRecord: "127-36",
  teamWinPct: "92%",
  individualWinPct: "77.9%",
  heroImage: "/images/aau-scholastic-2026-results/team-victory-photo.png",
  heroImageAlt: "NC United National Team victory photo — AAU Scholastic Duals 2026, 2nd Place Gold Pool",
  newsArticlePath: "/news/aau-scholastic-duals-2026-florida",
  infoPagePath: AAU_SCHOLASTIC_DUALS_2026.infoPath,
} as const

export const AAU_SCHOLASTIC_DUALS_2026_TEAM_SUMMARY = {
  dualRecord: "11-1",
  poolPlay: "9-0",
  goldPool: "2-1",
  goldPoolPlacement: "2nd Place",
  /** Dual meet team scoring (includes open-weight forfeits). */
  teamPointsScored: 619,
  teamPointsAllowed: 176,
  pointDifferential: 443,
  /** Totals from assigned wrestlers only — open-weight forfeits not charged to individuals. */
  individualGrossPoints: 619,
  individualPointsAllowed: 148,
  individualNetPoints: 471,
  individualRecord: "127-36",
  individualWinPct: 77.9,
} as const

export const AAU_SCHOLASTIC_INDIVIDUAL_STATS_FOOTNOTE =
  "Open-weight forfeits against NC are not charged to any individual wrestler."

export const AAU_SCHOLASTIC_DUALS_2026_WIN_TYPES: AauScholasticWinTypes = {
  falls: 40,
  techFalls: 32,
  majorDecisions: 18,
  decisions: 25,
  forfeits: 11,
  injuryDefault: 1,
  totalWins: 127,
}

export const AAU_SCHOLASTIC_DUALS_2026_TEAM_TROPHY = {
  placement: "2nd Place",
  division: "Gold Pool · All Star Division",
  event: "AAU Scholastic Duals Team Championships",
  location: "Fort Lauderdale, Florida",
  imageSrc: "/images/aau-scholastic-2026-results/gold-pool-second-place-trophy.png",
  imageAlt: "NC United AAU Scholastic Duals team trophy — 2nd Place Gold Pool",
  caption:
    "NC United brought home the team tournament trophy — 2nd place in Gold Pool after an 11-1 dual record and a perfect 9-0 pool-play run.",
} as const

export const AAU_SCHOLASTIC_DUALS_2026_TEAM_VICTORY_PHOTO = {
  imageSrc: "/images/aau-scholastic-2026-results/team-victory-photo.png",
  imageAlt:
    "NC United National Team under the AAU Wrestling arch with team trophy and medals — 2nd Place Gold Pool, Fort Lauderdale 2026",
  caption:
    "NC United National Team · 2nd Place Gold Pool · AAU Scholastic Duals 2026 · Fort Lauderdale",
} as const

export const AAU_SCHOLASTIC_DUALS_2026_DAY1_HIGHLIGHTS_VIDEO = {
  videoSrc: "/national-team/aau-scholastic-duals-2026/videos/day-1-highlights.mov",
  title: "Day 1 Highlights",
  caption: "NC United National Team · AAU Scholastic Duals 2026 · Fort Lauderdale",
  ariaLabel: "NC United Day 1 highlights video — AAU Scholastic Duals 2026",
} as const

export const AAU_SCHOLASTIC_DUALS_2026_DAY2_HIGHLIGHTS_VIDEO = {
  videoSrc: "/national-team/aau-scholastic-duals-2026/videos/day-2-highlights.mov",
  title: "Day 2 Highlights",
  caption: "NC United National Team · AAU Scholastic Duals 2026 · Fort Lauderdale",
  ariaLabel: "NC United Day 2 highlights video — AAU Scholastic Duals 2026",
} as const

export const AAU_SCHOLASTIC_DUALS_2026_HIGHLIGHT_VIDEOS = [
  AAU_SCHOLASTIC_DUALS_2026_DAY1_HIGHLIGHTS_VIDEO,
  AAU_SCHOLASTIC_DUALS_2026_DAY2_HIGHLIGHTS_VIDEO,
] as const

export const AAU_SCHOLASTIC_DUALS_2026_RECAP_PARAGRAPHS: string[] = [
  "NC United closed its fifth national-team trip with an 11-1 dual record and a 2nd-place Gold Pool finish at the 2026 AAU Scholastic Duals in Fort Lauderdale — a 9-0 sweep through pool play and a 2-1 Gold Pool run capped by a team tournament trophy.",
  "The squad outscored opponents 619–176 (+443) in dual meet team scoring. Assigned wrestlers went 127-36 (77.9% win rate) with 619 gross team points, 148 allowed, and +471 net — open-weight forfeits against NC are not charged to any individual.",
  "Mac Johnson (12-0, +65 net team points) earned All Star Division Most Outstanding Wrestler and AAU Varsity District Division MOW honors. Aaron Ellison matched him at 12-0 (+54). Tye Johnson (11-1) was named Referees' Choice Tournament Most Outstanding Wrestler with a team-high six tech falls. Bonus-point wrestling carried the weekend: 40 falls, 32 tech falls, and 18 major decisions among 127 bout wins.",
  "The lone dual setback came in the Gold Pool finals against MAWA Blue (20-38). Every other opponent fell, including statement wins over Nebraska Magic, Iowa Black, Team Michigan Blue, and a one-point thriller over Spec Ops (27-26).",
]

export const AAU_SCHOLASTIC_DUALS_2026_DUALS: AauScholasticDualResult[] = [
  { matchNumber: 1, opponent: "Team STL Black", result: "W", ourScore: 54, opponentScore: 15, notes: "Pool play" },
  { matchNumber: 2, opponent: "Jefferson Wrestling Club", result: "W", ourScore: 60, opponentScore: 9, notes: "Pool play" },
  { matchNumber: 3, opponent: "Nebraska Magic", result: "W", ourScore: 63, opponentScore: 10, notes: "Pool play" },
  { matchNumber: 4, opponent: "The Outsiders", result: "W", ourScore: 66, opponentScore: 6, notes: "Pool play" },
  { matchNumber: 5, opponent: "War Ready Black", result: "W", ourScore: 60, opponentScore: 9, notes: "Pool play" },
  { matchNumber: 6, opponent: "Team Michigan Blue 86 AS", result: "W", ourScore: 41, opponentScore: 13, notes: "Pool play" },
  { matchNumber: 7, opponent: "Lugo Wrestling Club", result: "W", ourScore: 59, opponentScore: 7, notes: "Pool play" },
  { matchNumber: 8, opponent: "Iowa Black", result: "W", ourScore: 63, opponentScore: 9, notes: "Pool play" },
  { matchNumber: 9, opponent: "SD Blue", result: "W", ourScore: 63, opponentScore: 10, notes: "Pool play" },
  { matchNumber: 10, opponent: "Team Diamond Fish All Star", result: "W", ourScore: 43, opponentScore: 24, notes: "Gold Pool" },
  { matchNumber: 11, opponent: "Spec Ops", result: "W", ourScore: 27, opponentScore: 26, notes: "Gold Pool" },
  { matchNumber: 12, opponent: "MAWA Blue", result: "L", ourScore: 20, opponentScore: 38, notes: "Gold Pool · Finals" },
]

/** Sorted by net team points (highest first). */
export const AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS: AauScholasticIndividualResult[] = [
  {
    wrestler: "Mac Johnson",
    weightLabel: "132+5",
    wins: 12,
    losses: 0,
    grossPts: 65,
    allowedPts: 0,
    netPts: 65,
    bonusWins: 11,
    notes: "All Star Division MOW · AAU Varsity District Division MOW · 12-0 · 6 falls · +65 net",
  },
  {
    wrestler: "Aaron Ellison",
    weightLabel: "157+5",
    wins: 12,
    losses: 0,
    grossPts: 54,
    allowedPts: 0,
    netPts: 54,
    bonusWins: 9,
    notes: "Undefeated · 12-0 · 2 falls · 3 TF",
  },
  {
    wrestler: "Tye Johnson",
    weightLabel: "138+5",
    wins: 11,
    losses: 1,
    grossPts: 55,
    allowedPts: 6,
    netPts: 49,
    bonusWins: 10,
    notes: "Referees' Choice MOW · 6 TF (team high)",
  },
  {
    wrestler: "Tobin McNair",
    weightLabel: "165+5",
    wins: 10,
    losses: 2,
    grossPts: 53,
    allowedPts: 9,
    netPts: 44,
    bonusWins: 9,
    notes: "5 falls",
  },
  {
    wrestler: "Luke Richards",
    weightLabel: "120+5",
    wins: 10,
    losses: 2,
    grossPts: 48,
    allowedPts: 8,
    netPts: 40,
    bonusWins: 8,
  },
  {
    wrestler: "Gavin Lopez",
    weightLabel: "215+5",
    wins: 10,
    losses: 2,
    grossPts: 51,
    allowedPts: 11,
    netPts: 40,
    bonusWins: 8,
    notes: "4 falls",
  },
  {
    wrestler: "Jake Amiott",
    weightLabel: "144+5",
    wins: 10,
    losses: 2,
    grossPts: 46,
    allowedPts: 7,
    netPts: 39,
    bonusWins: 7,
    notes: "4 falls",
  },
  {
    wrestler: "Jacob Perry",
    weightLabel: "150+5",
    wins: 9,
    losses: 3,
    grossPts: 44,
    allowedPts: 12,
    netPts: 32,
    bonusWins: 8,
    notes: "5 TF",
  },
  {
    wrestler: "Luke Padgett",
    weightLabel: "190+5",
    wins: 9,
    losses: 3,
    grossPts: 43,
    allowedPts: 13,
    netPts: 30,
    bonusWins: 6,
    notes: "3 falls",
  },
  {
    wrestler: "Fares Alkurdasi",
    weightLabel: "175+5",
    wins: 9,
    losses: 3,
    grossPts: 39,
    allowedPts: 11,
    netPts: 28,
    bonusWins: 7,
    notes: "5 TF",
  },
  {
    wrestler: "Aiden Burkholder",
    weightLabel: "113+5",
    wins: 8,
    losses: 4,
    grossPts: 38,
    allowedPts: 14,
    netPts: 24,
    bonusWins: 6,
    notes: "4 falls",
  },
  {
    wrestler: "Xan Moody",
    weightLabel: "106+5",
    wins: 7,
    losses: 5,
    grossPts: 38,
    allowedPts: 17,
    netPts: 21,
    bonusWins: 7,
    notes: "4 falls",
  },
  {
    wrestler: "Paxton Kearns",
    weightLabel: "126+5",
    wins: 8,
    losses: 4,
    grossPts: 36,
    allowedPts: 18,
    netPts: 18,
    bonusWins: 5,
  },
  {
    wrestler: "Mason Hocker",
    weightLabel: "HWT",
    wins: 2,
    losses: 5,
    grossPts: 9,
    allowedPts: 22,
    netPts: -13,
    bonusWins: 1,
  },
]

export const AAU_SCHOLASTIC_DUALS_2026_GALLERY: AauScholasticGalleryImage[] = [
  {
    src: "/images/aau-scholastic-2026-results/team-victory-photo.png",
    alt: "NC United team victory photo under AAU Wrestling arch",
    caption: "Team victory · 2nd Place Gold Pool · Fort Lauderdale",
  },
  {
    src: "/images/aau-scholastic-2026-results/gold-pool-second-place-trophy.png",
    alt: "NC United AAU Scholastic Duals team trophy — 2nd Place Gold Pool",
    caption: "Team tournament trophy · 2nd Place · Gold Pool",
  },
  {
    src: "/images/aau-scholastic-2026-results/mac-johnson-team-mow-plaque.png",
    alt: "Mac Johnson — AAU Scholastic Duals Most Outstanding Wrestler",
    caption: "Mac Johnson · All Star Division MOW · AAU Varsity District Division",
  },
  {
    src: "/images/aau-scholastic-2026-results/mac-johnson-mow-medals.png",
    alt: "Mac Johnson with AAU championship medals and ring",
    caption: "Mac Johnson · 12-0 · Fort Lauderdale",
  },
  {
    src: "/images/aau-scholastic-2026-results/mac-johnson-aaron-ellison-undefeated.png",
    alt: "Mac Johnson and Aaron Ellison with championship medals",
    caption: "Mac Johnson & Aaron Ellison · both 12-0",
  },
  {
    src: "/images/aau-scholastic-2026-news/aau-scholastic-duals-2026-banner.png",
    alt: "NC United National Team — AAU Scholastic Duals 2026",
    caption: "NC United · Fort Lauderdale 2026",
  },
]

export function sortAauDuals(duals: AauScholasticDualResult[]): AauScholasticDualResult[] {
  return [...duals].sort((a, b) => (a.matchNumber ?? 999) - (b.matchNumber ?? 999))
}

/** Numeric sort key for lineup order (106 … 215, HWT last). */
export function aauIndividualWeightSortKey(weightLabel: string): number {
  const u = weightLabel.trim().toUpperCase()
  if (u === "HWT") return 285
  const match = /^(\d+)/.exec(weightLabel.trim())
  return match ? parseInt(match[1], 10) : 999
}

/** Individual results in standard lineup order — not net-points leaderboard order. */
export function sortAauIndividualsByWeight(
  individuals: readonly AauScholasticIndividualResult[],
): AauScholasticIndividualResult[] {
  return [...individuals].sort(
    (a, b) => aauIndividualWeightSortKey(a.weightLabel) - aauIndividualWeightSortKey(b.weightLabel),
  )
}

export function aauIndividualWinPct(individuals: AauScholasticIndividualResult[]): number | null {
  let w = 0
  let l = 0
  for (const r of individuals) {
    w += r.wins
    l += r.losses
  }
  const total = w + l
  if (total === 0) return null
  return Math.round((w / total) * 1000) / 10
}

export function countUndefeated(individuals: AauScholasticIndividualResult[]): number {
  return individuals.filter((r) => r.losses === 0 && r.wins > 0).length
}

export function sumAauIndividualStats(individuals: AauScholasticIndividualResult[]) {
  return individuals.reduce(
    (acc, r) => ({
      wins: acc.wins + r.wins,
      losses: acc.losses + r.losses,
      grossPts: acc.grossPts + r.grossPts,
      allowedPts: acc.allowedPts + r.allowedPts,
      netPts: acc.netPts + r.netPts,
    }),
    { wins: 0, losses: 0, grossPts: 0, allowedPts: 0, netPts: 0 }
  )
}
