import {
  AAU_SCHOLASTIC_DUALS_2026_YEAR,
  AAU_SCHOLASTIC_DUALS_EVENT_LABEL,
  getAauScholasticDuals2026ProfileQualityWins,
} from "@/lib/aau-scholastic-duals-2026-profile"
import { AAU_SCHOLASTIC_DUALS_2026_RESULTS_PATH } from "@/lib/aau-scholastic-duals-2026-results"
import type { AauScholasticWrestlerQualityWins } from "@/lib/aau-scholastic-duals-2026-quality-wins"

/** One documented quality win on a public profile. */
export type ProfileQualityWinRow = {
  opponentName: string
  state: string
  credentials: string
  resultLine?: string
  opponentTeam?: string
}

/** Quality wins from one tournament — add new blocks in `getProfileQualityWins`. */
export type ProfileQualityWinsTournamentBlock = {
  /** Stable id, e.g. `aau-scholastic-duals-2026`. */
  id: string
  eventLabel: string
  year: number
  weightLabel: string
  record: string
  wins: ProfileQualityWinRow[]
  summaryBullets: string[]
  summaryNote: string
  /** Optional link to full results page for this event. */
  resultsPath?: string
  resultsLinkLabel?: string
}

function blockFromAauScholasticDuals2026(entry: AauScholasticWrestlerQualityWins): ProfileQualityWinsTournamentBlock {
  return {
    id: "aau-scholastic-duals-2026",
    eventLabel: `${AAU_SCHOLASTIC_DUALS_EVENT_LABEL} ${AAU_SCHOLASTIC_DUALS_2026_YEAR}`,
    year: AAU_SCHOLASTIC_DUALS_2026_YEAR,
    weightLabel: entry.weightLabel,
    record: entry.record,
    wins: entry.wins.map((win) => ({
      opponentName: win.opponentName,
      state: win.state,
      credentials: win.credentials,
      resultLine: win.resultLine,
      opponentTeam: win.opponentTeam,
    })),
    summaryBullets: entry.summaryBullets,
    summaryNote: entry.summaryNote,
    resultsPath: AAU_SCHOLASTIC_DUALS_2026_RESULTS_PATH,
    resultsLinkLabel: "Full AAU Scholastic Duals 2026 results →",
  }
}

/**
 * All quality-win tournament blocks for a public profile (newest first).
 * Add future sources here (NHSCA Duals, Super32, NCHSAA, etc.).
 */
export function getProfileQualityWins(athleteId: string, nameBases: string[]): ProfileQualityWinsTournamentBlock[] {
  const blocks: ProfileQualityWinsTournamentBlock[] = []

  const aau = getAauScholasticDuals2026ProfileQualityWins(athleteId, nameBases)
  if (aau?.wins.length) {
    blocks.push(blockFromAauScholasticDuals2026(aau))
  }

  return blocks.sort((a, b) => b.year - a.year || a.eventLabel.localeCompare(b.eventLabel))
}

export function profileQualityWinCount(blocks: ProfileQualityWinsTournamentBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.wins.length, 0)
}
