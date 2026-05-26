import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsVideoMoment } from "@/lib/nhsca-duals-2026-tournament-moments"
import {
  NHSCA_DUALS_2026_JAXON_THOMAS_HIGHLIGHT_REEL_VIDEO,
  NHSCA_DUALS_2026_XAN_JAXON_INTERVIEW_VIDEO,
  NHSCA_DUALS_2026_XAN_MOODY_HIGHLIGHT_REEL_VIDEO,
} from "@/lib/nhsca-duals-2026-tournament-moments"

export type NhscaDualsAthleteMediaCategory = "interview" | "highlight"

export type NhscaDualsAthleteMediaItem = NhscaDualsVideoMoment & {
  category: NhscaDualsAthleteMediaCategory
  /** Default: both teams / all scopes */
  team?: "national" | "select" | "both"
  /** Wrestler names for labels and future search */
  athletes?: string[]
}

/** Interviews & highlight reels — add new entries here as media is uploaded. */
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
  return category === "interview" ? "Interview" : "Highlight reel"
}
