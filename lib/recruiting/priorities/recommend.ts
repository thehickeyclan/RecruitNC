/**
 * The two suggestion lists (priorities survey v3, part 3; Matt's decisions of 5 Nov 2026). Pure:
 * every fact about a college is handed in, nothing is read here.
 *
 * - Best fit: colleges at a level both sides are open to, ranked by what the family said matters,
 *   where the wrestler's results are not a concern.
 * - Opportunities worth pursuing: colleges with evidence a program could use the wrestler
 *   (projected opportunity at his or her weight in the arrival fall, a coach-posted need, a coach
 *   viewing the profile). A level one side said "not" to, against the other's interest, shows here only.
 *
 * Earned, never padded: at most five each, at most two per level, and only with a real reason.
 *
 * Privacy (sharing.ts): a list is computed for one viewer from `JointInputs` (both sides' Shared
 * answers) plus `ownerOnlyInputs` (the viewer's own Constraint-only and Private answers). Nothing of
 * the other respondent's that is not Shared can reach this function, so it cannot move what the
 * viewer sees. The budget, home ZIP and benefits are the parent's own: they add flags and weight in
 * the parent's view only, unless the parent chose to share them.
 *
 * Cost is never a filter. Above a limit it is a flag ("affordability unverified"), because income is
 * never asked and what a family would actually pay is not known.
 */
import { rankedGoals } from "@/lib/recruiting/priorities/goals"
import { MAJOR_OPTIONS, PATHWAYS, familiesOf, isAcademicPath, type Respondent } from "@/lib/recruiting/priorities/questions"
import type { Answer, JointInputs, PathwayState, Placement } from "@/lib/recruiting/priorities/sharing"
import type { FitStatus } from "@/lib/recruiting/family-fit"

export type Level = "D1" | "D2" | "D3" | "NAIA" | "NJCAA"

/** What we hold about one college for this wrestler. Nothing here comes from survey answers. */
export type CollegeFacts = {
  id: string
  name: string
  level: Level
  state: string
  place: string
  latitude: number
  longitude: number
  inState: boolean
  /** What the level's programs typically recruit against the wrestler's results; and the academic line. */
  athletic: FitStatus
  academic: FitStatus
  /** Federal major-family codes offered; null when majors.json does not cover the school. */
  majors: string[] | null
  undergrads: number | null
  setting: string | null
  /** College weights with nobody projected to still be there in the arrival fall. Empty when unknown. */
  openWeights: number[]
  rosterSeason: string | null
  /** Published yearly cost for this family's state, and the average price after aid (before any athletic scholarship). */
  sticker: number | null
  averageNet: number | null
  calculator: string | null
  serviceAcademy: boolean
  /** Coach views of the profile (subscribers only, else 0) and a coach-posted need at the weight and class. */
  coachViews: number
  coachNeedWeight: number | null
  /** An announced program that has not wrestled yet ("2027-28"). */
  firstSeason: string | null
  /** IPEDS: bachelor's degrees finished within six years, and the admit rate, in percent. Null when not reported. */
  gradRate?: number | null
  admitRate?: number | null
}

export type Weights = {
  /** At or just above the weight last competed, the one below, and one class up. */
  near: number[]
  up: number | null
}

export type Card = {
  id: string
  name: string
  level: Level
  place: string
  why: string[]
  mightNot: string[]
  /** One thing to check next, and where. */
  next: { label: string; href: string }
  /** A projected opportunity is shown: the card carries the season and the caveat. */
  opportunityNote: string | null
}

export type Lists = { bestFit: Card[]; opportunities: Card[]; notes: string[] }

export type RecommendInput = {
  viewer: Respondent
  joint: JointInputs
  /** ownerOnlyInputs(viewer, sets): the viewer's own non-Shared answers, nothing else. */
  own: Answer[]
  colleges: CollegeFacts[]
  weights: Weights
  arrivalFall: number
  firstName: string
  homeState: string
  /** The middle of the family's state, for distance when no home ZIP is visible to this viewer. */
  centre: [number, number] | null
  zipPoint: (zip: string) => [number, number] | null
  /** Colleges this viewer passed on (their own reactions only, reactions.ts passedBy): never re-offered. */
  passed?: ReadonlySet<string>
  /** What this viewer's own reactions taught (learnFromReactions): never the other side's. */
  learned?: Learned
}

