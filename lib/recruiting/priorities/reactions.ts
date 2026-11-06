/**
 * Reactions on suggested colleges (priorities v3, part 4): Worth a closer look / Maybe / Not for us,
 * each tied to the stored batch that showed the card. Pure: the API and the lists read through here.
 *
 * Rules from the spec:
 * - "Worth a closer look" saves to the reactor's own My List (the API does that).
 * - "Maybe" is the investigate-next task: the card's next step goes on the family's To check line.
 * - "Don't know it" is not a pass. The college stays offered, as new to them, with a way to learn it.
 * - A pass keeps the college out of that reactor's next lists only. The other side's lists never
 *   read it (each viewer's lists are their answers plus their own reactions).
 * - Reactions are Shared by default; a Cost reason takes the budget's class (sharing.ts), so the
 *   other side then sees "Not for us" without the reason.
 * - Never coach-visible, in any form.
 */
import type { Respondent, SharingClass } from "./questions"
import { reactionSeenBy, type Reaction, type ReactionKind } from "./sharing"

export const REACTIONS: ReadonlyArray<{ key: ReactionKind; label: string }> = [
  { key: "closer_look", label: "Worth a closer look" },
  { key: "maybe", label: "Maybe" },
  { key: "not_for_us", label: "Not for us" },
]

/** One optional tap on a pass. */
export const PASS_REASONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "too_far", label: "Too far" },
  { key: "too_small", label: "Too small" },
  { key: "too_big", label: "Too big" },
  { key: "cost", label: "Cost" },
  { key: "wrong_level", label: "Wrong level" },
  { key: "no_major", label: "Doesn't have the major" },
  { key: "dont_know", label: "Don't know it" },
  { key: "not_feeling", label: "Just not feeling it" },
]

/** Optional chips on a keep: what landed. */
export const KEEP_CHIPS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "close", label: "Close" },
  { key: "cost", label: "Cost" },
  { key: "opening", label: "Opening at the weight" },
  { key: "academics", label: "Academics" },
  { key: "level", label: "Level" },
]

export const DONT_KNOW = "dont_know"

export const isReactionKind = (v: unknown): v is ReactionKind => REACTIONS.some((r) => r.key === v)
export const reasonLabel = (key: string | null) => PASS_REASONS.find((r) => r.key === key)?.label ?? null
export const chipLabel = (key: string) => KEEP_CHIPS.find((c) => c.key === key)?.label ?? key

/** A reason only on a pass, and only one we offer; chips only on a keep, deduped. */
export function cleanReaction(reaction: ReactionKind, reason: unknown, chips: unknown): { reason: string | null; chips: string[] } {
  const r = reaction === "not_for_us" && PASS_REASONS.some((p) => p.key === reason) ? String(reason) : null
  const c = reaction === "closer_look" && Array.isArray(chips) ? [...new Set(chips.filter((x): x is string => KEEP_CHIPS.some((k) => k.key === x)))] : []
  return { reason: r, chips: c }
}

export type ReactionRow = {
  school_id: string
  respondent: Respondent
  reaction: ReactionKind
  reason: string | null
  chips: string[] | null
  sharing: SharingClass
  created_at: string
}

/** What a viewer shows on a card: their own latest reaction, and what they may see of the other side's. */
export type SeenReaction = { reaction: ReactionKind; reason: string | null; chips: string[] }
export type ReactionsView = { mine: Record<string, SeenReaction>; theirs: Record<string, SeenReaction> }

/** The latest reaction per respondent and college wins; the other side's goes through reactionSeenBy. */
export function reactionsFor(viewer: Respondent, rows: ReadonlyArray<ReactionRow>): ReactionsView {
  const latest = new Map<string, ReactionRow>()
  for (const r of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) latest.set(`${r.respondent}:${r.school_id}`, r)
  const view: ReactionsView = { mine: {}, theirs: {} }
  for (const r of latest.values()) {
    const full: Reaction = { schoolId: r.school_id, respondent: r.respondent, reaction: r.reaction, reason: r.reason, chips: r.chips ?? [], sharing: r.sharing }
    const seen = reactionSeenBy(viewer, full)
    ;(r.respondent === viewer ? view.mine : view.theirs)[r.school_id] = { reaction: seen.reaction, reason: seen.reason, chips: [...seen.chips] }
  }
  return view
}

/** Colleges this viewer passed (not "Don't know it"): kept out of their next lists. */
export function passedBy(mine: ReactionsView["mine"]): Set<string> {
  return new Set(Object.entries(mine).filter(([, r]) => r.reaction === "not_for_us" && r.reason !== DONT_KNOW).map(([id]) => id))
}

/** How the other side's reaction reads on a card. No question marks. */
export function theirLine(who: string, r: SeenReaction): string {
  const label = r.reaction === "not_for_us" && r.reason === DONT_KNOW ? "Doesn't know it yet" : (REACTIONS.find((x) => x.key === r.reaction)?.label ?? "")
  const why = r.reaction === "not_for_us" && r.reason && r.reason !== DONT_KNOW ? reasonLabel(r.reason) : r.chips.length ? r.chips.map(chipLabel).join(", ") : null
  return `${who}: ${label}${why ? ` · ${why.toLowerCase()}` : ""}`
}
