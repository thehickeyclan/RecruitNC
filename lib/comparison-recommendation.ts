/**
 * The comparison's bottom line: which wrestler we'd lean toward, and why, in three sentences.
 *
 * Matt asked for a recommendation (9 October 2026). It is decided here by fixed rules, in this
 * order, and the page only prints the result - a recommendation a coach cannot trace back to the
 * rows below it is worse than none:
 *
 *   1. Must-haves. With a perfect recruit saved, one wrestler meeting every must-have and the
 *      other missing one settles it. A program that says "Class of 2028 or nothing" means it.
 *   2. Head to head. The latest meeting inside 12 months decides, unless that wrestler is behind
 *      on edges - then it is a counterpoint, not the answer.
 *   3. A clear lead on edges: two or more categories more than the other wrestler.
 *   4. Otherwise, too close to call, saying what each one leads on.
 *
 * It says "lean", never "pick": it is built from the results we hold, and says so.
 */
import type { FitCheck } from "@/lib/program-fit"

export type RecommendationInput = {
  leftName: string
  rightName: string
  /** Categories each wrestler holds on the rows shown, head to head and common opponents included. */
  edges: { left: string[]; right: string[] }
  /** Who holds the head-to-head under the 12-month rule, and the meeting that decided it. */
  headToHead: { edge: "left" | "right" | null; lastEvent: string | null; lastDate: string | null } | null
  /** Perfect-recruit checks, when the program saved one. */
  fit: { left: FitCheck[]; right: FitCheck[] } | null
  /** One-line facts from the sections, used as supporting reasons when they favour the pick. */
  bestWins: { edge: "left" | "right" | null; summary: string } | null
  national: { leftPlacings: number; rightPlacings: number } | null
}

export type Recommendation = {
  pick: "left" | "right" | null
  /** "We'd lean Richards." / "Too close to call." */
  headline: string
  reasons: string[]
  /** The strongest point for the other wrestler, when there is one. */
  counterpoint: string | null
}

function surname(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] ?? name
}

function list(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

const other = (side: "left" | "right") => (side === "left" ? "right" : "left")

export function recommend(input: RecommendationInput): Recommendation {
  const name = (side: "left" | "right") => surname(side === "left" ? input.leftName : input.rightName)
  const edgeCount = (side: "left" | "right") => input.edges[side].length
  const mustMisses = (side: "left" | "right") =>
    (input.fit?.[side] ?? []).filter((c) => c.mustHave && c.status === "miss").map((c) => c.label)
  const h2h = input.headToHead?.edge ?? null
  const meeting = [input.headToHead?.lastEvent, input.headToHead?.lastDate].filter(Boolean).join(", ")

  let pick: "left" | "right" | null = null
  const reasons: string[] = []
  let counterpoint: string | null = null

  // 1. Must-haves.
  const lm = mustMisses("left")
  const rm = mustMisses("right")
  if (input.fit && lm.length !== rm.length && (lm.length === 0 || rm.length === 0)) {
    pick = lm.length === 0 ? "left" : "right"
    const misses = pick === "left" ? rm : lm
    reasons.push(`Meets all your must-haves; ${name(other(pick))} misses ${list(misses)}.`)
  }

  // 2. Head to head, when the holder is not behind on edges.
  if (!pick && h2h && edgeCount(h2h) >= edgeCount(other(h2h))) {
    pick = h2h
    reasons.push(`Won their most recent meeting${meeting ? ` (${meeting})` : ""}.`)
  }

  // 3. A clear lead on edges.
  const lead = edgeCount("left") - edgeCount("right")
  if (!pick && Math.abs(lead) >= 2) pick = lead > 0 ? "left" : "right"

  if (pick) {
    const mine = input.edges[pick]
    const theirs = input.edges[other(pick)]
    const onEdges = mine.filter((e) => e !== "Head to head")
    if (onEdges.length) {
      reasons.push(`Leads ${mine.length}–${theirs.length} on the categories you count${onEdges.length ? `: ${list(onEdges.slice(0, 3))}` : ""}.`)
    }
    if (input.bestWins?.edge === pick && !mine.includes("Strength of opponents")) reasons.push(input.bestWins.summary)
    const np = input.national
    if (np) {
      const [a, b] = pick === "left" ? [np.leftPlacings, np.rightPlacings] : [np.rightPlacings, np.leftPlacings]
      if (a > b) reasons.push(`More national placings (${a} to ${b}).`)
    }
    // The other side's best argument, said plainly.
    if (h2h && h2h !== pick) counterpoint = `But ${name(h2h)} won their most recent meeting${meeting ? ` (${meeting})` : ""}.`
    else if (theirs.length) counterpoint = `${name(other(pick))} leads on ${list(theirs.slice(0, 3))}.`
    if (input.fit && lm.length && rm.length) {
      reasons.unshift("Neither wrestler meets all your must-haves.")
    }
    return { pick, headline: `We'd lean ${name(pick)}.`, reasons: reasons.slice(0, 3), counterpoint }
  }

  // 4. Too close to call.
  const l = input.edges.left
  const r = input.edges.right
  const parts = [
    l.length ? `${name("left")} leads on ${list(l.slice(0, 3))}` : null,
    r.length ? `${name("right")} on ${list(r.slice(0, 3))}` : null,
  ].filter(Boolean)
  return {
    pick: null,
    headline: "Too close to call.",
    reasons: [parts.length ? `${parts.join("; ")}.` : "Nothing on the rows you count separates them."],
    counterpoint: null,
  }
}
