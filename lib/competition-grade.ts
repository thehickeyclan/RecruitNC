/**
 * How hard this wrestler competes — red to green, and what would move them up.
 *
 * This is deliberately a verdict, and deliberately not the measurement that sat here before.
 * The point is not to describe a schedule neutrally; it is to tell a family the truth a college
 * coach already knows. You can be a state champion and still be red: if you have not beaten
 * anybody ranked, have never left North Carolina and only wrestle between November and
 * February, you have not been tested where testing happens.
 *
 * Green is all three together — wins over ranked opponents, national events, and wrestling
 * year-round rather than only in season. The bands come from the real spread across ranked NC
 * wrestlers on file (n=60, 23 September 2026):
 *
 *   ranked wins        p25 0 · median 2 · p75 5 · max 10
 *   national events    p25 0 · median 1 · p75 2 · max 4
 *   off-season events  p25 0 · median 2 · p75 3 · max 10
 *
 * Each factor scores 0, 1 or 2 against those, so a full score is the top quarter on all three.
 *
 * Every band carries the step that would raise it, because a grade nobody can act on is just a
 * judgement. That is the whole purpose: get kids wrestling the best.
 */

export type GradeFactor = {
  key: "rankedWins" | "national" | "yearRound"
  label: string
  /** What they have, in words. */
  detail: string
  points: 0 | 1 | 2
  /** The next thing that would raise this factor. Null when already at the top. */
  nextStep: string | null
}

export type CompetitionGrade = {
  /** 0-6. */
  score: number
  band: "red" | "orange" | "amber" | "green"
  label: string
  /** The one-line verdict, written for a family to read. */
  verdict: string
  factors: GradeFactor[]
  /** The shortest route up, or null at green. */
  nextStep: string | null
}

function scoreRankedWins(count: number): { points: 0 | 1 | 2; detail: string; nextStep: string | null } {
  if (count >= 5) return { points: 2, detail: `${count} wins over ranked opponents`, nextStep: null }
  if (count >= 1) {
    return {
      points: 1,
      detail: `${count} win${count === 1 ? "" : "s"} over ranked opponents`,
      nextStep: `Beat ${5 - count} more ranked opponent${5 - count === 1 ? "" : "s"}`,
    }
  }
  return { points: 0, detail: "No wins over ranked opponents", nextStep: "Beat a ranked opponent" }
}

function scoreNational(count: number): { points: 0 | 1 | 2; detail: string; nextStep: string | null } {
  if (count >= 2) return { points: 2, detail: `${count} national events entered`, nextStep: null }
  if (count === 1) {
    return { points: 1, detail: "1 national event entered", nextStep: "Enter a second national event" }
  }
  return {
    points: 0,
    detail: "Has not competed nationally",
    nextStep: "Enter a national event — NHSCA, Fargo, Super 32 or Journeymen",
  }
}

function scoreYearRound(count: number): { points: 0 | 1 | 2; detail: string; nextStep: string | null } {
  // "Post/preseason major events", not "off-season": these are the March-to-October majors an
  // NC wrestler can enter, and calling them off-season makes them sound like filler.
  const noun = (n: number) => `${n} post/preseason major event${n === 1 ? "" : "s"}`
  if (count >= 3) return { points: 2, detail: noun(count), nextStep: null }
  if (count >= 1) {
    return { points: 1, detail: noun(count), nextStep: "Wrestle a third post/preseason major" }
  }
  return {
    points: 0,
    detail: "In-season only",
    nextStep: "Wrestle a post or preseason major — NHSCA, Fargo, Super 32 or Journeymen",
  }
}

export function buildCompetitionGrade(input: {
  rankedWins: number
  nationalEvents: number
  offSeasonEvents: number
}): CompetitionGrade {
  const wins = scoreRankedWins(Math.max(0, input.rankedWins))
  const national = scoreNational(Math.max(0, input.nationalEvents))
  const yearRound = scoreYearRound(Math.max(0, input.offSeasonEvents))

  const factors: GradeFactor[] = [
    { key: "rankedWins", label: "Wins over ranked opponents", ...wins },
    { key: "national", label: "Competes nationally", ...national },
    { key: "yearRound", label: "Competes post/preseason", ...yearRound },
  ]

  const score = wins.points + national.points + yearRound.points
  const { band, label, verdict } =
    score >= 5
      ? {
          band: "green" as const,
          label: "Tested",
          verdict: "Beats ranked opponents, competes nationally, and wrestles the post and preseason majors.",
        }
      : score >= 3
        ? {
            band: "amber" as const,
            label: "Getting tested",
            verdict: "Competing beyond the state season, with room to go further.",
          }
        : score >= 2
          ? {
              band: "orange" as const,
              label: "Lightly tested",
              verdict: "Mostly in-state, in-season competition so far.",
            }
          : {
              band: "red" as const,
              label: "Untested",
              verdict:
                "Has not beaten a ranked opponent and has not competed where the best wrestlers are. A state" +
                " title alone does not answer this.",
            }

  // The cheapest way up: the lowest-scoring factor that still has a step.
  const nextStep =
    [...factors].sort((a, b) => a.points - b.points).find((f) => f.nextStep)?.nextStep ?? null

  return { score, band, label, verdict, factors, nextStep }
}
