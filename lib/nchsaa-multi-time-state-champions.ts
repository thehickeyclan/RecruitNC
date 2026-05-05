import { getSupabaseAdmin } from "@/lib/server-supabase"

export type NchsaaMultiTimeStateChampion = {
  wrestler_name: string
  championship_count: number
  championships: Array<{
    year: number
    classification: string
    weight_class: string
    school: string
  }>
  schools: string[]
  classifications: string[]
  weight_classes: string[]
}

/** All 17 four-time NCHSAA individual state champions through 2026 (curated list; includes 2026 class). */
export const NCHSAA_FOUR_TIME_STATE_CHAMPIONS: NchsaaMultiTimeStateChampion[] = [
  {
    wrestler_name: "Cael Dunn",
    championship_count: 4,
    championships: [
      { year: 2026, classification: "1A/2A", weight_class: "215lbs", school: "Avery/South Davidson" },
      { year: 2025, classification: "1A", weight_class: "190lbs", school: "Avery/South Davidson" },
      { year: 2024, classification: "1A", weight_class: "170lbs", school: "Avery/South Davidson" },
      { year: 2023, classification: "1A", weight_class: "170lbs", school: "Avery/South Davidson" },
    ],
    schools: ["Avery/South Davidson"],
    classifications: ["1A", "1A/2A"],
    weight_classes: ["170lbs", "190lbs", "215lbs"],
  },
  {
    wrestler_name: "Lorenzo Alston",
    championship_count: 4,
    championships: [
      { year: 2026, classification: "4A", weight_class: "175lbs", school: "Uwharrie Charter" },
      { year: 2025, classification: "1A", weight_class: "157lbs", school: "Uwharrie Charter" },
      { year: 2024, classification: "1A", weight_class: "145lbs", school: "Uwharrie Charter" },
      { year: 2023, classification: "1A", weight_class: "144lbs", school: "Uwharrie Charter" },
    ],
    schools: ["Uwharrie Charter"],
    classifications: ["1A", "4A"],
    weight_classes: ["144lbs", "145lbs", "157lbs", "175lbs"],
  },
  {
    wrestler_name: "Bentley Sly",
    championship_count: 4,
    championships: [
      { year: 2026, classification: "4A", weight_class: "150lbs", school: "Stuart Cramer" },
      { year: 2025, classification: "3A", weight_class: "144lbs", school: "Stuart Cramer" },
      { year: 2024, classification: "3A", weight_class: "132lbs", school: "Stuart Cramer" },
      { year: 2023, classification: "3A", weight_class: "120lbs", school: "Stuart Cramer" },
    ],
    schools: ["Stuart Cramer"],
    classifications: ["3A", "4A"],
    weight_classes: ["120lbs", "132lbs", "144lbs", "150lbs"],
  },
  {
    wrestler_name: "Cameron Stinson",
    championship_count: 4,
    championships: [
      { year: 2024, classification: "4A", weight_class: "126lbs", school: "Mallard Creek" },
      { year: 2023, classification: "4A", weight_class: "120lbs", school: "Mallard Creek" },
      { year: 2022, classification: "4A", weight_class: "113lbs", school: "Mallard Creek" },
      { year: 2021, classification: "4A", weight_class: "106lbs", school: "Mallard Creek" },
    ],
    schools: ["Mallard Creek"],
    classifications: ["4A"],
    weight_classes: ["106lbs", "113lbs", "120lbs", "126lbs"],
  },
  {
    wrestler_name: "Chris Bullins",
    championship_count: 4,
    championships: [
      { year: 2007, classification: "1A/2A", weight_class: "160lbs", school: "McMichael" },
      { year: 2006, classification: "1A/2A", weight_class: "171lbs", school: "McMichael" },
      { year: 2005, classification: "1A/2A", weight_class: "160lbs", school: "McMichael" },
      { year: 2004, classification: "1A/2A", weight_class: "160lbs", school: "McMichael" },
    ],
    schools: ["McMichael"],
    classifications: ["1A/2A"],
    weight_classes: ["160lbs", "171lbs"],
  },
  {
    wrestler_name: "Corey Mock",
    championship_count: 4,
    championships: [
      { year: 2009, classification: "4A", weight_class: "135lbs", school: "Chapel Hill" },
      { year: 2008, classification: "4A", weight_class: "125lbs", school: "Chapel Hill" },
      { year: 2007, classification: "4A", weight_class: "112lbs", school: "Chapel Hill" },
      { year: 2006, classification: "4A", weight_class: "103lbs", school: "Chapel Hill" },
    ],
    schools: ["Chapel Hill"],
    classifications: ["4A"],
    weight_classes: ["103lbs", "112lbs", "125lbs", "135lbs"],
  },
  {
    wrestler_name: "Drew Forshey",
    championship_count: 4,
    championships: [
      { year: 2003, classification: "3A", weight_class: "125lbs", school: "St. Stephens" },
      { year: 2002, classification: "3A", weight_class: "119lbs", school: "St. Stephens" },
      { year: 2001, classification: "3A", weight_class: "112lbs", school: "St. Stephens" },
      { year: 2000, classification: "3A", weight_class: "103lbs", school: "St. Stephens" },
    ],
    schools: ["St. Stephens"],
    classifications: ["3A"],
    weight_classes: ["103lbs", "112lbs", "119lbs", "125lbs"],
  },
  {
    wrestler_name: "Dusty McKinney",
    championship_count: 4,
    championships: [
      { year: 2004, classification: "3A", weight_class: "125lbs", school: "East Gaston" },
      { year: 2003, classification: "3A", weight_class: "119lbs", school: "East Gaston" },
      { year: 2002, classification: "3A", weight_class: "112lbs", school: "East Gaston" },
      { year: 2001, classification: "4A", weight_class: "103lbs", school: "East Gaston" },
    ],
    schools: ["East Gaston"],
    classifications: ["3A", "4A"],
    weight_classes: ["103lbs", "112lbs", "119lbs", "125lbs"],
  },
  {
    wrestler_name: "Jacob Creed",
    championship_count: 4,
    championships: [
      { year: 2009, classification: "3A", weight_class: "135lbs", school: "Ragsdale" },
      { year: 2008, classification: "3A", weight_class: "130lbs", school: "Ragsdale" },
      { year: 2007, classification: "3A", weight_class: "119lbs", school: "Ragsdale" },
      { year: 2006, classification: "3A", weight_class: "103lbs", school: "Ragsdale" },
    ],
    schools: ["Ragsdale"],
    classifications: ["3A"],
    weight_classes: ["103lbs", "119lbs", "130lbs", "135lbs"],
  },
  {
    wrestler_name: "Jeremiah Price",
    championship_count: 4,
    championships: [
      { year: 2023, classification: "2A", weight_class: "152lbs", school: "Surry Central" },
      { year: 2022, classification: "2A", weight_class: "152lbs", school: "Surry Central" },
      { year: 2021, classification: "2A", weight_class: "145lbs", school: "Surry Central" },
      { year: 2020, classification: "2A", weight_class: "145lbs", school: "Surry Central" },
    ],
    schools: ["Surry Central"],
    classifications: ["2A"],
    weight_classes: ["145lbs", "152lbs"],
  },
  {
    wrestler_name: "JohnMark Bentley",
    championship_count: 4,
    championships: [
      { year: 1997, classification: "1A/2A", weight_class: "140lbs", school: "Avery County" },
      { year: 1996, classification: "1A/2A", weight_class: "135lbs", school: "Avery County" },
      { year: 1995, classification: "1A/2A", weight_class: "125lbs", school: "Avery County" },
      { year: 1994, classification: "1A/2A", weight_class: "119lbs", school: "Avery County" },
    ],
    schools: ["Avery County"],
    classifications: ["1A/2A"],
    weight_classes: ["119lbs", "125lbs", "135lbs", "140lbs"],
  },
  {
    wrestler_name: "Justin Sparrow",
    championship_count: 4,
    championships: [
      { year: 2007, classification: "4A", weight_class: "160lbs", school: "East Gaston" },
      { year: 2006, classification: "4A", weight_class: "145lbs", school: "East Gaston" },
      { year: 2005, classification: "3A", weight_class: "140lbs", school: "East Gaston" },
      { year: 2004, classification: "3A", weight_class: "119lbs", school: "East Gaston" },
    ],
    schools: ["East Gaston"],
    classifications: ["3A", "4A"],
    weight_classes: ["119lbs", "140lbs", "145lbs", "160lbs"],
  },
  {
    wrestler_name: "Kage Williams",
    championship_count: 4,
    championships: [
      { year: 2024, classification: "1A", weight_class: "190lbs", school: "Robbinsville" },
      { year: 2023, classification: "1A", weight_class: "182lbs", school: "Robbinsville" },
      { year: 2022, classification: "1A", weight_class: "190lbs", school: "Robbinsville" },
      { year: 2021, classification: "1A", weight_class: "182lbs", school: "Robbinsville" },
    ],
    schools: ["Robbinsville"],
    classifications: ["1A"],
    weight_classes: ["182lbs", "190lbs"],
  },
  {
    wrestler_name: "Kyle Montaperto",
    championship_count: 4,
    championships: [
      { year: 2022, classification: "3A", weight_class: "126lbs", school: "Central Academy" },
      { year: 2021, classification: "2A", weight_class: "120lbs", school: "Central Academy" },
      { year: 2020, classification: "2A", weight_class: "120lbs", school: "Central Academy" },
      { year: 2019, classification: "2A", weight_class: "106lbs", school: "Central Academy" },
    ],
    schools: ["Central Academy"],
    classifications: ["2A", "3A"],
    weight_classes: ["106lbs", "120lbs", "126lbs"],
  },
  {
    wrestler_name: "Landon Foor",
    championship_count: 4,
    championships: [
      { year: 2021, classification: "2A", weight_class: "182lbs", school: "Fred T. Foard" },
      { year: 2020, classification: "2A", weight_class: "182lbs", school: "Fred T. Foard" },
      { year: 2019, classification: "2A", weight_class: "182lbs", school: "Fred T. Foard" },
      { year: 2018, classification: "2A", weight_class: "170lbs", school: "Fred T. Foard" },
    ],
    schools: ["Fred T. Foard"],
    classifications: ["2A"],
    weight_classes: ["170lbs", "182lbs"],
  },
  {
    wrestler_name: "Levi Andrews",
    championship_count: 4,
    championships: [
      { year: 2022, classification: "1A", weight_class: "285lbs", school: "Avery County" },
      { year: 2021, classification: "1A", weight_class: "285lbs", school: "Avery County" },
      { year: 2020, classification: "1A", weight_class: "220lbs", school: "Avery County" },
      { year: 2019, classification: "1A", weight_class: "220lbs", school: "Avery County" },
    ],
    schools: ["Avery County"],
    classifications: ["1A"],
    weight_classes: ["220lbs", "285lbs"],
  },
  {
    wrestler_name: "Mike Kendall",
    championship_count: 4,
    championships: [
      { year: 1991, classification: "1A/2A", weight_class: "130lbs", school: "Albemarle" },
      { year: 1990, classification: "1A/2A", weight_class: "119lbs", school: "Albemarle" },
      { year: 1989, classification: "1A/2A", weight_class: "112lbs", school: "Albemarle" },
      { year: 1988, classification: "1A/2A", weight_class: "105lbs", school: "Albemarle" },
    ],
    schools: ["Albemarle"],
    classifications: ["1A/2A"],
    weight_classes: ["105lbs", "112lbs", "119lbs", "130lbs"],
  },
]

