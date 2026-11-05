/**
 * Who may see, and what may shape, each priorities answer (survey v3, "Sharing & privacy"; Matt's
 * decisions of 5 Nov 2026). Every reader of priorities answers goes through this file.
 *
 * - Shared: both respondents see it; it may shape joint outputs (lists, chips, alignment).
 * - Constraint-only and Private: only the owner sees it, and it shapes only the owner's own view.
 *   Nothing joint is ever computed from them, so the other respondent cannot diff a joint list,
 *   a chip or a version summary to infer them (the inference-leak rule).
 * - Coaches are outside this system: no function here takes a coach viewer.
 *
 * Joint outputs take a `JointInputs`, which only `jointInputs()` can build, from Shared answers only.
 */
import type { Marker, Respondent, SharingClass } from "@/lib/recruiting/priorities/questions"

export type Answer = {
  key: string
  value: unknown
  marker?: Marker | null
  notSure?: boolean
  sharing: SharingClass
}

export type AnswerSet = {
  id: string
  respondent: Respondent
  version: number
  completedAt: string | null
  answers: Answer[]
}

export type FamilySets = { parent: AnswerSet | null; athlete: AnswerSet | null }

declare const sharedOnly: unique symbol
/** Answers proven Shared. Only jointInputs() makes these. */
export type SharedAnswers = { readonly [sharedOnly]: true; readonly answers: ReadonlyArray<Answer> }
export type JointInputs = { parent: SharedAnswers | null; athlete: SharedAnswers | null }

const shared = (set: AnswerSet | null): SharedAnswers | null =>
  set ? ({ answers: set.answers.filter((a) => a.sharing === "shared").map((a) => ({ ...a })) } as unknown as SharedAnswers) : null

/** The only inputs a joint output may read: each side's Shared answers, nothing else. */
export function jointInputs(sets: FamilySets): JointInputs {
  return { parent: shared(sets.parent), athlete: shared(sets.athlete) }
}

/** What one respondent sees: all of their own answers, and only the other side's Shared ones. */
export function viewFor(viewer: Respondent, sets: FamilySets): { own: Answer[]; other: Answer[] } {
  const mine = viewer === "parent" ? sets.parent : sets.athlete
  const theirs = viewer === "parent" ? sets.athlete : sets.parent
  return { own: mine?.answers.map((a) => ({ ...a })) ?? [], other: theirs?.answers.filter((a) => a.sharing === "shared").map((a) => ({ ...a })) ?? [] }
}

/** The owner's own non-joint inputs (their Constraint-only and Private answers): their view only. */
export function ownerOnlyInputs(viewer: Respondent, sets: FamilySets): Answer[] {
  const mine = viewer === "parent" ? sets.parent : sets.athlete
  return mine?.answers.filter((a) => a.sharing !== "shared").map((a) => ({ ...a })) ?? []
}

export const answerOf = (s: SharedAnswers | null, key: string): Answer | undefined => s?.answers.find((a) => a.key === key)

// ---- divisions: neither respondent holds a veto

export type PathwayState = "interested" | "open" | "not"
export type Placement = "primary" | "explore" | "excluded"

const gridOf = (s: SharedAnswers | null): Record<string, PathwayState> | null => {
  const a = answerOf(s, "divisions")
  return a && !a.notSure && a.value && typeof a.value === "object" ? (a.value as Record<string, PathwayState>) : null
}

/**
 * Where a pathway sits in the joint recommendations. Only an explicit "Not interested" moves
 * anything, and a pathway leaves the joint primary lists only when both respondents said so.
 * One "Not interested" against the other's interest keeps it explorable (the opportunities area)
 * and puts the difference on the alignment card. Unanswered is open. A grid that is not Shared
 * does not exist for this purpose.
 */
export function jointPlacement(joint: JointInputs, pathway: string): Placement {
  const p = gridOf(joint.parent)?.[pathway]
  const a = gridOf(joint.athlete)?.[pathway]
  if (p === "not" && a === "not") return "excluded"
  if (p === "not" || a === "not") {
    // Before the other side has a grid, one person's answer governs only their own view.
    if (!gridOf(joint.parent) || !gridOf(joint.athlete)) return "primary"
    return "explore"
  }
  return "primary"
}

/** A respondent's own view is always filterable by their own grid. */
export function ownPlacement(own: Answer[], pathway: string): Placement {
  const a = own.find((x) => x.key === "divisions")
  const state = a && !a.notSure && a.value && typeof a.value === "object" ? (a.value as Record<string, PathwayState>)[pathway] : undefined
  return state === "not" ? "excluded" : state === "open" ? "explore" : "primary"
}

// ---- reactions on suggested colleges

export type ReactionKind = "closer_look" | "maybe" | "not_for_us"
export type Reaction = { schoolId: string; respondent: Respondent; reaction: ReactionKind; reason: string | null; chips: string[]; sharing: SharingClass }

/** Reactions are Shared by default; a Cost reason on a pass takes the budget's class. */
export function reactionSharing(reaction: ReactionKind, reason: string | null, budgetClass: SharingClass): SharingClass {
  if (reaction === "not_for_us" && reason === "cost") return budgetClass
  return "shared"
}

/** What the other respondent sees of a reaction: the reaction always, the reason and chips only when Shared. */
export function reactionSeenBy(viewer: Respondent, r: Reaction): Reaction | { schoolId: string; respondent: Respondent; reaction: ReactionKind; reason: null; chips: [] } {
  if (viewer === r.respondent || r.sharing === "shared") return r
  return { schoolId: r.schoolId, respondent: r.respondent, reaction: r.reaction, reason: null, chips: [] }
}
