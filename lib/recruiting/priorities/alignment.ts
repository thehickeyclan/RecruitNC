/**
 * The alignment card (priorities v3, part 5): where the parent and the wrestler line up and where
 * they differ. Built ONLY from JointInputs (each side's Shared answers) and reactions as this viewer
 * may see them (reactions.ts reactionsFor strips the other side's non-Shared reasons). It can never
 * read a budget, ZIP, benefit or dealbreaker, so the other side can't infer one from it.
 *
 * Written from the viewer's side: "You" and the other person's name. No question marks.
 */
import { GOAL_SHORT, goalsOf } from "./goals"
import { MAJOR_OPTIONS, PATHWAYS, type Respondent } from "./questions"
import { DONT_KNOW, reasonLabel, type ReactionsView } from "./reactions"
import { answerOf, type JointInputs, type SharedAnswers } from "./sharing"

export type AlignmentLine = { topic: string; text: string }
export type Alignment = { agree: AlignmentLine[]; differ: AlignmentLine[] }

const MAX_EACH = 4
const LEVEL_SHORT: Record<string, string> = { D1: "D1", D2: "D2", D3: "D3", NAIA: "NAIA", NJCAA: "junior college" }
const MAJOR = Object.fromEntries(MAJOR_OPTIONS.map((m) => [m.key, m.label]))
const LEVEL_VS: Record<string, string> = { level: "the highest level possible", balance: "a balance of level and college experience", opportunity: "the best chance to compete" }

