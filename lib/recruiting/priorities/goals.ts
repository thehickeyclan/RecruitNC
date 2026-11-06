/**
 * Goals first (Matt, 6 Nov 2026): "What are your goals for college wrestling?" is question 1 on both
 * sides, before distance, money or levels. It replaces the old closer ("If these ever conflict, what
 * wins?", key top3) and the level-or-opportunity question (P4/A3), which goals 1 and 4 now cover.
 *
 * The point is to level-set. Many families start from "D1 or bust" and never say what college is for
 * after wrestling ends. So the screen carries a few plain facts from the Learn library (paying-for-
 * college), and when a top 3 holds nothing about school or career, one line asks them to look again.
 * Facts only from the library: no invented percentages.
 *
 * Sets answered before 6 Nov hold top3 (and maybe level_vs_opportunity). goalsOf maps them, so their
 * lists, weights and alignment keep working without a re-ask.
 */
import type { Option } from "./questions"

export const GOALS_KEY = "goals"
export const SUCCESS_KEY = "success"

/** Seven goals, the same keys on both sides so the two orders compare directly. */
export const GOALS: Option[] = [
  { key: "level", label: "Wrestle at the highest level I can" },
  { key: "pay", label: "Get the most help paying for college" },
  { key: "academics", label: "Get into the strongest school academically" },
  { key: "compete", label: "Get in the lineup and contribute early" },
  { key: "career", label: "Get ready for the career I want" },
  { key: "team", label: "Great coaches and a team I fit with" },
  { key: "experience", label: "A great all-around college experience" },
]

/** The parent screen reads in the family's voice, not the wrestler's. */
export const PARENT_GOAL_LABELS: Record<string, string> = {
  level: "Wrestle at the highest level possible",
  pay: "Get the most help paying for college",
  academics: "Get into the strongest school academically",
  compete: "Get in the lineup and contribute early",
  career: "Get ready for a career",
  team: "Great coaches and a team that fits",
  experience: "A great all-around college experience",
}

/** Short forms for sentences ("You both have getting ready for a career in your top 3"). No "room" or "spot": recommend.test.ts guards that copy. */
export const GOAL_SHORT: Record<string, string> = {
  level: "the highest level",
  pay: "help paying",
  academics: "academics",
  compete: "getting in the lineup early",
  career: "getting ready for a career",
  team: "coaches and team",
  experience: "the all-around experience",
}

/** Above the choices: why this comes first. From lib/recruiting/learn/content.ts, paying-for-college. */
export const GOALS_FACTS: string[] = [
  "College wrestling lasts four or five years. The degree lasts a lifetime.",
  "Full wrestling scholarships are rare. Division II shares 9 full grants (10 for women) across a whole team, and Division III gives no athletic money at all.",
  "A 25% wrestling scholarship at one college can cost more than no wrestling money at another.",
]

/** Legacy top3 factor → goal. "distance" has no goal: it has its own question. */
const FROM_TOP3: Record<string, string | null> = { level: "level", compete_early: "compete", cost: "pay", academics: "academics", campus: "experience", coaching: "team", distance: null }

const isGoal = (k: string) => GOALS.some((g) => g.key === k)

/**
 * A respondent's goals with their rank (0 = #1), at most three: the goals answer, else the legacy
 * top 3 mapped (keeping each factor's old rank, so a dropped "distance" doesn't move the others up),
 * else the legacy level-or-opportunity answer as a single goal.
 */
export function rankedGoals(value: (key: string) => unknown): Array<{ goal: string; rank: number }> {
  const g = value(GOALS_KEY)
  if (Array.isArray(g)) return [...new Set(g.map(String))].filter(isGoal).slice(0, 3).map((goal, rank) => ({ goal, rank }))
  const t = value("top3")
  if (Array.isArray(t)) {
    const out: Array<{ goal: string; rank: number }> = []
    t.slice(0, 3).forEach((k, rank) => {
      const goal = FROM_TOP3[String(k)]
      if (goal && !out.some((x) => x.goal === goal)) out.push({ goal, rank })
    })
    if (out.length) return out
  }
  const lvo = value("level_vs_opportunity")
  if (lvo === "level") return [{ goal: "level", rank: 0 }]
  if (lvo === "opportunity") return [{ goal: "compete", rank: 0 }]
  return []
}

/** The goals in order, for copy and comparisons. */
export const goalsOf = (value: (key: string) => unknown): string[] => rankedGoals(value).map((g) => g.goal)

/** The one nudge: a top 3 with nothing about school or what comes after. */
export function goalsNudge(goals: string[]): string | null {
  if (!goals.length) return null
  if (goals.some((g) => g === "academics" || g === "career" || g === "pay")) return null
  return "Nothing in this top 3 is about school or what comes after wrestling. Worth a second look before you go on."
}

/**
 * The yearly re-ask: goals change between 9th grade and senior year. A set finished before this
 * season's August 1 is from last season, once August 1 has come.
 */
export function goalsAreLastSeason(completedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!completedAt) return false
  const done = new Date(completedAt)
  if (Number.isNaN(done.getTime())) return false
  const year = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
  return done < new Date(Date.UTC(year, 7, 1))
}
