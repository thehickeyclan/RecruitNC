/**
 * "What Matters to Your Family" (priorities survey v3, Matt 5 Nov 2026): the question inventory.
 *
 * The numbered questions are authoritative: goals first on both sides (P0/A0, goals.ts) and the
 * optional "what would success look like" (P0b/A0b, Private), then Parent P1–P8 and Athlete A1–A9.
 * P4/A3 (level or opportunity) and the P9/A10 closer (top3) were retired on 6 Nov 2026: the goals
 * cover both, and goalsOf still reads sets answered before then. Every question can be
 * skipped, "not sure" is a real answer, and nothing here filters anything on its own: the
 * recommendation code reads the answers through lib/recruiting/priorities/sharing.ts.
 *
 * Sharing classes (spec, "Sharing & privacy"), with Matt's decision of 5 Nov: only Shared answers
 * ever reach a joint output. Constraint-only and Private answers shape only their owner's own view.
 */
import { MAJOR_FAMILIES } from "@/lib/recruiting/family-fit"
import { GOALS, GOALS_KEY, PARENT_GOAL_LABELS, SUCCESS_KEY } from "./goals"

export type Respondent = "parent" | "athlete"
export type SharingClass = "shared" | "constraint" | "private"
export type Marker = "must" | "strong" | "flexible"

export type Option = { key: string; label: string }

export type QuestionKind =
  | { type: "single"; options: Option[] }
  | { type: "multi"; options: Option[]; max?: number; exclusive?: string[] }
  | { type: "grid"; rows: Option[]; options: Option[] }
  | { type: "text" }
  | { type: "top3"; options: Option[] }
  | { type: "majors" }

export type Question = {
  /** P1…P9, A1…A10, A4b. */
  id: string
  /** Stable storage key; the same key on both sides where the spec compares them. */
  key: string
  respondent: Respondent
  title: string
  kind: QuestionKind
  sharing: SharingClass
  optional?: boolean
  /** Must-have / strong / flexible can be set on the answer. */
  marker?: boolean
}

export const PATHWAYS: Option[] = [
  { key: "D1", label: "Division I" },
  { key: "D2", label: "Division II" },
  { key: "D3", label: "Division III" },
  { key: "NAIA", label: "NAIA" },
  { key: "NJCAA", label: "Junior college (start there, transfer up)" },
]
export const PATHWAY_STATES: Option[] = [
  { key: "interested", label: "Interested" },
  { key: "open", label: "Open to learning more" },
  { key: "not", label: "Not interested" },
]

/** The seven Top-3 factors: identical keys on both sides so the two orders compare directly. */
export const TOP3_FACTORS: Option[] = [
  { key: "level", label: "Highest level possible" },
  { key: "compete_early", label: "Competing early" },
  { key: "cost", label: "Cost" },
  { key: "distance", label: "Distance from home" },
  { key: "academics", label: "Academics and the major" },
  { key: "campus", label: "Campus size and experience" },
  { key: "coaching", label: "Coaching and the room" },
]

/**
 * Career paths families think in (Matt, 6 Nov 2026: "should have premed, law, nursing"). None is a
 * federal major family, so each maps to the families that lead there: a college "offers" a path when
 * it offers any of them. Pre-professional paths also count as wanting a strong school (recommend.ts).
 */
export const MAJOR_PATHS: Array<Option & { families: string[]; academic?: boolean }> = [
  { key: "pre_med", label: "Pre-med (doctor, dentist, PA)", families: ["26", "40"], academic: true },
  { key: "nursing", label: "Nursing", families: ["51"] },
  { key: "pre_law", label: "Pre-law", families: ["45", "54", "23", "42"], academic: true },
  { key: "pt_at", label: "Physical therapy or athletic training", families: ["51", "31"] },
  { key: "pre_vet", label: "Pre-vet", families: ["26", "01"], academic: true },
  { key: "sports_mgmt", label: "Sports management", families: ["31", "52"] },
  { key: "finance", label: "Finance and accounting", families: ["52"] },
]
/** With Nursing its own choice, the federal family reads as the rest of health care. */
const FAMILY_LABEL: Record<string, string> = { "51": "Other health professions" }

export const MAJOR_OPTIONS: Option[] = [
  ...MAJOR_PATHS.map(({ key, label }) => ({ key, label })),
  ...MAJOR_FAMILIES.map((m) => ({ key: m.code, label: FAMILY_LABEL[m.code] ?? m.label })),
]

/** The federal major families behind a pick: a path's families, or the family itself. */
export const familiesOf = (code: string): string[] => MAJOR_PATHS.find((p) => p.key === code)?.families ?? [code]
/** A pick that asks for a strong school (pre-med, pre-law, pre-vet). */
export const isAcademicPath = (code: string): boolean => MAJOR_PATHS.some((p) => p.key === code && p.academic)

