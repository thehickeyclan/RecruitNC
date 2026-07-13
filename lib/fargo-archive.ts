/**
 * Static Fargo archive metadata and team summaries (2023–2026).
 * Individual wrestler rows come from `fargo_results` in Supabase.
 */

export const FARGO_EVENT_NAME = "US Marine Corps National Championships (Fargo)"
export const FARGO_CURRENT_YEAR = 2026
export const FARGO_ARCHIVE_YEARS = [2026, 2025, 2024, 2023] as const
export type FargoArchiveYear = (typeof FARGO_ARCHIVE_YEARS)[number]

export type FargoDivisionKey = "16U" | "Junior"

export type FargoTeamSummary = {
  year: number
  division: FargoDivisionKey
  divisionLabel: string
  wrestlers: number
  wins: number
  losses: number
  winPct: string
  wrestlersWithWin: number
  pctWithWin: string
  allAmericans: number
}

export type FargoHighlight = {
  athleteName: string
  weight: string
  record: string
  placement?: string
  blurb: string
}

const DIVISION_LABELS: Record<FargoDivisionKey, string> = {
  "16U": "16U Boys Freestyle",
  Junior: "Junior Boys Freestyle",
}

/** Team-level stats from fargo_*_summary.csv */
export const FARGO_TEAM_SUMMARIES: FargoTeamSummary[] = [
  { year: 2023, division: "16U", divisionLabel: DIVISION_LABELS["16U"], wrestlers: 13, wins: 10, losses: 26, winPct: "28%", wrestlersWithWin: 6, pctWithWin: "46%", allAmericans: 0 },
  { year: 2024, division: "16U", divisionLabel: DIVISION_LABELS["16U"], wrestlers: 18, wins: 29, losses: 36, winPct: "45%", wrestlersWithWin: 10, pctWithWin: "56%", allAmericans: 0 },
  { year: 2025, division: "16U", divisionLabel: DIVISION_LABELS["16U"], wrestlers: 29, wins: 33, losses: 58, winPct: "36%", wrestlersWithWin: 15, pctWithWin: "52%", allAmericans: 0 },
  { year: 2026, division: "16U", divisionLabel: DIVISION_LABELS["16U"], wrestlers: 15, wins: 35, losses: 31, winPct: "53%", wrestlersWithWin: 11, pctWithWin: "73%", allAmericans: 3 },
  { year: 2023, division: "Junior", divisionLabel: DIVISION_LABELS.Junior, wrestlers: 23, wins: 38, losses: 47, winPct: "45%", wrestlersWithWin: 17, pctWithWin: "74%", allAmericans: 0 },
  { year: 2024, division: "Junior", divisionLabel: DIVISION_LABELS.Junior, wrestlers: 24, wins: 31, losses: 48, winPct: "39%", wrestlersWithWin: 20, pctWithWin: "83%", allAmericans: 0 },
  { year: 2025, division: "Junior", divisionLabel: DIVISION_LABELS.Junior, wrestlers: 30, wins: 33, losses: 60, winPct: "35%", wrestlersWithWin: 19, pctWithWin: "63%", allAmericans: 0 },
  { year: 2026, division: "Junior", divisionLabel: DIVISION_LABELS.Junior, wrestlers: 20, wins: 24, losses: 40, winPct: "38%", wrestlersWithWin: 12, pctWithWin: "60%", allAmericans: 0 },
]

export const FARGO_2026_16U_AAS: FargoHighlight[] = [
  { athleteName: "Braylen Yates", weight: "175", record: "5-2", placement: "4th", blurb: "Four straight to the semis before a deep consolation run to 4th." },
  { athleteName: "Devin Hord", weight: "120", record: "6-2", placement: "5th", blurb: "Champ-side wins and a deep consolation run into 5th place." },
  { athleteName: "Jake Amiott", weight: "144", record: "6-3", placement: "8th", blurb: "Breakout year — from 2-2 in 2025 to an 8th-place All-American." },
]

export const FARGO_2026_16U_NEAR_MISS: FargoHighlight[] = [
  { athleteName: "Mitchell Rowland", weight: "150", record: "4-2", blurb: "One win short of the podium in the bloodround." },
  { athleteName: "Aaron Ruiz-Angel", weight: "215", record: "4-2", blurb: "Improved from 3-2 in 2025; still one win short of AA." },
]

export const FARGO_2026_JUNIOR_TOP: FargoHighlight[] = [
  {
    athleteName: "Bentley Sly",
    weight: "157",
    record: "6-2",
    blurb: "Deepest Junior run of the four-year window — bloodround, one win short of AA.",
  },
  { athleteName: "Carson Raper", weight: "113", record: "5-2", blurb: "Moved up from 16U after a 4-2 run in 2025." },
]

export function isFargoArchiveYear(value: number): value is FargoArchiveYear {
  return (FARGO_ARCHIVE_YEARS as readonly number[]).includes(value)
}

export function getFargoTeamSummary(year: number, division: FargoDivisionKey): FargoTeamSummary | undefined {
  return FARGO_TEAM_SUMMARIES.find((s) => s.year === year && s.division === division)
}

export function getFargoHistoricalYears(): FargoArchiveYear[] {
  return FARGO_ARCHIVE_YEARS.filter((y) => y !== FARGO_CURRENT_YEAR)
}

export function fargoYearHref(year: number): string {
  return year === FARGO_CURRENT_YEAR ? "/fargo" : `/fargo/${year}`
}

export const NC_NAVY = "#002147"
export const NC_RED = "#B31B1B"
export const NC_GOLD = "#CBAF5D"