const LIST_MAX = 5
const PER_LEVEL = 2
const LEVEL_RANK: Record<Level, number> = { D1: 1, D2: 0.6, D3: 0.45, NAIA: 0.45, NJCAA: 0.25 }
const STATUS: Record<FitStatus, number> = { fit: 1, stretch: 0.3, unknown: 0, concern: -1 }
const DISTANCE_MILES: Record<string, number> = { "2h": 110, "5h": 260, day: 500 }
const DISTANCE_LABEL: Record<string, string> = { "2h": "about 2 hours", "5h": "about 5 hours", day: "a day's drive" }
const BUDGET_MAX: Record<string, number> = { lt10: 10_000, "10_20": 20_000, "20_35": 35_000, "35_50": 50_000 }
/** Each goal (goals.ts) and the dimension it weights. "team" has no college data to rank on yet. */
const GOAL_DIM: Record<string, Dim | null> = { level: "level", pay: "cost", academics: "academic", compete: "opportunity", career: "major", team: null, experience: "feel" }

type Dim = "athletic" | "level" | "opportunity" | "academic" | "strength" | "major" | "distance" | "feel" | "cost"
const DIMS: Dim[] = ["athletic", "level", "opportunity", "academic", "strength", "major", "distance", "feel", "cost"]

/**
 * Learning from reactions (Matt, 6 Nov 2026: "the system should learn from the survey results").
 * Each reason on a pass and each chip on a keep is a small, capped nudge to what counts in this
 * viewer's next lists; the levels they keep count a little more; "too small"/"too big" teach a size.
 * The viewer's own reactions only, like passedBy: the other side's never move this viewer's lists.
 */
export type Learned = { weights: Partial<Record<Dim, number>>; sizes: string[]; levels: Partial<Record<Level, number>>; lines: string[] }
const NUDGE = 0.5
const CAP = 1.5
const REASON_DIM: Record<string, Dim> = { too_far: "distance", cost: "cost", no_major: "major" }
const CHIP_DIM: Record<string, Dim> = { close: "distance", cost: "cost", opening: "opportunity", academics: "strength", level: "level" }
const LEARN_LINE: Partial<Record<Dim, string>> = { distance: "distance from home", cost: "cost", major: "the major", opportunity: "openings at the weight", strength: "academics", level: "level" }

/**
 * What the colleges a family saved to its own list teach (Matt, 6 Nov 2026: "as they put schools on
 * their board we learn"), rather than asking them for a top 3. From three saved colleges up: the
 * levels they save count a little more, a list of strong schools makes academics count, and a list
 * that leans one size teaches that size.
 */
export function learnFromList(saved: ReadonlyArray<{ level: Level | null; strength: number; undergrads: number | null }>, into: Learned): Learned {
  if (saved.length < 3) return into
  const out: Learned = { weights: { ...into.weights }, sizes: into.sizes, levels: { ...into.levels }, lines: [...into.lines] }
  for (const s of saved) if (s.level) out.levels[s.level] = Math.min(0.6, (out.levels[s.level] ?? 0) + 0.1)
  const strong = saved.filter((s) => s.strength >= 0.6).length
  const learned: string[] = []
  if (strong / saved.length >= 0.6) {
    out.weights.strength = Math.min(CAP, (out.weights.strength ?? 0) + NUDGE)
    learned.push("strong academics")
  }
  if (!out.sizes.length) {
    const sizes = saved.filter((s) => s.undergrads != null).map((s) => sizeOf(s.undergrads!))
    for (const z of ["small", "medium", "large"]) {
      if (sizes.length >= 3 && sizes.filter((x) => x === z).length / sizes.length >= 0.6) {
        out.sizes = [z]
        learned.push(`${z} schools`)
      }
    }
  }
  if (learned.length) out.lines.push(`Your list leans toward ${learned.join(" and ")}, so these do too.`)
  return out
}