export const QUESTIONS: Question[] = [
  // ---- Part A: parent. Goals first (goals.ts).
  { id: "P0", key: GOALS_KEY, respondent: "parent", title: "What are your goals for {name}'s college wrestling? Tap your top 3, in order.", sharing: "shared", kind: { type: "top3", options: GOALS.map((g) => ({ key: g.key, label: PARENT_GOAL_LABELS[g.key] ?? g.label })) } },
  { id: "P0b", key: SUCCESS_KEY, respondent: "parent", title: "When {name} finishes college, what would make it a success?", sharing: "private", optional: true, kind: { type: "text" } },
  {
    id: "P1", key: "distance", respondent: "parent", title: "How far from home is too far?", sharing: "shared", marker: true,
    kind: { type: "single", options: [
      { key: "2h", label: "Within about 2 hours' drive" },
      { key: "5h", label: "Within about 5 hours" },
      { key: "day", label: "A day's drive" },
      { key: "anywhere", label: "Anywhere" },
      { key: "close_open", label: "Prefer close, but open" },
    ] },
  },
  {
    id: "P2", key: "budget", respondent: "parent", title: "What yearly cost can your family actually carry, after aid?", sharing: "constraint",
    kind: { type: "single", options: [
      { key: "lt10", label: "Under $10k" },
      { key: "10_20", label: "$10k to $20k" },
      { key: "20_35", label: "$20k to $35k" },
      { key: "35_50", label: "$35k to $50k" },
      { key: "50plus", label: "$50k or more" },
    ] },
  },
  {
    id: "P3", key: "benefits", respondent: "parent", title: "Does any of this apply to your family?", sharing: "private", optional: true,
    kind: { type: "multi", exclusive: ["none"], options: [
      { key: "gi_bill", label: "Transferred GI Bill benefits" },
      { key: "ch35", label: "Chapter 35 or Fry (dependents of disabled or deceased veterans)" },
      { key: "state_guard", label: "State Guard or state veteran tuition help" },
      { key: "remission", label: "A parent works at a college (tuition remission or exchange)" },
      { key: "need_aid", label: "We expect significant need-based aid" },
      { key: "state_grant", label: "A state grant tied to grades" },
      { key: "tribal", label: "Tribal benefits" },
      { key: "foster", label: "Foster-youth tuition waiver" },
      { key: "none", label: "None of these" },
    ] },
  },
  { id: "P5", key: "divisions", respondent: "parent", title: "Which levels are you open to?", sharing: "shared", kind: { type: "grid", rows: PATHWAYS, options: PATHWAY_STATES } },
  { id: "P6", key: "academics", respondent: "parent", title: "What might {name} want to study? Pick any that fit.", sharing: "shared", marker: true, kind: { type: "majors" } },
  {
    id: "P7", key: "school_feel", respondent: "parent", title: "What kind of school feels right?", sharing: "shared",
    kind: { type: "multi", options: [
      { key: "small", label: "Small" }, { key: "medium", label: "Medium" }, { key: "large", label: "Large" },
      { key: "city", label: "City" }, { key: "suburb", label: "Suburban" }, { key: "town", label: "College town" }, { key: "rural", label: "Rural" },
    ] },
  },
  { id: "P8", key: "dealbreaker", respondent: "parent", title: "Anything that's an absolute dealbreaker?", sharing: "private", optional: true, kind: { type: "text" } },

  // ---- Part B: athlete. Goals first (goals.ts).
  { id: "A0", key: GOALS_KEY, respondent: "athlete", title: "What are your goals for college wrestling? Tap your top 3, in order.", sharing: "shared", kind: { type: "top3", options: GOALS } },
  { id: "A0b", key: SUCCESS_KEY, respondent: "athlete", title: "When you finish college, what would make it a success?", sharing: "private", optional: true, kind: { type: "text" } },
  {
    id: "A1", key: "distance", respondent: "athlete", title: "Stay close to home, or get away?", sharing: "shared",
    kind: { type: "single", options: [{ key: "close", label: "Stay close" }, { key: "dont_care", label: "Don't care" }, { key: "away", label: "Get away and see somewhere new" }] },
  },
  {
    id: "A2", key: "first_year", respondent: "athlete", title: "What do you want your first year to look like?", sharing: "shared",
    kind: { type: "single", options: [{ key: "compete_now", label: "Compete for the spot right away" }, { key: "redshirt_ok", label: "Happy to redshirt and develop" }, { key: "no_pref", label: "No preference" }] },
  },
  { id: "A4", key: "divisions", respondent: "athlete", title: "Which levels are you open to?", sharing: "shared", kind: { type: "grid", rows: PATHWAYS, options: PATHWAY_STATES } },
  {
    id: "A4b", key: "service", respondent: "athlete", title: "Would you consider a service academy or ROTC?", sharing: "shared",
    kind: { type: "single", options: [{ key: "interested", label: "Interested" }, { key: "open", label: "Open to hearing about it" }, { key: "not", label: "Not for me" }] },
  },
  { id: "A5", key: "academics", respondent: "athlete", title: "What might you want to study? Pick any that fit.", sharing: "shared", kind: { type: "majors" } },
  {
    id: "A6", key: "college_weight", respondent: "athlete", title: "What weight do you expect to wrestle in college?", sharing: "shared",
    kind: { type: "single", options: [{ key: "current", label: "Current weight" }, { key: "one_up", label: "One class up" }] },
  },
  {
    id: "A7", key: "experience", respondent: "athlete", title: "What kind of college experience sounds right? Pick up to two.", sharing: "shared",
    kind: { type: "multi", max: 2, options: [
      { key: "spirit", label: "Big school spirit and an active social life" },
      { key: "close_knit", label: "Small, close-knit campus" },
      { key: "college_town", label: "Traditional college town" },
      { key: "city", label: "City, with internships and things to do" },
      { key: "team", label: "Strong team community above all" },
    ] },
  },
  { id: "A8", key: "dealbreaker", respondent: "athlete", title: "Anything you'd never want?", sharing: "private", optional: true, kind: { type: "text" } },
  {
    id: "A9", key: "coaching", respondent: "athlete", title: "What do you want most from a college coach and room? Pick up to two.", sharing: "shared",
    kind: { type: "multi", max: 2, options: [
      { key: "development", label: "Individual development and personal attention" },
      { key: "elite_room", label: "A nationally competitive room with elite partners" },
      { key: "mentor", label: "A close coaching relationship, a mentor" },
      { key: "lineup", label: "The clearest path into the lineup" },
      { key: "develops", label: "A program that develops wrestlers like me" },
    ] },
  },
]

