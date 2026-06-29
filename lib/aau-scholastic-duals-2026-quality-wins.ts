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
    wrestler: "Luke Richards",
    weightLabel: "120+5",
    record: "10-2",
    summaryBullets: [
      "7 Quality wins over state placers",
      "3 Florida state placers",
      "4× South Dakota state placer (Rylan Robbins)",
      "2× Missouri state placer (Max Rowe)",
      "Georgia & Maryland state placers",
    ],
    summaryNote:
      "Luke's 10-2 run at 120 included wins over placers from Missouri, Georgia, Florida (three), South Dakota, and Maryland — including 4× South Dakota state placer Rylan Robbins and 2× Missouri state placer Max Rowe.",
    wins: [
      {
        opponentName: "Max Rowe",
        state: "Missouri",
        credentials: "2× Missouri State Placer (3rd, 5th)",
        boutOpponentKeys: ["M. Rowe", "Rowe"],
      },
      {
        opponentName: "Anthony Aguayo",
        state: "Georgia",
        credentials: "Georgia State Placer (5th)",
        boutOpponentKeys: ["A. Aguayo", "Aguayo"],
      },
      {
        opponentName: "Ajani Flanders",
        state: "Florida",
        credentials: "Florida State Placer (5th)",
        boutOpponentKeys: ["A. Flanders", "Flanders"],
      },
      {
        opponentName: "Jan Michael",
        state: "Florida",
        credentials: "Florida State Placer (6th)",
        boutOpponentKeys: ["J. Michael", "Michael"],
      },
      {
        opponentName: "Jaden Morales",
        state: "Florida",
        credentials: "Florida State Placer (6th)",
        boutOpponentKeys: ["J. Morales", "Morales"],
      },
      {
        opponentName: "Rylan Robbins",
        state: "South Dakota",
        credentials: "4× South Dakota State Placer (2nd 2×, 3rd, 6th)",
        boutOpponentKeys: ["R. Robbins", "Robbins"],
      },
      {
        opponentName: "Brandon Wunder",
        state: "Maryland",
        credentials: "Maryland State Placer (3rd)",
        boutOpponentKeys: ["B. Wunder", "Wunder"],
      },
    ],
  },
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
  {
    wrestler: "Aaron Ellison",
    weightLabel: "157+5",
    record: "12-0",
    summaryBullets: [
      "2 State Champions",
      "2 State placer wins (including South Dakota 3rd-place finisher Vincent Lenz)",
      "1 Additional state placer",
      "1 State qualifier",
    ],
    summaryNote:
      "Aaron's undefeated 12-0 run included victories over state champions from Florida and Missouri, multiple state placers, and a Michigan state qualifier — a nationally strong schedule across Florida, Missouri, Nebraska, Michigan, and South Dakota.",
    wins: [
      {
        opponentName: "Vincent Lenz",
        state: "South Dakota",
        credentials: "South Dakota State Placer (3rd)",
        boutOpponentKeys: ["V. Lenz", "Lenz"],
      },
      {
        opponentName: "Gustavo Ferreira",
        state: "Florida",
        credentials: "Florida State Champion",
        boutOpponentKeys: ["G. Ferreira", "Ferreira"],
      },
      {
        opponentName: "Grant Leininger",
        state: "Missouri",
        credentials: "Missouri State Champion",
        boutOpponentKeys: ["G. Leininger", "Leininger"],
      },
      {
        opponentName: "Landon Burt",
        state: "Nebraska",
        credentials: "Nebraska State Placer",
        boutOpponentKeys: ["L. Burt", "Burt"],
      },
      {
        opponentName: "Payton Sampson",
        state: "Michigan",
        credentials: "Michigan State Qualifier",
        boutOpponentKeys: ["P. Sampson", "Sampson"],
      },
    ],
  },
  {
    wrestler: "Fares Alkurdasi",
    weightLabel: "175+5",
    record: "9-3",
    summaryBullets: [
      "3 Quality wins over state placers",
      "Nebraska state finalist",
      "Michigan state finalist",
      "Iowa state 5th place",
    ],
    summaryNote:
      "Fares's big wins at 175 included a Nebraska state finalist, a Michigan state finalist (4th place the year before), and an Iowa state 5th-place finisher — wins over Nebraska Magic, Team Michigan Blue, and Iowa Black.",
    wins: [
      {
        opponentName: "Zander Ferguson",
        state: "Nebraska",
        credentials: "Nebraska State Finalist (2nd)",
        boutOpponentKeys: ["Z. Ferguson", "Ferguson"],
      },
      {
        opponentName: "D'Marion Erlenbeck",
        state: "Michigan",
        credentials: "Michigan State Finalist · 2025 State 4th place",
        boutOpponentKeys: ["D. Erlenbeck", "Erlenbeck"],
      },
      {
        opponentName: "Briggs Collins",
        state: "Iowa",
        credentials: "Iowa State 5th place",
        boutOpponentKeys: ["B. Collins", "Collins"],
      },
    ],
  },
  {
    wrestler: "Luke Padgett",
    weightLabel: "190+5",
    record: "9-3",
    summaryBullets: [
      "5 State placers",
      "Nebraska state runner-up",
      "Michigan state runner-up",
      "Florida state 3rd place",
      "Missouri & Iowa state placers",
    ],
    summaryNote:
      "Luke's quality wins at 190 included placers from Missouri, Nebraska, Florida, Michigan, and Iowa — including Nebraska and Michigan state runners-up.",
    wins: [
      {
        opponentName: "Aiden Timberman",
        state: "Missouri",
        credentials: "Missouri State 4th place",
        boutOpponentKeys: ["A. Timberman", "Timberman"],
      },
      {
        opponentName: "Griffin Bergen",
        state: "Nebraska",
        credentials: "Nebraska State 2nd place",
        boutOpponentKeys: ["G. Bergen", "Bergen"],
      },
      {
        opponentName: "Landon Dickerson",
        state: "Florida",
        credentials: "Florida State 3rd place",
        boutOpponentKeys: ["L. Dickerson", "Dickerson"],
      },
      {
        opponentName: "Zachary Miracle",
        state: "Michigan",
        credentials: "Michigan State 2nd place",
        boutOpponentKeys: ["Z. Miracle", "Miracle"],
      },
      {
        opponentName: "Philip Jacobs",
        state: "Iowa",
        credentials: "Iowa State 8th place",
        boutOpponentKeys: ["P. Jacobs", "Jacobs"],
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

/** Attach match number, dual opponent, and result line from bout logs when credentials align. */
export function enrichAauQualityWins(
  entry: AauScholasticWrestlerQualityWins,
  duals: readonly AauScholasticDualResult[] = AAU_SCHOLASTIC_DUALS_2026_DUALS,
): AauScholasticWrestlerQualityWins {
  const boutLogs = getAauIndividualBoutLogsForWrestler(
    entry.wrestler,
    duals,
    AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS,
  )

  const usedBoutKeys = new Set<string>()

  const wins = entry.wins.map((win) => {
    const keys = win.boutOpponentKeys ?? [win.opponentName]
    const bout = boutLogs.find((b) => {
      if (!boutKeyMatches(b.opponentWrestler, keys)) return false
      const dedupeKey = `${b.matchNumber}-${b.opponentWrestler}-${b.resultLine}`
      if (usedBoutKeys.has(dedupeKey)) return false
      return true
    })
    if (!bout) return win

    usedBoutKeys.add(`${bout.matchNumber}-${bout.opponentWrestler}-${bout.resultLine}`)

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