export function learnFromReactions(mine: Readonly<Record<string, { reaction: string; reason: string | null; chips: ReadonlyArray<string> }>>, levelOf: (id: string) => Level | null): Learned {
  const weights: Partial<Record<Dim, number>> = {}
  const levels: Partial<Record<Level, number>> = {}
  const bump = (d: Dim) => (weights[d] = Math.min(CAP, (weights[d] ?? 0) + NUDGE))
  let small = 0
  let big = 0
  for (const [id, r] of Object.entries(mine)) {
    if (r.reaction === "not_for_us" && r.reason) {
      const d = REASON_DIM[r.reason]
      if (d) bump(d)
      if (r.reason === "too_small") small++
      if (r.reason === "too_big") big++
    }
    if (r.reaction === "closer_look") {
      for (const chip of r.chips) if (CHIP_DIM[chip]) bump(CHIP_DIM[chip])
      const lv = levelOf(id)
      if (lv) levels[lv] = Math.min(0.6, (levels[lv] ?? 0) + 0.2)
    }
  }
  const sizes = small > big ? ["medium", "large"] : big > small ? ["small", "medium"] : []
  const learnedDims = (Object.keys(weights) as Dim[]).map((d) => LEARN_LINE[d]).filter((x): x is string => Boolean(x))
  const lines: string[] = []
  if (learnedDims.length) lines.push(`From your reactions, ${learnedDims.join(", ")} now count${learnedDims.length === 1 ? "s" : ""} for more.`)
  if (sizes.length) lines.push(`From your reactions, ${sizes[0] === "small" ? "smaller" : "bigger"} schools come first.`)
  return { weights, sizes, levels, lines }
}

/**
 * How strong a school is academically, 0 to 1, from federal data: the six-year graduation rate
 * (50% or lower is 0, 95% or higher is 1), plus a little for admitting a quarter or fewer.
 * "academic" (can the wrestler get in) is a different thing: a family that wants the strongest
 * school academically was getting colleges ranked only on whether his grades were enough
 * (Matt, 6 Nov 2026: "when parent answers are in favor of high academic environments your
 * recommendations align").
 */
export function academicStrength(c: Pick<CollegeFacts, "gradRate" | "admitRate">): number {
  if (c.gradRate == null) return 0
  const base = Math.min(1, Math.max(0, (c.gradRate - 50) / 45))
  return Math.min(1, base + (c.admitRate != null && c.admitRate <= 25 ? 0.2 : 0))
}

/** The answers this viewer's list may read: the viewer's own (any class) and the other side's Shared ones. */
function visible(input: Pick<RecommendInput, "viewer" | "joint" | "own">): { parent: Answer[]; athlete: Answer[] } {
  const ownShared = (input.viewer === "parent" ? input.joint.parent : input.joint.athlete)?.answers ?? []
  const otherShared = (input.viewer === "parent" ? input.joint.athlete : input.joint.parent)?.answers ?? []
  const mine = [...ownShared, ...input.own]
  return input.viewer === "parent" ? { parent: mine, athlete: [...otherShared] } : { parent: [...otherShared], athlete: mine }
}

const valueOf = (answers: Answer[], key: string): unknown => {
  const a = answers.find((x) => x.key === key)
  return a && !a.notSure ? a.value : undefined
}
const markerOf = (answers: Answer[], key: string) => answers.find((x) => x.key === key && !x.notSure)?.marker ?? null

function gridOf(answers: Answer[]): Record<string, PathwayState> | null {
  const v = valueOf(answers, "divisions")
  return v && typeof v === "object" ? (v as Record<string, PathwayState>) : null
}

/**
 * Where a level sits in this viewer's lists. Neither side holds a veto: a level leaves the lists
 * only when both said "not"; one "not" against the other's grid sends it to Opportunities only.
 * Before the other side has a grid, the viewer's own "not" governs the viewer's own view, and the
 * other side's "not" governs nothing here.
 */
export function placementFor(viewer: Respondent, grids: { parent: Record<string, PathwayState> | null; athlete: Record<string, PathwayState> | null }, level: Level): Placement {
  const p = grids.parent?.[level]
  const a = grids.athlete?.[level]
  if (p === "not" && a === "not") return "excluded"
  if (p !== "not" && a !== "not") return "primary"
  if (grids.parent && grids.athlete) return "explore"
  const mineSaidNot = viewer === "parent" ? p === "not" : a === "not"
  return mineSaidNot ? "excluded" : "primary"
}

