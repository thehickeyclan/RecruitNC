/**
 * Canonical list of North Carolina's 17 four-time NCHSAA state champions.
 * Used by Data Dawg (AI chat) and can be used by State Champions UI.
 * Source: NCHSAA records; count is 17 (not 9).
 */

export interface FourTimeStateChampion {
  name: string
  school: string
  years: string
  weights: string
  classifications: string
}

export const FOUR_TIME_STATE_CHAMPIONS: FourTimeStateChampion[] = [
  { name: "Cael Dunn", school: "Avery/South Davidson", years: "2022-2026", weights: "170-170-190-215", classifications: "1A-1A-1A-1A/2A" },
  { name: "Lorenzo Alston", school: "Uwharrie Charter", years: "2022-2026", weights: "144-145-157-175", classifications: "1A-1A-1A-4A" },
  { name: "Bentley Sly", school: "Stuart Cramer", years: "2022-2026", weights: "120-132-144-150", classifications: "3A-3A-3A-4A" },
  { name: "Cam Stinson", school: "Mallard Creek", years: "2020-2024", weights: "106-113-120-126", classifications: "4A (All)" },
  { name: "Kage Williams", school: "Robbinsville", years: "2020-2024", weights: "182-195-182-190", classifications: "1A (All)" },
  { name: "Jeremiah Price", school: "Surry Central", years: "2019-2023", weights: "145-145-152-152", classifications: "2A (All)" },
  { name: "Kyle Montaperto", school: "CATA", years: "2018-2022", weights: "106-120-120-126", classifications: "2A-2A-2A-3A" },
  { name: "Levi Andrews", school: "Avery", years: "2018-2022", weights: "220-220-285-285", classifications: "1A (All)" },
  { name: "Landon Foor", school: "Fred T. Foard", years: "2017-2021", weights: "170-182-182-182", classifications: "2A (All)" },
  { name: "Corey Mock", school: "Chapel Hill", years: "2005-2009", weights: "103-112-125-135", classifications: "4A (All)" },
  { name: "Jacob Creed", school: "Ragsdale", years: "2005-2009", weights: "103-119-130-135", classifications: "3A (All)" },
  { name: "Chris Bullins", school: "McMichael", years: "2003-2007", weights: "160-160-170-160", classifications: "1A/2A (All)" },
  { name: "Justin Sparrow", school: "East Gaston", years: "2003-2007", weights: "119-140-145-160", classifications: "3A-3A-4A-4A" },
  { name: "Dusty Mckinney", school: "East Gaston", years: "2000-2004", weights: "103-112-119-125", classifications: "4A-3A-3A-3A" },
  { name: "Drew Forshey", school: "St. Stephens", years: "1999-2003", weights: "103-112-119-125", classifications: "3A (All)" },
  { name: "John Mark Bentley", school: "Avery", years: "1993-1997", weights: "119-125-135-140", classifications: "1A/2A (All)" },
  { name: "Mike Kendall", school: "Albemarle", years: "1987-1991", weights: "103-112-119-130", classifications: "1A/2A (All)" },
]

/** Count of four-time NCHSAA state champions (canonical). */
export const FOUR_TIME_STATE_CHAMPIONS_COUNT = FOUR_TIME_STATE_CHAMPIONS.length

/**
 * Plain-text summary for AI/Data Dawg so it can answer "Who are the 4x state champions?"
 * and "How many four-time state champions are there?" correctly.
 */
export function getFourTimeStateChampionsContextForAI(): string {
  const lines = FOUR_TIME_STATE_CHAMPIONS.map(
    (c, i) =>
      `${i + 1}. ${c.name} — ${c.school}; ${c.years}; weights: ${c.weights}; ${c.classifications}`
  )
  return [
    "North Carolina has 17 four-time NCHSAA state champions (not 9).",
    "List:",
    ...lines,
  ].join("\n")
}