/** The home ZIP is collected on the P1 screen, used for distance only, shown nowhere. */
export const HOME_ZIP_KEY = "home_zip"
export const HOME_ZIP_SHARING: SharingClass = "private"

/**
 * A9 shows only in the Building or Active stage, or when the athlete said "compete right away"
 * (A2) or put the highest level in their goals (A0; A3 on sets from before 6 Nov). Until a stage function exists, the stage is the grade:
 * 10th grade and up.
 */
export function showA9(input: { grade: number | null; answers: Record<string, unknown> }): boolean {
  const goals = input.answers[GOALS_KEY]
  if (input.answers.first_year === "compete_now" || (Array.isArray(goals) && goals.includes("level")) || input.answers.level_vs_opportunity === "level") return true
  return input.grade != null && input.grade >= 10
}

/** Nursing has structured variants (direct-entry BSN or pre-nursing): one follow-up when it's picked. */
export function wantsBsnFollowUp(academics: { majors?: string[]; text?: string } | null | undefined): boolean {
  if (!academics) return false
  return (academics.majors ?? []).some((m) => m === "51" || m === "nursing") || /\bnurs/i.test(academics.text ?? "")
}

export function questionsFor(respondent: Respondent, ctx: { grade: number | null; answers: Record<string, unknown> }): Question[] {
  return QUESTIONS.filter((q) => q.respondent === respondent && (q.id !== "A9" || showA9(ctx)))
}

export function questionByKey(respondent: Respondent, key: string): Question | undefined {
  return QUESTIONS.find((q) => q.respondent === respondent && q.key === key)
}

/** Every storable key for a respondent: the questions plus the home ZIP on the parent side, and the BSN follow-up. */
export function storableKeys(respondent: Respondent): string[] {
  return [...QUESTIONS.filter((q) => q.respondent === respondent).map((q) => q.key), ...(respondent === "parent" ? [HOME_ZIP_KEY, "budget_kind"] : []), "bsn"]
}

/** The class an answer starts in. The owner may change it at any time. */
export function defaultSharing(respondent: Respondent, key: string): SharingClass {
  if (key === HOME_ZIP_KEY) return HOME_ZIP_SHARING
  if (key === "budget_kind") return "constraint"
  if (key === "bsn") return "shared"
  return questionByKey(respondent, key)?.sharing ?? "private"
}

/** The plain line on each question screen saying who sees the answer (spec: shown on the screen itself). */
export function sharingLine(cls: SharingClass, respondent: Respondent, wrestlerName?: string | null): string {
  const other = respondent === "parent" ? wrestlerName || "your wrestler" : "your parent"
  if (cls === "shared") return `Shared with ${other}. Coaches never see it.`
  if (cls === "constraint") return "Only you see the number. Scout can use it for your suggestions."
  return "Only you see this."
}
