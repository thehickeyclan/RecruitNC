import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsTournamentMoment } from "@/lib/nhsca-duals-2026-tournament-moments"
import {
  NHSCA_DUALS_2026_CORY_THOMAS_PORTRAIT_PHOTO,
  NHSCA_DUALS_2026_JAXON_THOMAS_HIGHLIGHT_REEL_VIDEO,
  NHSCA_DUALS_2026_JEKAI_SEDGWICK_HIGHLIGHT_REEL_VIDEO,
  NHSCA_DUALS_2026_AYDEN_SUMNERS_HIGHLIGHT_REEL_VIDEO,
  NHSCA_DUALS_2026_MAC_JOHNSON_PORTRAIT_PHOTO,
  NHSCA_DUALS_2026_SAMMY_GANTT_PORTRAIT_PHOTO,
  NHSCA_DUALS_2026_XAN_JAXON_INTERVIEW_VIDEO,
  NHSCA_DUALS_2026_XAN_MOODY_HIGHLIGHT_REEL_VIDEO,
} from "@/lib/nhsca-duals-2026-tournament-moments"

export type NhscaDualsAthleteMediaCategory = "interview" | "highlight" | "photo"

export type NhscaDualsAthleteMediaItem = NhscaDualsTournamentMoment & {
  category: NhscaDualsAthleteMediaCategory
  /** Default: both teams / all scopes */
  team?: "national" | "select" | "both"
  /** Wrestler names for labels and future search */
  athletes?: string[]
}

/** Interviews, highlight reels & athlete photos — add new entries here as media is uploaded. */
export const NHSCA_DUALS_2026_ATHLETE_MEDIA: NhscaDualsAthleteMediaItem[] = [
  {
    id: "xan-moody-jaxon-thomas-interview",
    type: "video",
    category: "interview",
    team: "national",
    athletes: ["Xan Moody", "Jaxon Thomas"],
    videoSrc: NHSCA_DUALS_2026_XAN_JAXON_INTERVIEW_VIDEO,
    caption: "Xan Moody and Jaxon Thomas — NHSCA Duals 2026 interview",
    ariaLabel: "Interview with National team wrestlers Xan Moody and Jaxon Thomas at NHSCA Duals 2026",
    aspectClass: "aspect-[9/16] sm:aspect-video",
  },
  {
    id: "xan-moody-highlight-reel",
    type: "video",
    category: "highlight",
    team: "national",
    athletes: ["Xan Moody"],
    videoSrc: NHSCA_DUALS_2026_XAN_MOODY_HIGHLIGHT_REEL_VIDEO,
    caption: "Xan Moody — NHSCA Duals 2026 highlight reel",
    ariaLabel: "Highlight reel for National team wrestler Xan Moody at NHSCA Duals 2026",
    aspectClass: "aspect-[9/16] sm:aspect-video",
  },
  {
    id: "jaxon-thomas-highlight-reel",
    type: "video",
    category: "highlight",
    team: "national",
    athletes: ["Jaxon Thomas"],
    videoSrc: NHSCA_DUALS_2026_JAXON_THOMAS_HIGHLIGHT_REEL_VIDEO,
    caption: "Jaxon Thomas — NHSCA Duals 2026 highlight reel",
    ariaLabel: "Highlight reel for National team wrestler Jaxon Thomas at NHSCA Duals 2026",
    aspectClass: "aspect-[9/16] sm:aspect-video",
  },
  {
    id: "jekai-sedgwick-highlight-reel",
    type: "video",
    category: "highlight",
    team: "national",
    athletes: ["Jekai Sedgwick"],
    videoSrc: NHSCA_DUALS_2026_JEKAI_SEDGWICK_HIGHLIGHT_REEL_VIDEO,
    caption: "Jekai Sedgwick — NHSCA Duals 2026 highlight reel",
    ariaLabel: "Highlight reel for National team wrestler Jekai Sedgwick at NHSCA Duals 2026",
    aspectClass: "aspect-[9/16] sm:aspect-video",
  },
  {
    id: "ayden-sumners-highlight-reel",
    type: "video",
    category: "highlight",
    team: "national",
    athletes: ["Ayden Sumners"],
    videoSrc: NHSCA_DUALS_2026_AYDEN_SUMNERS_HIGHLIGHT_REEL_VIDEO,
    caption: "Ayden Sumners — NHSCA Duals 2026 highlight reel",
    ariaLabel: "Highlight reel for National team wrestler Ayden Sumners at NHSCA Duals 2026",
    aspectClass: "aspect-[9/16] sm:aspect-video",
  },
  {
    id: "cory-thomas-portrait",
    type: "photo",
    category: "photo",
    team: "select",
    athletes: ["Cory Thomas"],
    photoSrc: NHSCA_DUALS_2026_CORY_THOMAS_PORTRAIT_PHOTO,
    alt: "Cory Thomas — NC United Select team at NHSCA Duals 2026",
    caption: "Cory Thomas — NHSCA Duals 2026",
    aspectClass: "aspect-[4/5] sm:aspect-[3/4]",
  },
  {
    id: "mac-johnson-portrait",
    type: "photo",
    category: "photo",
    team: "national",
    athletes: ["Mac Johnson"],
    photoSrc: NHSCA_DUALS_2026_MAC_JOHNSON_PORTRAIT_PHOTO,
    alt: "Mac Johnson — NC United National team at NHSCA Duals 2026",
    caption: "Mac Johnson — NHSCA Duals 2026",
    aspectClass: "aspect-[4/5] sm:aspect-[3/4]",
  },
  {
    id: "sammy-gantt-portrait",
    type: "photo",
    category: "photo",
    team: "national",
    athletes: ["Sammy Gantt"],
    photoSrc: NHSCA_DUALS_2026_SAMMY_GANTT_PORTRAIT_PHOTO,
    alt: "Sammy Gantt — NC United National team at NHSCA Duals 2026",
    caption: "Sammy Gantt — NHSCA Duals 2026",
    aspectClass: "aspect-[4/5] sm:aspect-[3/4]",
  },
]

export function athleteMediaForScope(scope: CommandCenterScope): NhscaDualsAthleteMediaItem[] {
  return NHSCA_DUALS_2026_ATHLETE_MEDIA.filter((item) => {
    const team = item.team ?? "both"
    if (team === "both") return true
    if (scope === "all") return true
    return scope === team
  })
}

export function athleteMediaCategoryLabel(category: NhscaDualsAthleteMediaCategory): string {
  if (category === "interview") return "Interview"
  if (category === "highlight") return "Highlight reel"
  return "Photo"
}