function normalizeWrestlerKey(s: string): string {
  return s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
}

/**
 * Wrestlers with exactly `exactCount` NCHSAA individual titles (place = 1), from `wrestling_nchsaa_results`.
 * Four-time list is curated (`NCHSAA_FOUR_TIME_STATE_CHAMPIONS`) for parity with the archive.
 */
export async function getNchsaaStateChampionsByExactTitleCount(
  exactCount: 2 | 3 | 4,
): Promise<NchsaaMultiTimeStateChampion[]> {
  if (exactCount === 4) {
    return NCHSAA_FOUR_TIME_STATE_CHAMPIONS.map((r) => ({
      ...r,
      championships: r.championships.map((c) => ({ ...c })),
      schools: [...r.schools],
      classifications: [...r.classifications],
      weight_classes: [...r.weight_classes],
    }))
  }

  const adminClient = getSupabaseAdmin()
  const { data: allChampions, error } = await adminClient
    .from("wrestling_nchsaa_results")
    .select("wrestler_name, year, classification, weight_class, school, place")
    .eq("place", 1)
    .not("school", "is", null)
    .neq("school", "")
    .not("school", "ilike", "unknown")
    .not("wrestler_name", "is", null)
    .neq("wrestler_name", "")
    .limit(100000)

  if (error) {
    throw error
  }

  const groups: Record<string, Record<string, unknown>[]> = {}
  for (const c of allChampions ?? []) {
    const norm = normalizeWrestlerKey(String((c as { wrestler_name?: string }).wrestler_name ?? ""))
    if (!norm) continue
    if (!groups[norm]) groups[norm] = []
    groups[norm].push(c as Record<string, unknown>)
  }

  const filtered: NchsaaMultiTimeStateChampion[] = []
  for (const champs of Object.values(groups)) {
    if (champs.length !== exactCount) continue
    const sortedChamps = [...champs].sort(
      (a, b) => Number(a.year ?? 0) - Number(b.year ?? 0),
    )
    const first = sortedChamps[0]
    filtered.push({
      wrestler_name: String(first.wrestler_name ?? "").trim(),
      championship_count: champs.length,
      championships: sortedChamps.map((row) => ({
        year: Number(row.year ?? 0),
        classification: String(row.classification ?? ""),
        weight_class: String(row.weight_class ?? ""),
        school: String(row.school ?? ""),
      })),
      schools: [...new Set(sortedChamps.map((c) => String(c.school ?? "")))],
      classifications: [...new Set(sortedChamps.map((c) => String(c.classification ?? "")))],
      weight_classes: [...new Set(sortedChamps.map((c) => String(c.weight_class ?? "")))],
    })
  }

  filtered.sort((a, b) => a.wrestler_name.localeCompare(b.wrestler_name, undefined, { sensitivity: "base" }))
  return filtered
}
