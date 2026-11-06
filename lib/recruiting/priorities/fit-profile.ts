/**
 * The fit profile from the family's survey answers (Matt, 6 Nov 2026: Gavin's college page said
 * "Biology" from goals typed into Compare weeks earlier, while the survey said Business and
 * Communication). Once a family has answered What matters to your family, the survey is the only
 * source: Compare's old goals on the account are not read at all.
 *
 * `answers` is the viewer's own set first, then the other side's Shared answers: the first answer
 * to a key wins, so a parent's own answer is never overruled by the wrestler's.
 */
import { cleanProfile, type FamilyFitProfile } from "@/lib/recruiting/family-fit"
import type { Answer } from "@/lib/recruiting/priorities/sharing"

const BUDGET: Record<string, number | null> = { lt10: 10_000, "10_20": 20_000, "20_35": 35_000, "35_50": 50_000, "50plus": null }
const MILES: Record<string, number | null> = { "2h": 110, "5h": 260, day: 500, close_open: 250, anywhere: null }
const SIZES = ["small", "medium", "large"] as const
const SETTINGS = ["city", "suburb", "town", "rural"] as const

export function fitProfileFromAnswers(answers: ReadonlyArray<Answer>): FamilyFitProfile {
  const first = new Map<string, unknown>()
  for (const a of answers) if (!first.has(a.key) && a.value != null) first.set(a.key, a.value)
  const academics = first.get("academics") as { majors?: unknown } | undefined
  const feel = Array.isArray(first.get("school_feel")) ? (first.get("school_feel") as unknown[]).map(String) : []
  const sizes = SIZES.filter((s) => feel.includes(s))
  const settings = SETTINGS.filter((s) => feel.includes(s))
  return cleanProfile({
    majors: Array.isArray(academics?.majors) ? academics.majors : [],
    budget: BUDGET[String(first.get("budget"))] ?? null,
    homeZip: first.get("home_zip") ?? null,
    maxMiles: MILES[String(first.get("distance"))] ?? null,
    // One size is a preference; several, or none, is not.
    size: sizes.length === 1 ? sizes[0] : null,
    settings: settings.length === SETTINGS.length ? [] : settings,
  })
}
