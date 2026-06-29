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
    wrestler: "Xan Moody",
    weightLabel: "106+5",
    record: "7-5",
    summaryBullets: [
      "6 BIG wins over state placers",
      "Georgia state 3rd place",
      "Nebraska & Iowa state placers (5th)",
      "Missouri, South Dakota & Maryland placers",
    ],
    summaryNote:
      "Xan's 7-5 run at 106 included BIG wins over state placers from Missouri, Georgia, Nebraska, Iowa, South Dakota, and Maryland — a nationally strong schedule for the lightest weight in the lineup.",
    wins: [
      {
        opponentName: "Zane Homan",
        state: "Missouri",
        credentials: "Missouri State Placer (6th)",
        boutOpponentKeys: ["Z. Homan", "Homan"],
      },
      {
        opponentName: "Kian Green",
        state: "Georgia",
        credentials: "Georgia State Placer (3rd)",
        boutOpponentKeys: ["K. Green", "Green"],
      },
      {
        opponentName: "Wyatt Anderson",
        state: "Nebraska",
        credentials: "Nebraska State Placer (5th)",
        boutOpponentKeys: ["W. Anderson", "Anderson"],
      },
      {
        opponentName: "Hudson Cox",
        state: "Iowa",
        credentials: "Iowa State Placer (5th)",
        boutOpponentKeys: ["H. Cox", "Cox"],
      },
      {
        opponentName: "Macyn Gardner",
        state: "South Dakota",
        credentials: "South Dakota State Placer (4th)",
        boutOpponentKeys: ["M. Gardner", "Gardner"],
      },
      {
        opponentName: "Daniel Stefko",
        state: "Maryland",
        credentials: "Maryland State Placer (8th)",
        boutOpponentKeys: ["D. Stefko", "Stefko"],
      },
    ],
  },
  {
    wrestler: "Aiden Burkholder",
    weightLabel: "113+5",
    record: "8-4",
    summaryBullets: [
      "5 BIG wins over state placers",
      "Georgia state champion (William Hughes)",
      "Nebraska 2025 4th · 2026 state champion (Robinson)",
      "2 Florida state placers (4th & 7th)",
      "South Dakota state 3rd place",
    ],
    summaryNote:
      "Aiden's 8-4 run at 113 included BIG wins over a Georgia state champion, Nebraska 2025 4th-place finisher and 2026 state champion Kamden Robinson, Florida placers, and South Dakota 3rd-place finisher Rhys Truman.",
    wins: [
      {
        opponentName: "William Hughes",
        state: "Georgia",
        credentials: "Georgia State Champion (2026)",
        boutOpponentKeys: ["W. Hughes", "Hughes"],
      },
      {
        opponentName: "Kamden Robinson",
        state: "Nebraska",
        credentials: "Nebraska 2025 State 4th place · 2026 State Champion",
        boutOpponentKeys: ["K. Robinson", "Robinson"],
      },
      {
        opponentName: "Dylan Presman",
        state: "Florida",
        credentials: "Florida State Placer (7th)",
        boutOpponentKeys: ["D. Presman", "Presman"],
      },
      {
        opponentName: "Rhys Truman",
        state: "South Dakota",
        credentials: "South Dakota State Placer (3rd)",
        boutOpponentKeys: ["R. Truman", "Truman"],
      },
      {
        opponentName: "James Sanders",
        state: "Florida",
        credentials: "Florida State Placer (4th)",
        boutOpponentKeys: ["J. Sanders", "Sanders"],
      },
    ],
  },
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
    wrestler: "Paxton Kearns",
    weightLabel: "126+5",
    record: "8-4",
    summaryBullets: [
      "6 BIG wins over state placers & qualifiers",
      "Nebraska state champion (Noah Boyer)",
      "2 Florida state 3rd-place finishes",
      "Georgia state 3rd place",
      "Iowa state 4th place",
    ],
    summaryNote:
      "Paxton's 8-4 run at 126 included BIG wins over a Nebraska state champion, Florida placers and a state qualifier, a Georgia 3rd-place finisher, and an Iowa 4th-place finisher.",
    wins: [
      {
        opponentName: "Erik Perez",
        state: "Florida",
        credentials: "Florida State Placer (3rd)",
        boutOpponentKeys: ["E. Perez", "Perez"],
      },
      {
        opponentName: "Noah Boyer",
        state: "Nebraska",
        credentials: "Nebraska State Champion",
        boutOpponentKeys: ["N. Boyer", "Boyer"],
      },
      {
        opponentName: "Jayden Buehler",
        state: "Georgia",
        credentials: "Georgia State Placer (3rd)",
        boutOpponentKeys: ["J. Buehler", "Buehler"],
      },
      {
        opponentName: "Carter Rivera",
        state: "Florida",
        credentials: "Florida State Placer (3rd)",
        boutOpponentKeys: ["C. Rivera", "Rivera"],
      },
      {
        opponentName: "Sieryous Peterson",
        state: "Florida",
        credentials: "Florida State Qualifier",
        boutOpponentKeys: ["S. Peterson", "Peterson"],
      },
      {
        opponentName: "Waylon Logue",
        state: "Iowa",
        credentials: "Iowa State Placer (4th)",
        boutOpponentKeys: ["W. Logue", "Logue"],
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
    wrestler: "Tye Johnson",
    weightLabel: "138+5",
    record: "11-1",
    summaryBullets: [
      "7 BIG wins over state placers",
      "Referees' Choice Tournament MOW",
      "South Dakota state runner-up (Sesler)",
      "Georgia state 3rd place",
      "2 Florida placers · Michigan, Maryland & Pennsylvania",
    ],
    summaryNote:
      "Tye's 11-1 run at 138 — and Referees' Choice Tournament MOW honors — included BIG wins over placers from Georgia, Florida (two), Michigan, South Dakota, Maryland, and Pennsylvania, including NHSCA All-American and Lehigh commit Reef Dillard.",
    wins: [
      {
        opponentName: "Gavin Austin",
        state: "Georgia",
        credentials: "Georgia State Placer (3rd)",
        boutOpponentKeys: ["G. Austin", "Austin"],
      },
      {
        opponentName: "Nevan Irving",
        state: "Florida",
        credentials: "Florida State Placer (6th)",
        boutOpponentKeys: ["N. Irving", "Irving"],
      },
      {
        opponentName: "Gable Majcher",
        state: "Michigan",
        credentials: "Michigan State Placer (4th)",
        boutOpponentKeys: ["G. Majcher", "Majcher"],
      },
      {
        opponentName: "DeVonne Sesler",
        state: "South Dakota",
        credentials: "South Dakota State Placer (2nd)",
        boutOpponentKeys: ["D. Sesler", "Sesler"],
      },
      {
        opponentName: "Deegan Woomer",
        state: "Maryland",
        credentials: "Maryland State Placer (5th)",
        boutOpponentKeys: ["D. Woomer", "Woomer"],
      },
      {
        opponentName: "Devyn Hicks",
        state: "Florida",
        credentials: "Florida State Placer (7th)",
        boutOpponentKeys: ["D. Hicks", "Hicks"],
      },
      {
        opponentName: "Reef Dillard",
        state: "Pennsylvania",
        credentials: "Pennsylvania State Placer (5th) · NHSCA All-American · Lehigh Commit",
        boutOpponentKeys: ["R. Dillard", "Dillard"],
      },
    ],
  },
  {
    wrestler: "Jake Amiott",
    weightLabel: "144+5",
    record: "10-2",
    summaryBullets: [
      "7 BIG wins over state placers",
      "Georgia state finalist",
      "2× Michigan state placer",
      "Nebraska, Iowa, South Dakota & Maryland placers",
    ],
    summaryNote:
      "Jake's 10-2 run at 144 included BIG wins over a Georgia state finalist, a 2× Michigan state placer, and placers from Nebraska, Iowa (two), South Dakota, and Maryland.",
    wins: [
      {
        opponentName: "Ashton Kuchar",
        state: "Nebraska",
        credentials: "Nebraska State Placer (4th)",
        boutOpponentKeys: ["A. Kuchar", "Kuchar"],
      },
      {
        opponentName: "Caden Greiner",
        state: "Iowa",
        credentials: "Iowa State Placer (4th)",
        boutOpponentKeys: ["C. Greiner", "Greiner"],
      },
      {
        opponentName: "Cane Smolarsky",
        state: "Georgia",
        credentials: "Georgia State Finalist",
        boutOpponentKeys: ["C. Smolarsky", "C. Smolarksy", "Smolarsky", "Smolarksy"],
      },
      {
        opponentName: "Xander Courneya",
        state: "Michigan",
        credentials: "2× Michigan State Placer",
        boutOpponentKeys: ["X. Courneya", "Courneya"],
      },
      {
        opponentName: "Aidyn Roman",
        state: "Iowa",
        credentials: "Iowa State Placer (7th)",
        boutOpponentKeys: ["A. Roman", "Roman"],
      },
      {
        opponentName: "Langdon Klinkhammer",
        state: "South Dakota",
        credentials: "South Dakota State Placer (4th)",
        boutOpponentKeys: ["L. Klinkhammer", "Klinkhammer"],
      },
      {
        opponentName: "William McDonough",
        state: "Maryland",
        credentials: "Maryland State Placer (4th)",
        boutOpponentKeys: ["W. McDonough", "McDonough"],
      },
    ],
  },
  {
    wrestler: "Jacob Perry",
    weightLabel: "150+5",
    record: "9-3",
    summaryBullets: [
      "6 BIG wins over state placers & qualifiers",
      "3× Nebraska state placer (Gavin Cheek)",
      "Missouri & Michigan state placers",
      "Florida state placers (2)",
      "Maryland state qualifier",
    ],
    summaryNote:
      "Jacob's 9-3 run at 150 included BIG wins over a 3× Nebraska state placer, a 3× Missouri state qualifier who placed 6th, Michigan 3rd-place finisher Gage Turnblom, and Florida placers — plus Maryland state qualifier Carter Knott.",
    wins: [
      {
        opponentName: "Connor McBride",
        state: "Missouri",
        credentials: "3× Missouri State Qualifier · State Placer (6th)",
        boutOpponentKeys: ["C. McBride", "McBride"],
      },
      {
        opponentName: "Gavin Cheek",
        state: "Nebraska",
        credentials: "3× Nebraska State Placer (2nd, 3rd, 6th)",
        boutOpponentKeys: ["G. Cheek", "Cheek"],
      },
      {
        opponentName: "Jayden Rivas",
        state: "Florida",
        credentials: "Florida State Placer (8th)",
        boutOpponentKeys: ["J. Rivas", "Rivas"],
      },
      {
        opponentName: "Dylan Fernandez",
        state: "Florida",
        credentials: "2× Florida State Qualifier · State Placer (4th)",
        boutOpponentKeys: ["D. Fernandez", "Fernandez"],
      },
      {
        opponentName: "Carter Knott",
        state: "Maryland",
        credentials: "Maryland State Qualifier",
        boutOpponentKeys: ["C. Knott", "Knott"],
      },
      {
        opponentName: "Gage Turnblom",
        state: "Michigan",
        credentials: "Michigan State Placer (3rd)",
        boutOpponentKeys: ["G. Turnblom", "Turnblom"],
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
    wrestler: "Tobin McNair",
    weightLabel: "165+5",
    record: "10-2",
    summaryBullets: [
      "6 BIG wins over state placers & champions",
      "2× Michigan state champion (Zane Willobee)",
      "Maryland state champion · 2× state placer",
      "Florida state finalist & placer",
      "Missouri & Nebraska state placers",
    ],
    summaryNote:
      "Tobin's 10-2 run at 165 included BIG wins over a 3× Missouri state placer, a Nebraska state placer, 2× Michigan state champion Zane Willobee, Florida placers and a state finalist, and Maryland state champion Leo Foreman.",
    wins: [
      {
        opponentName: "Eli Homan",
        state: "Missouri",
        credentials: "3× Missouri State Placer",
        boutOpponentKeys: ["E. Homan", "Homan"],
      },
      {
        opponentName: "Brenden Ging",
        state: "Nebraska",
        credentials: "Nebraska State Placer (4th)",
        boutOpponentKeys: ["B. Ging", "Ging"],
      },
      {
        opponentName: "Zane Willobee",
        state: "Michigan",
        credentials: "2× Michigan State Champion",
        boutOpponentKeys: ["Z. Willobee", "Willobee", "Willowbee"],
      },
      {
        opponentName: "Tyler Grey",
        state: "Florida",
        credentials: "Florida State Placer (7th)",
        boutOpponentKeys: ["T. Grey", "Grey"],
      },
      {
        opponentName: "Leo Foreman",
        state: "Maryland",
        credentials: "Maryland State Champion · 2× State Placer",
        boutOpponentKeys: ["L. Foreman", "Foreman"],
      },
      {
        opponentName: "Konstantin Khaspekian",
        state: "Florida",
        credentials: "Florida State Finalist",
        boutOpponentKeys: ["K. Khaspekian", "Khaspekian"],
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
  {
    wrestler: "Gavin Lopez",
    weightLabel: "215+5",
    record: "10-2",
    summaryBullets: [
      "6 BIG wins over state placers",
      "2 Georgia state placers (5th)",
      "Nebraska state 4th place",
      "Missouri, Michigan & Iowa placers",
    ],
    summaryNote:
      "Gavin's 10-2 run at 215 included BIG wins over placers from Missouri, Georgia (two), Nebraska, Michigan, and Iowa — a strong upper-weight schedule across the country.",
    wins: [
      {
        opponentName: "Kaden Updike",
        state: "Missouri",
        credentials: "Missouri State Placer (6th)",
        boutOpponentKeys: ["K. Updike", "Updike"],
      },
      {
        opponentName: "Zachary White",
        state: "Georgia",
        credentials: "Georgia State Placer (5th)",
        boutOpponentKeys: ["Z. White", "White"],
      },
      {
        opponentName: "Brody Brandt",
        state: "Nebraska",
        credentials: "Nebraska State Placer (4th)",
        boutOpponentKeys: ["B. Brandt", "Brandt", "Brandit"],
      },
      {
        opponentName: "Elijah Sanford",
        state: "Georgia",
        credentials: "Georgia State Placer (5th)",
        boutOpponentKeys: ["E. Sanford", "Sanford"],
      },
      {
        opponentName: "Maddox Mayer",
        state: "Michigan",
        credentials: "Michigan State Placer (5th)",
        boutOpponentKeys: ["M. Mayer", "Mayer"],
      },
      {
        opponentName: "Ethan Miller",
        state: "Iowa",
        credentials: "Iowa State Placer (5th)",
        boutOpponentKeys: ["E. Miller", "Miller"],
      },
    ],
  },
  {
    wrestler: "Mason Hocker",
    weightLabel: "HWT",
    record: "2-5",
    summaryBullets: [
      "Quality win over Florida state qualifier",
      "Fall vs Jakari Johnson",
    ],
    summaryNote:
      "Mason's quality win at heavyweight came via fall over Florida state qualifier Jakari Johnson at the AAU Scholastic Duals.",
    wins: [
      {
        opponentName: "Jakari Johnson",
        state: "Florida",
        credentials: "Florida State Qualifier",
        boutOpponentKeys: ["J. Johnson", "Jakari Johnson"],
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

/** Match one bout log to a curated quality win (use enriched entry). */
export function matchQualityWinToBout(
  bout: { matchNumber: number; opponentWrestler: string; resultLine: string },
  entry: AauScholasticWrestlerQualityWins,
): AauScholasticQualityWin | null {
  for (const win of entry.wins) {
    const keys = win.boutOpponentKeys ?? [win.opponentName]
    if (!boutKeyMatches(bout.opponentWrestler, keys)) continue
    if (win.matchNumber != null && win.matchNumber !== bout.matchNumber) continue
    if (win.resultLine && win.resultLine !== bout.resultLine) continue
    return win
  }
  return null
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

export type AauScholasticQualityWinTier = "champion" | "placer" | "qualifier" | "other"

/** Highest credential tier for a curated quality win (one bucket per win). */
export function classifyAauQualityWinCredential(credentials: string): AauScholasticQualityWinTier {
  const c = credentials.toLowerCase()
  if (/state champion|state champ\b/.test(c)) return "champion"
  if (
    /state placer|state finalist|\bplaced\b|\(\d+(?:st|nd|rd|th)\)|state \d+(?:st|nd|rd|th)|place finisher/.test(c)
  ) {
    return "placer"
  }
  if (/qualifier|state qual\b/.test(c)) return "qualifier"
  return "other"
}

export type AauScholasticQualityWinsSummary = {
  wrestlerCount: number
  totalWins: number
  vsStateChampions: number
  vsStatePlacers: number
  vsStateQualifiers: number
  other: number
}

export function summarizeAauScholasticQualityWins(
  entries: AauScholasticWrestlerQualityWins[] = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS,
): AauScholasticQualityWinsSummary {
  let totalWins = 0
  let vsStateChampions = 0
  let vsStatePlacers = 0
  let vsStateQualifiers = 0
  let other = 0

  for (const entry of entries) {
    for (const win of entry.wins) {
      totalWins++
      const tier = classifyAauQualityWinCredential(win.credentials)
      if (tier === "champion") vsStateChampions++
      else if (tier === "placer") vsStatePlacers++
      else if (tier === "qualifier") vsStateQualifiers++
      else other++
    }
  }

  return {
    wrestlerCount: entries.length,
    totalWins,
    vsStateChampions,
    vsStatePlacers,
    vsStateQualifiers,
    other,
  }
}