/** Each dimension starts at 1. Each respondent's top 3 goals add 3, 2, 1, averaged over those who answered. */
export function weightsFor(seen: { parent: Answer[]; athlete: Answer[] }): Record<Dim, number> {
  const w = Object.fromEntries(DIMS.map((d) => [d, 1])) as Record<Dim, number>
  // Strength counts a little for everyone (finishing a degree matters to every family) and a lot
  // for a family whose goals are academics or a career.
  w.strength = 0.25
  const tops = [seen.parent, seen.athlete].map((side) => rankedGoals((k) => valueOf(side, k))).filter((t) => t.length > 0)
  for (const top of tops) {
    top.forEach(({ goal, rank: i }) => {
      const dim = GOAL_DIM[goal]
      if (!dim) return
      w[dim] += (3 - i) / tops.length
      // The strongest school academically is about the major too; a career is about academic fit too.
      if (dim === "academic") w.major += (3 - i) / tops.length
      if (dim === "major") w.academic += (3 - i) / (2 * tops.length)
      if (goal === "academics") w.strength += (1.25 * (3 - i)) / tops.length
      if (goal === "career") w.strength += (3 - i) / (2 * tops.length)
    })
  }
  // Sets from before 6 Nov: distance was a top-3 factor (it has its own question now, no goal), and
  // the retired level-or-opportunity answer added a half alongside the top 3.
  for (const side of [seen.parent, seen.athlete]) {
    if (valueOf(side, "goals") !== undefined) continue
    const old = valueOf(side, "top3")
    if (!Array.isArray(old)) continue
    const at = old.slice(0, 3).indexOf("distance")
    if (at >= 0) w.distance += (3 - at) / Math.max(1, tops.length)
    const lvo = valueOf(side, "level_vs_opportunity")
    if (lvo === "level") w.level += 0.5
    if (lvo === "opportunity") w.opportunity += 0.5
  }
  if (valueOf(seen.athlete, "first_year") === "compete_now") w.opportunity += 0.5
  return w
}

const sizeOf = (n: number) => (n < 5_000 ? "small" : n <= 15_000 ? "medium" : "large")
const settingOf = (s: string | null) => (!s ? null : /city/i.test(s) ? "city" : /suburb/i.test(s) ? "suburb" : /town/i.test(s) ? "town" : /rural/i.test(s) ? "rural" : null)
/** A7 (the athlete's experience) in P7's words. */
const EXPERIENCE_FEEL: Record<string, string> = { spirit: "large", close_knit: "small", college_town: "town", city: "city" }

