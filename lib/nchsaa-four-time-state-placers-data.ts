/**
 * Curated NCHSAA four-time state placers (placed 1st–6th in four separate state tournaments).
 * Source list pairs career year span with places oldest → newest; tournament years are
 * derived as (endYear − 3) … endYear (e.g. "2022-2026" → 2023–2026).
 */

export type NchsaaStatePlacerEntry = {
  year: number
  place: number
  classification?: string
  weight_class?: string
  school?: string
}

export type NchsaaMultiTimeStatePlacer = {
  wrestler_name: string
  placement_count: number
  placements: NchsaaStatePlacerEntry[]
  schools: string[]
  /** Number of state titles (place === 1) within the placements. */
  championships: number
  years_label?: string
}

type RawFourTimePlacer = {
  name: string
  school: string
  years: string
  placements: number[]
}

function tournamentYearsFromRange(years: string, count: number): number[] {
  const m = years.match(/(\d{4})\s*[-–]\s*(\d{4})/)
  if (!m) return []
  const end = Number(m[2])
  if (!Number.isFinite(end) || count < 1) return []
  return Array.from({ length: count }, (_, i) => end - count + 1 + i)
}

function expandRaw(raw: RawFourTimePlacer): NchsaaMultiTimeStatePlacer {
  const places = raw.placements.filter((p) => Number.isFinite(p) && p >= 1 && p <= 8)
  const years = tournamentYearsFromRange(raw.years, places.length)
  const schoolParts = raw.school
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
  const placements: NchsaaStatePlacerEntry[] = places.map((place, i) => ({
    year: years[i] ?? 0,
    place,
    school: raw.school,
  }))
  return {
    wrestler_name: raw.name,
    placement_count: places.length,
    placements,
    schools: schoolParts.length ? schoolParts : [raw.school],
    championships: places.filter((p) => p === 1).length,
    years_label: raw.years,
  }
}

/**
 * Archive / verified four-time placers (exactly four state places).
 * Includes recent 2020–2026 classes; 4× champions not listed here are merged in
 * `lib/nchsaa-multi-time-state-placers.ts`.
 */
const RAW_FOUR_TIME_STATE_PLACERS: RawFourTimePlacer[] = [
  { name: "Cael Dunn", school: "Avery County/South Davidson", years: "2022-2026", placements: [1, 1, 1, 1] },
  { name: "Loxston Hooper", school: "Robbinsville", years: "2022-2026", placements: [3, 2, 1, 1] },
  { name: "Adair Panama", school: "Robbinsville", years: "2022-2026", placements: [4, 2, 1, 1] },
  { name: "Dom Hittepole", school: "Wheatmore", years: "2022-2026", placements: [4, 2, 1, 1] },
  { name: "Andrew Meadows", school: "East Surry/Mount Airy", years: "2022-2026", placements: [5, 1, 1, 1] },
  { name: "Landon Pope", school: "Pisgah", years: "2022-2026", placements: [3, 5, 2, 1] },
  { name: "Lorenzo Alston", school: "Uwharrie Charter", years: "2022-2026", placements: [1, 1, 1, 1] },
  { name: "Eli Horton", school: "Morehead", years: "2022-2026", placements: [1, 2, 1, 1] },
  { name: "Bentley Sly", school: "Stuart Cramer", years: "2022-2026", placements: [1, 1, 1, 1] },
  { name: "Cameron Gue", school: "Mount Pleasant", years: "2022-2026", placements: [3, 1, 2, 1] },
  { name: "Gabe Rogers", school: "Seaforth", years: "2022-2026", placements: [2, 3, 1, 1] },
  { name: "Dominic Blue", school: "Scotland/Union Pines", years: "2022-2026", placements: [2, 3, 1, 1] },
  { name: "Will Varner", school: "Kings Mountain", years: "2022-2026", placements: [4, 3, 1, 1] },
  { name: "Jace Barierr", school: "Mooresville", years: "2022-2026", placements: [2, 3, 1, 1] },
  { name: "Trevelian Hall", school: "Lumberton", years: "2022-2026", placements: [4, 1, 1, 1] },
  { name: "Grant McCord", school: "Grimsley", years: "2021-2025", placements: [6, 1, 3, 3] },
  { name: "Layne Armstrong", school: "Seaforth", years: "2021-2025", placements: [6, 4, 1, 1] },
  { name: "Ryan Mann", school: "NECP", years: "2021-2025", placements: [4, 2, 1, 1] },
  { name: "Caleb Cox", school: "RS Central", years: "2021-2025", placements: [6, 2, 2, 1] },
  { name: "Kevin O'Brien", school: "West Rowan", years: "2021-2025", placements: [5, 3, 2, 1] },
  { name: "Jackson Rowling", school: "Hough", years: "2021-2025", placements: [2, 4, 2, 1] },
  { name: "Cooper Foster", school: "Avery County", years: "2021-2025", placements: [3, 1, 1, 1] },
  { name: "Liam Hickey", school: "Cardinal Gibbons", years: "2021-2025", placements: [3, 3, 1, 1] },
  { name: "Cam Stinson", school: "Mallard Creek", years: "2020-2024", placements: [1, 1, 1, 1] },
  { name: "Kage Williams", school: "Robbinsville", years: "2020-2024", placements: [1, 1, 1, 1] },
  { name: "RJ James", school: "Reidsville", years: "2020-2024", placements: [2, 1, 1, 1] },
  { name: "Ben Jordan", school: "Avery County", years: "2020-2024", placements: [2, 1, 1, 1] },
  { name: "Trevor Freeman", school: "AL Brown", years: "2020-2024", placements: [2, 3, 1, 1] },
  { name: "Brayden Mejia", school: "Fred T. Foard", years: "2020-2024", placements: [1, 3, 1, 1] },
  { name: "David McEachern", school: "Mount Pleasant", years: "2020-2024", placements: [2, 1, 1, 1] },
]

export const NCHSAA_FOUR_TIME_STATE_PLACERS_SEED: NchsaaMultiTimeStatePlacer[] =
  RAW_FOUR_TIME_STATE_PLACERS.map(expandRaw)

export function normalizePlacerNameKey(s: string): string {
  return s
    .trim()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .toUpperCase()
    .replace(/^CAM\b/, "CAMERON")
}

function placementYears(p: NchsaaMultiTimeStatePlacer): number[] {
  return p.placements.map((x) => Number(x.year)).filter((y) => Number.isFinite(y) && y > 0)
}

/** Earliest first placement year first; places within each wrestler chronological. */
export function sortMultiTimePlacersChronological(
  rows: NchsaaMultiTimeStatePlacer[],
): NchsaaMultiTimeStatePlacer[] {
  return rows
    .map((r) => ({
      ...r,
      placements: [...r.placements].sort((a, b) => a.year - b.year || a.place - b.place),
      schools: [...r.schools],
    }))
    .sort((a, b) => {
      const aYears = placementYears(a)
      const bYears = placementYears(b)
      const aFirst = aYears.length ? Math.min(...aYears) : 0
      const bFirst = bYears.length ? Math.min(...bYears) : 0
      if (aFirst !== bFirst) return aFirst - bFirst
      const aLast = aYears.length ? Math.max(...aYears) : 0
      const bLast = bYears.length ? Math.max(...bYears) : 0
      if (aLast !== bLast) return aLast - bLast
      return a.wrestler_name.localeCompare(b.wrestler_name, undefined, { sensitivity: "base" })
    })
}
