import {
  AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS,
  AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED,
} from "@/lib/aau-scholastic-duals-2026-results"
import { AAU_SCHOLASTIC_DUALS_2026_WRESTLER_CARDS } from "@/lib/aau-scholastic-duals-2026-wrestler-cards"
import { AAU_SCHOLASTIC_DUALS_2026_PROFILE_OVERRIDES } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"
import type { ProfileNationalTeamResult } from "@/lib/national-team-live-profile-results"
import { namesMatchRoster } from "@/lib/nhsca-duals-wrestler-card-stats"

export const AAU_SCHOLASTIC_DUALS_EVENT_LABEL = "AAU Scholastic Duals"
export const AAU_SCHOLASTIC_DUALS_2026_YEAR = 2026

/** Resolve AAU roster wrestler name for a public profile (override pin or name match). */
export function resolveAauScholasticRosterNameForProfile(
  athleteId: string,
  nameBases: string[]
): string | null {
  for (const [displayName, id] of Object.entries(AAU_SCHOLASTIC_DUALS_2026_PROFILE_OVERRIDES)) {
    if (id === athleteId) return displayName
  }

  for (const row of AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS) {
    for (const base of nameBases) {
      const trimmed = base.trim()
      if (!trimmed) continue
      if (namesMatchRoster(trimmed, row.wrestler)) return row.wrestler
    }
  }

  return null
}

/** Published AAU Scholastic Duals 2026 individual record for NC United profile table. */
export function getAauScholasticDuals2026ProfileResults(
  athleteId: string,
  nameBases: string[]
): ProfileNationalTeamResult[] {
  if (!AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED) return []

  const rosterName = resolveAauScholasticRosterNameForProfile(athleteId, nameBases)
  if (!rosterName) return []

  const row = AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS.find((r) => r.wrestler === rosterName)
  if (!row) return []

  const bouts = row.wins + row.losses
  return [
    {
      event: AAU_SCHOLASTIC_DUALS_EVENT_LABEL,
      year: AAU_SCHOLASTIC_DUALS_2026_YEAR,
      record: `${row.wins}-${row.losses}`,
      isPlaceholder: bouts === 0,
    },
  ]
}

export function getAauScholasticDuals2026ProfileHighlightVideoSrc(
  athleteId: string,
  nameBases: string[]
): string | null {
  if (!AAU_SCHOLASTIC_DUALS_2026_RESULTS_PUBLISHED) return null

  const rosterName = resolveAauScholasticRosterNameForProfile(athleteId, nameBases)
  if (!rosterName) return null

  const card = AAU_SCHOLASTIC_DUALS_2026_WRESTLER_CARDS.find((c) => c.wrestler === rosterName)
  return card?.highlightVideoSrc?.trim() || null
}