function milesBetween(a: [number, number], b: [number, number]): number {
  const r = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

const money = (n: number) => `$${Math.round(n / 1000)}k`

type Scored = { c: CollegeFacts; placement: Placement; score: number; card: Card; evidence: number }

export function recommend(input: RecommendInput): Lists {
  const seen = visible(input)
  const w = weightsFor(seen)
  // Must-have filters (below); strong doubles the dimension's weight, flexible halves it.
  const MARKER_X: Record<string, number> = { strong: 2, flexible: 0.5 }
  w.distance *= MARKER_X[markerOf(seen.parent, "distance") ?? ""] ?? 1
  w.major *= MARKER_X[markerOf(seen.parent, "academics") ?? ""] ?? 1
  for (const [d, n] of Object.entries(input.learned?.weights ?? {})) w[d as Dim] += n ?? 0
  const grids = { parent: gridOf(seen.parent), athlete: gridOf(seen.athlete) }
  const name = input.firstName

  // Distance: from the home ZIP only when this viewer may see it, else the middle of the state.
  const zip = valueOf(seen.parent, "home_zip")
  const origin = (typeof zip === "string" ? input.zipPoint(zip) : null) ?? input.centre
  const distance = valueOf(seen.parent, "distance") as string | undefined
  const distanceMust = markerOf(seen.parent, "distance") === "must"
  const athleteDistance = valueOf(seen.athlete, "distance") as string | undefined

  // Majors wanted by either side (Shared, or the viewer's own); a parent's must-have filters where we know the majors.
  const wanted = new Set<string>()
  for (const side of [seen.parent, seen.athlete]) {
    const v = valueOf(side, "academics") as { majors?: string[] } | undefined
    for (const m of v?.majors ?? []) wanted.add(m)
  }
  const majorMust = markerOf(seen.parent, "academics") === "must" && wanted.size > 0
  // Pre-med, pre-law and pre-vet ask for a strong school.
  if ([...wanted].some(isAcademicPath)) w.strength += 1

  // Feel: P7 sizes and settings, and A7 read the same way.
  const feel = new Set<string>([
    ...((valueOf(seen.parent, "school_feel") as string[] | undefined) ?? []),
    ...((valueOf(seen.athlete, "experience") as string[] | undefined) ?? []).map((e) => EXPERIENCE_FEEL[e]).filter(Boolean),
  ])
  // A size the family named wins; else one their reactions taught.
  const named = ["small", "medium", "large"].filter((s) => feel.has(s))
  const wantSizes = named.length ? named : (input.learned?.sizes ?? [])
  const wantSettings = ["city", "suburb", "town", "rural"].filter((s) => feel.has(s))

  const service = valueOf(seen.athlete, "service") as string | undefined
  const oneUp = valueOf(seen.athlete, "college_weight") === "one_up" && input.weights.up != null
  const targetWeights = oneUp ? [input.weights.up!] : input.weights.near

  // The budget is the parent's (Constraint-only by default): in this list only if this viewer may see it.
  const budget = valueOf(seen.parent, "budget") as string | undefined
  const budgetMax = budget ? (BUDGET_MAX[budget] ?? null) : null
  const budgetKind = valueOf(seen.parent, "budget_kind") === "limit" ? "limit" : "target"
  const benefits = (valueOf(seen.parent, "benefits") as string[] | undefined) ?? []

  const scored: Scored[] = []
  for (const c of input.colleges) {
    const placement = placementFor(input.viewer, grids, c.level)
    if (placement === "excluded") continue
    if (input.passed?.has(c.id)) continue
    if (c.serviceAcademy && service === "not") continue
    const miles = origin ? milesBetween(origin, [c.latitude, c.longitude]) : null
    const limit = distance ? DISTANCE_MILES[distance] : undefined
    if (distanceMust && limit != null && miles != null && miles > limit) continue
    const offers = c.majors ? [...wanted].filter((m) => familiesOf(m).some((f) => c.majors!.includes(f))) : null
    if (majorMust && offers && offers.length === 0) continue

    const why: string[] = []
    const mightNot: string[] = []
    const strength = academicStrength(c)
    const dim: Record<Dim, number> = { athletic: STATUS[c.athletic], level: 0, opportunity: 0, academic: STATUS[c.academic], strength, major: 0, distance: 0, feel: 0, cost: 0 }

    if (c.athletic === "fit") why.push(`Results fit ${c.level}`)
    if (c.athletic === "stretch") mightNot.push(`A reach for ${c.level} on results so far`)
    if (c.athletic === "concern") mightNot.push(`Results so far are below what ${c.level} programs usually recruit`)
    if (c.athletic !== "concern") dim.level = LEVEL_RANK[c.level]
    if (c.academic === "fit") why.push("Academic fit")
    if (c.academic === "concern") mightNot.push("Grades or scores are below the usual range")
    if (w.strength >= 1 && strength >= 0.6 && c.gradRate != null) why.push(`Strong academics: ${c.gradRate}% graduate`)

    const open = c.openWeights.find((x) => targetWeights.includes(x)) ?? null
    if (open != null) {
      dim.opportunity = 1
      why.unshift(`Projected opportunity at ${open} in fall ${input.arrivalFall}`)
    }
    if (c.coachNeedWeight != null) why.unshift(`The coaches posted a need at ${c.coachNeedWeight}`)
    if (c.coachViews > 0) why.push(c.coachViews === 1 ? `A coach viewed ${name}'s profile` : `Coaches viewed ${name}'s profile ${c.coachViews} times`)

    if (wanted.size && offers) {
      dim.major = offers.length ? 1 : -1
      if (offers.length) why.push(`Offers ${MAJOR_OPTIONS.find((m) => m.key === offers[0])?.label ?? "the major you picked"}`)
      else mightNot.push("Doesn't list the majors you picked")
    }

    if (miles != null) {
      if (limit != null) {
        dim.distance = miles <= limit ? 1 : -1
        if (miles > limit) mightNot.push(`Farther than ${DISTANCE_LABEL[distance!]} from home`)
      } else if (distance === "close_open") dim.distance = Math.max(-1, 1 - miles / 250)
      if (athleteDistance === "close") dim.distance += Math.max(-1, 1 - miles / 250)
      if (athleteDistance === "away") dim.distance += miles > 260 ? 0.5 : -0.3
    }
    if (c.inState) why.push("In your state")

    if (c.undergrads != null && wantSizes.length) {
      const s = sizeOf(c.undergrads)
      dim.feel += wantSizes.includes(s) ? 0.5 : -0.5
      if (wantSizes.includes(s)) why.push(`A ${s} school`)
    }
    const set = settingOf(c.setting)
    if (set && wantSettings.length) {
      dim.feel += wantSettings.includes(set) ? 0.5 : -0.5
      if (wantSettings.includes(set)) why.push(set === "town" ? "A college town" : set === "suburb" ? "A suburban campus" : `A ${set} campus`)
    }

    const price = c.averageNet ?? c.sticker
    if (budgetMax != null && price != null) {
      // A budget nudges, never decides (Matt, 6 Nov 2026): published prices are before merit aid and
      // athletic money, which can move a college well under the family's number. Over budget costs a
      // college a little; under budget helps a little.
      dim.cost = price <= budgetMax ? 0.4 : -0.2
      if (price > budgetMax && budgetKind === "limit") {
        mightNot.unshift(c.averageNet != null ? `Affordability unverified: ${money(c.averageNet)} on average after aid, above your limit` : `Affordability unverified: ${money(c.sticker!)} sticker price, above your limit`)
      }
    }

    if (c.serviceAcademy && service === "interested") dim.level += 0.5
    if (grids.parent?.[c.level] === "interested" || grids.athlete?.[c.level] === "interested") dim.level += 0.3
    dim.level += input.learned?.levels[c.level] ?? 0
    if (placement === "explore") mightNot.push(`One of you isn't interested in ${c.level}. Worth a look before you rule it out.`)
    if (c.firstSeason) mightNot.push(`A new program: first season ${c.firstSeason}`)

    // Best fit ranks on fit; an opening at the weight counts there only as far as the family said competing early matters.
    // Opportunities rank on the evidence first.
    const score = DIMS.reduce((n, d) => n + (d === "opportunity" ? w[d] - 1 : w[d]) * dim[d], 0)
    const evidence = (c.coachNeedWeight != null ? 3 : 0) + (c.coachViews > 0 ? 2 : 0) + (open != null ? 1 : 0)
    // The one thing to check next: the open question that matters most for this college.
    const next =
      budgetMax != null && price != null && price > budgetMax && c.calculator
        ? { label: "Run the net price calculator", href: c.calculator }
        : open != null
          ? { label: `See who's at ${open} in fall ${input.arrivalFall}`, href: `/recruiting/schools/${c.id}#room` }
          : { label: "See the program", href: `/recruiting/schools/${c.id}` }
    if (!why.length) continue
    scored.push({
      c,
      placement,
      score,
      evidence,
      card: {
        id: c.id,
        name: c.name,
        level: c.level,
        place: c.place,
        why: why.slice(0, 3),
        mightNot: mightNot.slice(0, 2),
        next,
        opportunityNote: open != null ? `From the ${c.rosterSeason ?? "current"} roster. Transfers and new recruits can change this.` : null,
      },
    })
  }

  // Ties (common: most colleges read the same on a young wrestler's results) go to the stronger school, never the alphabet.
  const order = (a: Scored, b: Scored) => b.score - a.score || (b.c.gradRate ?? 0) - (a.c.gradRate ?? 0) || a.c.name.localeCompare(b.c.name)
  const take = (pool: Scored[], taken: Set<string>): Card[] => {
    const perLevel = new Map<string, number>()
    const out: Card[] = []
    for (const s of pool) {
      if (out.length >= LIST_MAX || taken.has(s.c.id)) continue
      const n = perLevel.get(s.c.level) ?? 0
      if (n >= PER_LEVEL) continue
      perLevel.set(s.c.level, n + 1)
      taken.add(s.c.id)
      out.push(s.card)
    }
    return out
  }

  const taken = new Set<string>()
  // Best fit needs two reasons: one alone (a major, a state) is not a fit.
  const bestFit = take(scored.filter((s) => s.placement === "primary" && s.c.athletic !== "concern" && s.score > 0 && s.card.why.length >= 2).sort(order), taken)
  const opportunities = take(scored.filter((s) => s.evidence > 0).sort((a, b) => b.evidence - a.evidence || order(a, b)), taken)

  const notes: string[] = [...(input.learned?.lines ?? [])]
  if (budgetMax != null || budget === "50plus") {
    const flagged = [...bestFit, ...opportunities].some((c) => c.mightNot.some((m) => m.startsWith("Affordability unverified")))
    notes.push(
      `${input.viewer === "parent" ? "Your budget shapes only your view. " : ""}Prices are published figures${flagged ? ". Affordability unverified means what your family would actually pay isn't known yet: the net price calculator gives your own number" : ", never what your family would pay"}.`,
    )
  }
  if (benefits.some((b) => b !== "none")) notes.push("The benefits you marked aren't in these prices yet. Ask each aid office how they apply.")
  return { bestFit, opportunities, notes }
}

export type SurveyLine = { key: "level" | "distance" | "major" | "feel" | "cost"; label: string; status: FitStatus; text: string }

const LEVEL_NAME: Record<Level, string> = { D1: "Division I", D2: "Division II", D3: "Division III", NAIA: "NAIA", NJCAA: "Junior college" }
const roundMiles = (m: number) => (m < 20 ? Math.round(m) : Math.round(m / 10) * 10)

/**
 * One college against the family's own survey answers, a line per answer (Matt, 6 Nov 2026: on a
 * college page, "something that tells them if this aligns to their responses"). Never one score:
 * each line says what we compared, so a family can see why. Same reading of the answers as
 * recommend() above (the same visible answers, distance origin, majors and budget), so the page and
 * the suggestions agree. A question not answered has no line; an answer we have no data to check
 * reads "Not enough to say", never a guess.
 */
export function surveyFitFor(input: Pick<RecommendInput, "viewer" | "joint" | "own" | "centre" | "zipPoint">, c: CollegeFacts): SurveyLine[] {
  const seen = visible(input)
  const out: SurveyLine[] = []

  const grids = { parent: gridOf(seen.parent), athlete: gridOf(seen.athlete) }
  if (grids.parent || grids.athlete) {
    const placement = placementFor(input.viewer, grids, c.level)
    const keen = grids.parent?.[c.level] === "interested" || grids.athlete?.[c.level] === "interested"
    out.push({
      key: "level",
      label: "Level",
      status: placement === "excluded" ? "concern" : placement === "explore" ? "stretch" : "fit",
      text:
        placement === "excluded"
          ? `${LEVEL_NAME[c.level]}: a level you said no to.`
          : placement === "explore"
            ? `${LEVEL_NAME[c.level]}: one of you isn't interested in this level.`
            : `${LEVEL_NAME[c.level]}: a level you're ${keen ? "interested in" : "open to"}.`,
    })
  }

  const distance = (valueOf(seen.parent, "distance") as string | undefined) ?? (valueOf(seen.athlete, "distance") === "close" ? "close_open" : undefined)
  if (distance) {
    const zip = valueOf(seen.parent, "home_zip")
    const fromZip = typeof zip === "string" ? input.zipPoint(zip) : null
    const origin = fromZip ?? input.centre
    const miles = origin ? milesBetween(origin, [c.latitude, c.longitude]) : null
    const where = miles != null && miles < 10 ? `Under 10 miles from ${fromZip ? "home" : "the middle of your state"}` : `About ${miles != null ? roundMiles(miles) : 0} miles from ${fromZip ? "home" : "the middle of your state"}`
    const limit = DISTANCE_MILES[distance]
    const must = markerOf(seen.parent, "distance") === "must"
    if (miles == null) out.push({ key: "distance", label: "Distance", status: "unknown", text: "Not enough to say: we don't know where home is." })
    else if (distance === "anywhere") out.push({ key: "distance", label: "Distance", status: "fit", text: `${where}. You said anywhere.` })
    else if (limit != null)
      out.push(
        miles <= limit
          ? { key: "distance", label: "Distance", status: "fit", text: `${where}, within ${DISTANCE_LABEL[distance]}.` }
          : { key: "distance", label: "Distance", status: must ? "concern" : "stretch", text: `${where}, farther than ${DISTANCE_LABEL[distance]}.` },
      )
    else out.push({ key: "distance", label: "Distance", status: miles <= 250 ? "fit" : "stretch", text: miles <= 250 ? `${where}, close to home.` : `${where}. Farther than you'd prefer, but you said you're open.` })
  }

  const wanted = new Set<string>()
  for (const side of [seen.parent, seen.athlete]) for (const m of (valueOf(side, "academics") as { majors?: string[] } | undefined)?.majors ?? []) wanted.add(m)
  if (wanted.size) {
    const label = (k: string) => MAJOR_OPTIONS.find((m) => m.key === k)?.label ?? "the major you picked"
    const offers = c.majors ? [...wanted].filter((m) => familiesOf(m).some((f) => c.majors!.includes(f))) : null
    const must = markerOf(seen.parent, "academics") === "must"
    if (!offers) out.push({ key: "major", label: "Major", status: "unknown", text: "Not enough to say: we don't have this college's list of majors." })
    else if (offers.length) out.push({ key: "major", label: "Major", status: "fit", text: `Offers ${offers.map(label).join(", ")}.` })
    else out.push({ key: "major", label: "Major", status: must ? "concern" : "stretch", text: `Doesn't list ${[...wanted].map(label).join(" or ")}.` })
  }

  const feel = new Set<string>([
    ...((valueOf(seen.parent, "school_feel") as string[] | undefined) ?? []),
    ...((valueOf(seen.athlete, "experience") as string[] | undefined) ?? []).map((e) => EXPERIENCE_FEEL[e]).filter(Boolean),
  ])
  const wantSizes = ["small", "medium", "large"].filter((x) => feel.has(x))
  const wantSettings = ["city", "suburb", "town", "rural"].filter((x) => feel.has(x))
  if (wantSizes.length || wantSettings.length) {
    const size = c.undergrads != null ? sizeOf(c.undergrads) : null
    const set = settingOf(c.setting)
    const parts: string[] = []
    const checks: boolean[] = []
    if (wantSizes.length && size) {
      parts.push(`A ${size} school (${c.undergrads!.toLocaleString("en-US")} undergrads)`)
      checks.push(wantSizes.includes(size))
    }
    if (wantSettings.length && set) {
      parts.push(set === "town" ? "in a college town" : set === "suburb" ? "on a suburban campus" : `on a ${set} campus`)
      checks.push(wantSettings.includes(set))
    }
    if (!checks.length) out.push({ key: "feel", label: "Campus", status: "unknown", text: "Not enough to say: we don't have this college's size or setting." })
    else {
      const met = checks.filter(Boolean).length
      const joined = parts.join(" ")
      const text = joined.charAt(0).toUpperCase() + joined.slice(1)
      out.push({ key: "feel", label: "Campus", status: met === checks.length ? "fit" : "stretch", text: `${text}. ${met === checks.length ? "What you said feels right." : met ? "Partly what you described." : "Not what you described."}` })
    }
  }

  const budget = valueOf(seen.parent, "budget") as string | undefined
  if (budget) {
    const price = c.averageNet ?? c.sticker
    const basis = c.averageNet != null ? "on average after aid" : "published price, before aid"
    const max = BUDGET_MAX[budget] ?? null
    if (price == null) out.push({ key: "cost", label: "Cost", status: "unknown", text: "Not enough to say: this college's price isn't published in the federal data." })
    else if (max == null || price <= max) out.push({ key: "cost", label: "Cost", status: "fit", text: `About ${money(price)} a year (${basis}), within your budget.` })
    else
      out.push({
        key: "cost",
        label: "Cost",
        status: "stretch",
        text: `About ${money(price)} a year (${basis}), above your budget. Merit aid and athletic money can bring it down; the college's net price calculator gives your own number.`,
      })
  }
  return out
}

/** Every pathway, so callers and tests share the level list. */
export const LEVELS = PATHWAYS.map((p) => p.key) as Level[]
