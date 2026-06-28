import {
  AAU_SCHOLASTIC_DUALS_2026_YEAR,
  AAU_SCHOLASTIC_DUALS_EVENT_LABEL,
  AAU_SCHOLASTIC_DUALS_2026_PROFILE_HIGHLIGHT_LABEL,
  getAauScholasticDuals2026ProfileHighlightVideoSrcs,
  resolveAauScholasticRosterNameForProfile,
} from "@/lib/aau-scholastic-duals-2026-profile"
import {
  NHSCA_DUALS_2026_ATHLETE_MEDIA,
  type NhscaDualsAthleteMediaItem,
} from "@/lib/nhsca-duals-2026-athlete-media"
import { NHSCA_DUALS_2026_YEAR, NHSCA_DUALS_NATIONAL_EVENT_LABEL } from "@/lib/national-team-live-profile-results"
import { namesMatchRoster } from "@/lib/nhsca-duals-wrestler-card-stats"

export type ProfileNationalTeamHighlight = {
  event: string
  year: number
  title: string
  videoSrc: string
  ariaLabel: string
}

function nameMatchesMediaItem(nameBases: string[], item: NhscaDualsAthleteMediaItem): boolean {
  const athletes = item.athletes ?? []
  if (!athletes.length) return false
  return athletes.some((athleteName) =>
    nameBases.some((base) => {
      const trimmed = base.trim()
      return trimmed && namesMatchRoster(trimmed, athleteName)
    })
  )
}

function nhscaHighlightFromMedia(item: NhscaDualsAthleteMediaItem): ProfileNationalTeamHighlight | null {
  if (item.type !== "video" || item.category !== "highlight") return null
  return {
    event: NHSCA_DUALS_NATIONAL_EVENT_LABEL,
    year: NHSCA_DUALS_2026_YEAR,
    title: item.caption,
    videoSrc: item.videoSrc,
    ariaLabel: item.ariaLabel,
  }
}

/** NC United national-team highlight reels for unified / view-profile (NHSCA Duals + AAU Scholastic). */
export function getNationalTeamProfileHighlights(
  athleteId: string,
  nameBases: string[]
): ProfileNationalTeamHighlight[] {
  const items: ProfileNationalTeamHighlight[] = []
  const seen = new Set<string>()

  const aauRosterName = resolveAauScholasticRosterNameForProfile(athleteId, nameBases)
  const matchNames = [...nameBases]
  if (aauRosterName && !matchNames.includes(aauRosterName)) matchNames.push(aauRosterName)

  for (const media of NHSCA_DUALS_2026_ATHLETE_MEDIA) {
    if (!nameMatchesMediaItem(matchNames, media)) continue
    const highlight = nhscaHighlightFromMedia(media)
    if (!highlight || seen.has(highlight.videoSrc)) continue
    seen.add(highlight.videoSrc)
    items.push(highlight)
  }

  const aauVideoSrcs = getAauScholasticDuals2026ProfileHighlightVideoSrcs(athleteId, nameBases)
  const rosterName = aauRosterName ?? "NC United athlete"
  for (const videoSrc of aauVideoSrcs) {
    if (seen.has(videoSrc)) continue
    seen.add(videoSrc)
    items.push({
      event: AAU_SCHOLASTIC_DUALS_EVENT_LABEL,
      year: AAU_SCHOLASTIC_DUALS_2026_YEAR,
      title: AAU_SCHOLASTIC_DUALS_2026_PROFILE_HIGHLIGHT_LABEL,
      videoSrc,
      ariaLabel: `${AAU_SCHOLASTIC_DUALS_2026_PROFILE_HIGHLIGHT_LABEL} — ${rosterName}`,
    })
  }

  return items
}