/** An answered, sure, Shared value; undefined for skipped or "not sure". */
function sure(side: SharedAnswers | null, key: string): unknown {
  const a = answerOf(side, key)
  return a && !a.notSure ? a.value : undefined
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

/** Parent P1 and athlete A1 on one scale: near, far, or no view. */
function parentReach(v: unknown): "near" | "far" | null {
  if (v === "2h" || v === "5h" || v === "close_open") return "near"
  if (v === "day" || v === "anywhere") return "far"
  return null
}
function athleteReach(v: unknown): "near" | "far" | null {
  return v === "close" ? "near" : v === "away" ? "far" : null
}

export function alignmentFor(input: {
  viewer: Respondent
  joint: JointInputs
  reactions: ReactionsView
  /** The other side as named on the card: the wrestler's first name, or "your parent". */
  other: string
  /** College names for the reactions lines. */
  schoolName: (id: string) => string | null
}): Alignment | null {
  const { joint } = input
  if (!joint.parent || !joint.athlete) return null
  const mine = input.viewer === "parent" ? joint.parent : joint.athlete
  const theirs = input.viewer === "parent" ? joint.athlete : joint.parent
  const Other = input.other.charAt(0).toUpperCase() + input.other.slice(1)
  const agree: AlignmentLine[] = []
  const differ: AlignmentLine[] = []

  // Levels: both interested, and one in while the other is out (the level then sits on Opportunities).
  const gm = sure(mine, "divisions") as Record<string, string> | undefined
  const gt = sure(theirs, "divisions") as Record<string, string> | undefined
  if (gm && gt) {
    const both = PATHWAYS.filter((p) => gm[p.key] === "interested" && gt[p.key] === "interested").map((p) => LEVEL_SHORT[p.key])
    if (both.length) agree.push({ topic: "levels", text: `You both want ${list(both)}.` })
    for (const p of PATHWAYS) {
      const a = gm[p.key]
      const b = gt[p.key]
      if (a === "interested" && b === "not") differ.push({ topic: "levels", text: `${LEVEL_SHORT[p.key]}: you're interested, ${input.other} is not. It stays on Opportunities.` })
      if (a === "not" && b === "interested") differ.push({ topic: "levels", text: `${LEVEL_SHORT[p.key]}: ${input.other} is interested, you are not. It stays on Opportunities.` })
    }
  }

  // Distance.
  const pr = parentReach(sure(joint.parent, "distance"))
  const ar = athleteReach(sure(joint.athlete, "distance"))
  if (pr && ar) {
    if (pr === ar) agree.push({ topic: "distance", text: pr === "near" ? "You both lean toward staying close to home." : "You're both open to going farther from home." })
    else {
      const nearSide = (input.viewer === "parent") === (pr === "near") ? "You" : Other
      const farSide = nearSide === "You" ? input.other : "you"
      differ.push({ topic: "distance", text: `Distance: ${nearSide} lean${nearSide === "You" ? "" : "s"} close to home, ${farSide} ${farSide === "you" ? "want" : "wants"} to get farther away.` })
    }
  }

  // Level or opportunity (retired 6 Nov; sets from before then): the same three keys on both sides.
  const lm = sure(mine, "level_vs_opportunity") as string | undefined
  const lt = sure(theirs, "level_vs_opportunity") as string | undefined
  if (lm && lt && LEVEL_VS[lm] && LEVEL_VS[lt]) {
    if (lm === lt) agree.push({ topic: "level", text: `You both put ${LEVEL_VS[lm]} first.` })
    else if ((lm === "level" && lt === "opportunity") || (lm === "opportunity" && lt === "level"))
      differ.push({ topic: "level", text: `You lean toward ${LEVEL_VS[lm]}. ${Other} leans toward ${LEVEL_VS[lt]}.` })
  }

  // Goals (goals.ts; sets from before 6 Nov read their old top 3).
  const tm = goalsOf((k) => sure(mine, k))
  const tt = goalsOf((k) => sure(theirs, k))
  if (tm.length && tt.length) {
    const shared = tm.filter((k) => tt.includes(k))
    if (shared.length) agree.push({ topic: "goals", text: shared.length === 1 ? `You both have ${GOAL_SHORT[shared[0]]} in your top 3.` : `You both have these in your top 3: ${shared.map((k) => GOAL_SHORT[k]).join("; ")}.` })
    if (tm[0] !== tt[0]) differ.push({ topic: "goals", text: `Your #1 goal is ${GOAL_SHORT[tm[0]]}. ${Other}'s is ${GOAL_SHORT[tt[0]]}.` })
    // The level-set: one side's top 3 is all wrestling, the other's has school or what comes after.
    const life = (g: string[]) => g.filter((k) => k === "academics" || k === "career" || k === "pay")
    const lifeM = life(tm)
    const lifeT = life(tt)
    if (lifeM.length && !lifeT.length) differ.push({ topic: "goals", text: `Your top 3 has ${GOAL_SHORT[lifeM[0]]}. ${Other}'s top 3 is all wrestling and college life.` })
    if (lifeT.length && !lifeM.length) differ.push({ topic: "goals", text: `${Other}'s top 3 has ${GOAL_SHORT[lifeT[0]]}. Yours is all wrestling and college life.` })
  }

  // Majors.
  const mm = (sure(mine, "academics") as { majors?: string[] } | undefined)?.majors ?? []
  const mt = (sure(theirs, "academics") as { majors?: string[] } | undefined)?.majors ?? []
  const majors = mm.filter((m) => mt.includes(m) && MAJOR[m])
  if (majors.length) agree.push({ topic: "majors", text: `You both picked ${list(majors.map((m) => MAJOR[m]))}.` })

  // Reactions on the same college (the other side's as this viewer may see them).
  for (const [id, t] of Object.entries(input.reactions.theirs)) {
    const m = input.reactions.mine[id]
    const name = input.schoolName(id)
    if (!m || !name) continue
    const pass = (r: typeof m) => r.reaction === "not_for_us" && r.reason !== DONT_KNOW
    const why = (r: typeof m) => (r.reason && r.reason !== DONT_KNOW ? ` (${reasonLabel(r.reason)?.toLowerCase()})` : "")
    if (m.reaction === "closer_look" && t.reaction === "closer_look") agree.push({ topic: "colleges", text: `You both want a closer look at ${name}.` })
    else if (m.reaction === "closer_look" && pass(t)) differ.push({ topic: "colleges", text: `You kept ${name}. ${Other} passed${why(t)}. Worth a look together.` })
    else if (pass(m) && t.reaction === "closer_look") differ.push({ topic: "colleges", text: `${Other} kept ${name}. You passed${why(m)}. Worth a look together.` })
  }

  if (!agree.length && !differ.length) return null
  // Colleges first: a named college is the most useful thing to talk through.
  const first = (l: AlignmentLine[]) => [...l.filter((x) => x.topic === "colleges"), ...l.filter((x) => x.topic !== "colleges")].slice(0, MAX_EACH)
  return { agree: first(agree), differ: first(differ) }
}
