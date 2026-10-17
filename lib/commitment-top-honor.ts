/**
 * A committed wrestler's top achievement for the commitments table, counted: "2x All-American",
 * "3x State Champ", "All-American · State Champ", "State Placer", "State Qualifier" (Matt, 17
 * October 2026: "why not put their highest achievement in that column").
 *
 * All-American is a top-8 finish at NHSCA Nationals or Super 32, as the directory's pills read it.
 * A state title or placing is from the NCHSAA/NCISA state results. Counted per year: one state
 * bracket per season, one finish per event per year.
 */
export type HonorFacts = {
  /** Years with a state title. */
  stateTitleYears: number[]
  /** Best state place in any year (1 = champion), or null. */
  bestStatePlace: number | null
  /** Was at a state tournament at all. */
  stateQualifier: boolean
  /** Distinct NHSCA / Super 32 top-8 finishes, as "event|year". */
  allAmericanFinishes: string[]
}

const times = (n: number, label: string) => (n > 1 ? `${n}x ${label}` : label)

export function topHonor(f: HonorFacts | null | undefined): string | null {
  if (!f) return null
  const aa = new Set(f.allAmericanFinishes).size
  const titles = new Set(f.stateTitleYears).size
  const state =
    titles > 0
      ? times(titles, "State Champ")
      : f.bestStatePlace != null && f.bestStatePlace >= 2 && f.bestStatePlace <= 8
        ? "State Placer"
        : f.stateQualifier
          ? "State Qualifier"
          : null
  if (aa > 0) return [times(aa, "All-American"), titles > 0 ? state : null].filter(Boolean).join(" · ")
  return state
}
