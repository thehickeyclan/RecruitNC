import {
  AAU_SCHOLASTIC_DUALS_2026_DUALS,
  AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS,
  type AauScholasticDualResult,
} from "@/lib/aau-scholastic-duals-2026-results"
import { getAauIndividualBoutLogsForWrestler } from "@/lib/aau-scholastic-duals-2026-dual-bouts"

export type AauScholasticQualityWin = {
  opponentName: string
  state: string
  credentials: string
  /** Bout tracker abbreviations used to attach result lines from dual bout logs. */
  boutOpponentKeys?: string[]
  matchNumber?: number
  resultLine?: string
  opponentTeam?: string
}

export type AauScholasticWrestlerQualityWins = {
  wrestler: string
  weightLabel: string
  record: string
  summaryBullets: string[]
  summaryNote: string
  wins: AauScholasticQualityWin[]
}

/** Curated quality-win credentials — result lines enriched from dual bout exports when available. */
export const AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS: AauScholasticWrestlerQualityWins[] = [
  {
    wrestler: "Mac Johnson",
    weightLabel: "132+5",
    record: "12-0",
    summaryBullets: [
      "1 State Champion",
      "1 International Medalist (U17 Pan Am Bronze)",
      "3 Multi-time State Placers",
      "2 State Qualifiers",
      "1 State Placer",
    ],
    summaryNote:
      "A very strong undefeated run spanning Missouri, Nebraska, Georgia, Michigan, Iowa, South Dakota, and Pennsylvania.",
    wins: [
      {
        opponentName: "Connor Stephans",
        state: "Missouri",
        credentials: "2× Missouri State Qualifier",
        boutOpponentKeys: ["C. Stephans", "Stephans"],
      },
      {
        opponentName: "Zach Held",
        state: "Nebraska",
        credentials: "Nebraska State Champion · 3× Nebraska State Placer",
        boutOpponentKeys: ["Z. Held", "Held"],
      },
      {
        opponentName: "Cane Smolarsky",
        state: "Georgia",
        credentials: "2× Georgia State Placer",
        boutOpponentKeys: ["C. Smolarsky", "Smolarsky", "Smolarksy"],
      },
      {
        opponentName: "Logan Christopher",
        state: "Michigan",
        credentials: "2× Michigan State Placer",
        boutOpponentKeys: ["L. Christopher", "Christopher"],
      },
      {
        opponentName: "Will Smith",
        state: "Iowa",
        credentials: "Iowa State Qualifier",
        boutOpponentKeys: ["W. Smith IV", "W. Smith", "Smith"],
      },
      {
        opponentName: "Karson Vessells",
        state: "South Dakota",
        credentials: "South Dakota State Placer",
        boutOpponentKeys: ["K. Vessells", "Vessells"],
      },
      {
        opponentName: "Tripp Watson",
        state: "Pennsylvania",
        credentials: "Pennsylvania State Qualifier",
        boutOpponentKeys: ["T. Watson", "Watson"],
      },
      {
        opponentName: "Andrew Gomez",
        state: "Pennsylvania",
        credentials: "U17 Pan American Championships Freestyle Bronze Medalist",
        boutOpponentKeys: ["A. Gomez", "Gomez"],
      },
    ],
  },
]

function boutKeyMatches(boutAbbrev: string, keys: string[]): boolean {
  const norm = boutAbbrev.trim().toLowerCase()
  return keys.some((k) => {
    const key = k.trim().toLowerCase()
    return norm === key || norm.includes(key) || key.includes(norm)
  })
}

/** Attach match number, dual opponent, and result line from Mac's bout log when credentials align. */
export function enrichAauQualityWins(
  entry: AauScholasticWrestlerQualityWins,
  duals: readonly AauScholasticDualResult[] = AAU_SCHOLASTIC_DUALS_2026_DUALS,
): AauScholasticWrestlerQualityWins {
  const boutLogs = getAauIndividualBoutLogsForWrestler(
    entry.wrestler,
    duals,
    AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS,
  )

  const wins = entry.wins.map((win) => {
    const keys = win.boutOpponentKeys ?? [win.opponentName]
    const bout = boutLogs.find((b) => boutKeyMatches(b.opponentWrestler, keys))
    if (!bout) return win

    return {
      ...win,
      matchNumber: bout.matchNumber,
      resultLine: bout.resultLine,
      opponentTeam: bout.opponentTeam,
    }
  })

  return { ...entry, wins }
}

export function getAauScholasticQualityWinsForWrestler(wrestler: string): AauScholasticWrestlerQualityWins | null {
  const entry = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === wrestler)
  return entry ? enrichAauQualityWins(entry) : null
}

export function getAauScholasticQualityWinsEnriched(): AauScholasticWrestlerQualityWins[] {
  return AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.map((entry) => enrichAauQualityWins(entry))
}
