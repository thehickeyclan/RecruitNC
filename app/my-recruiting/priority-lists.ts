import "server-only"

import { createHash } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import { seniorClassYear } from "@/lib/class-years"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { schoolLogoUrl } from "@/lib/college-programs/logo"
import majorsData from "@/lib/college-programs/majors.json"
import data from "@/lib/college-programs/programs-2026-27.json"
import { COLLEGE_WEIGHTS, nearestCollegeWeights } from "@/lib/college-programs/roster-depth"
import { roomByWeight, roomFor, weightsPublished } from "@/lib/college-programs/roster-room"
import { tuitionForSchool } from "@/lib/college-programs/tuition"
import { DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { collegeFitFor, loadFamilyFitContext, type FamilyFitContext } from "@/lib/recruiting/college-fit"
import { collegeViewsFor } from "@/lib/recruiting/college-views"
import ncZips from "@/lib/recruiting/nc-zips.json"
import { loadNeedsForAthlete } from "@/lib/recruiting/needs-server"
import { shortListLine, type ShortListReason } from "@/lib/recruiting/priorities/copy"
import type { Respondent } from "@/lib/recruiting/priorities/questions"
import { recommend, type Card, type CollegeFacts, type Level } from "@/lib/recruiting/priorities/recommend"
import { jointInputs, ownerOnlyInputs } from "@/lib/recruiting/priorities/sharing"
import { TABLE_MISSING, loadFamilySets, respondentFor } from "@/lib/recruiting/priorities/store"

const ALL = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]
const NC_ZIPS = ncZips.zips as Record<string, number[]>
const MAJORS = majorsData.majors as Record<string, string[]>
/** Bump when the engine's output changes shape or meaning, so stored lists are made again. */
const ENGINE_VERSION = 1
const REUSE_DAYS = 7
const spoken = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").trim()

export type ListCard = Card & { logo: string | null }
export type PriorityListsView = {
  respondent: Respondent
  bestFit: ListCard[]
  opportunities: ListCard[]
  notes: string[]
  /** Whose answers shaped the lists, in words. */
  shapedBy: string
  shortLine: string | null
  batchIds: { bestFit: string | null; opportunities: string | null }
}

type Stored = { inputs: string; cards: ListCard[]; notes?: string[] }

/**
 * The two lists for this login and wrestler, once either side has finished its set; null before
 * that (the starter set stays). Stored in suggestion_batches so part 4's reactions tie to the
 * exact list a family saw, and reused while the answers this viewer may read are unchanged and the
 * list is under a week old. The reuse key is a hash of exactly those inputs, so tightening an
 * answer's sharing makes a new list for the other side at once.
 */
export async function priorityLists(
  admin: SupabaseClient,
  opts: { viewerId: string; athleteId: string; team: "mens" | "womens" | null; includeViews: boolean; store: boolean },
): Promise<PriorityListsView | null> {
  const respondent = await respondentFor(admin, opts.viewerId, opts.athleteId)
  if (!respondent) return null
  let sets
  try {
    sets = await loadFamilySets(admin, opts.athleteId)
  } catch (e) {
    if ((e as { code?: string } | null)?.code === TABLE_MISSING) return null
    throw e
  }
  if (!sets.parent?.completedAt && !sets.athlete?.completedAt) return null
  const joint = jointInputs(sets)
  const own = ownerOnlyInputs(respondent, sets)
  const inputs = createHash("sha256")
    .update(JSON.stringify({ v: ENGINE_VERSION, respondent, joint, own, team: opts.team, views: opts.includeViews }))
    .digest("hex")

  const other = respondent === "parent" ? sets.athlete : sets.parent
  const mine = respondent === "parent" ? sets.parent : sets.athlete
  const ctxPromise = loadFamilyFitContext(admin, opts.viewerId, opts.team, opts.athleteId)

  const { data: prior } = await admin
    .from("suggestion_batches")
    .select("id, list_kind, items, generated_at")
    .eq("athlete_id", opts.athleteId)
    .eq("respondent", respondent)
    .in("list_kind", ["best_fit", "opportunity"])
    .order("generated_at", { ascending: false })
    .limit(4)
  const fresh = (kind: string) => {
    const row = (prior ?? []).find((r) => r.list_kind === kind)
    const items = row?.items as Stored | undefined
    return row && items?.inputs === inputs && Date.now() - new Date(String(row.generated_at)).getTime() < REUSE_DAYS * 86_400_000 ? { id: String(row.id), items } : null
  }
  const ctx = await ctxPromise
  const name = ctx.first ?? "your wrestler"
  const otherName = respondent === "parent" ? name : "your parent"
  const shapedBy = !mine?.completedAt
    ? `From ${respondent === "parent" ? `${name}'s` : "your parent's"} shared answers. Finish yours to shape them too.`
    : other?.completedAt
      ? `From your answers and ${respondent === "parent" ? `${name}'s` : "your parent's"} shared answers.`
      : `From your answers. They change when ${otherName} answers too.`
  const shortReason: ShortListReason | null = opts.team === "womens" ? "womens" : ctx.homeState !== "NC" ? "out_of_state" : ctx.mine == null ? "no_results" : null

  const reuseBest = fresh("best_fit")
  const reuseOpp = fresh("opportunity")
  if (reuseBest && reuseOpp) {
    return view(respondent, reuseBest.items.cards, reuseOpp.items.cards, reuseBest.items.notes ?? [], shapedBy, shortReason, name, { bestFit: reuseBest.id, opportunities: reuseOpp.id })
  }

  const facts = await collegeFactsFor(admin, ctx, { athleteId: opts.athleteId, team: opts.team, includeViews: opts.includeViews })
  const lists = recommend({
    viewer: respondent,
    joint,
    own,
    ...facts,
    firstName: name,
    homeState: ctx.homeState,
    zipPoint: (z) => (NC_ZIPS[z] as [number, number] | undefined) ?? null,
  })
  const withLogos = (cards: Card[]) => Promise.all(cards.map(async (c) => ({ ...c, logo: await schoolLogoUrl({ id: c.id, name: c.name }).catch(() => null) })))
  const [best, opp] = await Promise.all([withLogos(lists.bestFit), withLogos(lists.opportunities)])

  let batchIds: PriorityListsView["batchIds"] = { bestFit: null, opportunities: null }
  if (opts.store) {
    const base = { athlete_id: opts.athleteId, respondent, parent_set_id: sets.parent?.id ?? null, athlete_set_id: sets.athlete?.id ?? null }
    const { data: rows } = await admin
      .from("suggestion_batches")
      .insert([
        { ...base, list_kind: "best_fit", items: { inputs, cards: best, notes: lists.notes } satisfies Stored },
        { ...base, list_kind: "opportunity", items: { inputs, cards: opp } satisfies Stored },
      ])
      .select("id, list_kind")
    batchIds = {
      bestFit: rows?.find((r) => r.list_kind === "best_fit")?.id ?? null,
      opportunities: rows?.find((r) => r.list_kind === "opportunity")?.id ?? null,
    }
  }
  return view(respondent, best, opp, lists.notes, shapedBy, shortReason, name, batchIds)
}

/** Every college's facts for this wrestler, from data we hold; nothing from survey answers. */
export async function collegeFactsFor(
  admin: SupabaseClient,
  ctx: FamilyFitContext,
  opts: { athleteId: string; team: "mens" | "womens" | null; includeViews: boolean },
): Promise<{ colleges: CollegeFacts[]; weights: { near: number[]; up: number | null }; arrivalFall: number; centre: [number, number] | null }> {
  const team = opts.team
  const arrival = ctx.classYear ?? seniorClassYear()
  const [views, needs] = await Promise.all([
    opts.includeViews ? collegeViewsFor(admin, [opts.athleteId]).catch(() => new Map()) : Promise.resolve(new Map()),
    loadNeedsForAthlete(admin, opts.athleteId).catch(() => []),
  ])
  const needAt = new Map<string, number>()
  for (const n of needs) if (n.mapSchoolId && !needAt.has(n.mapSchoolId)) needAt.set(n.mapSchoolId, n.weight)

  const colleges: CollegeFacts[] = []
  const now = new Date()
  const seasonStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  const nearFor = (t: "mens" | "womens") => (ctx.weight ? nearestCollegeWeights(ctx.weight, t) : [])
  const upFor = (t: "mens" | "womens") => {
    const at = nearFor(t)[0]
    const classes: readonly number[] = COLLEGE_WEIGHTS[t]
    return at != null ? (classes.find((c) => c > at) ?? null) : null
  }
  for (const s of ALL) {
    const program = team ? s.programs.find((p) => p[team]) : s.programs[0]
    if (!program) continue
    const rosterTeam = team ?? (s.programs.some((p) => p.mens) ? "mens" : "womens")
    const fit = collegeFitFor(ctx, s, null)
    const room = roomFor(s.id, rosterTeam)
    const watch = [...nearFor(rosterTeam), upFor(rosterTeam)].filter((x): x is number => x != null)
    // A projected opening is claimed only from a current or last-season roster, and only where the
    // weight is clear the year before arrival as well as the arrival fall (a one-year band, so one
    // projected graduation never makes the claim on its own).
    const recent = room && Number(room.season.slice(0, 4)) >= seasonStart - 1
    const clearIn = (fall: number) => new Set(roomByWeight(room!, rosterTeam, fall).filter((r) => r.staying === 0).map((r) => r.weight))
    const openWeights = room && recent && weightsPublished(room) ? [...clearIn(arrival)].filter((w) => watch.includes(w) && clearIn(arrival - 1).has(w)) : []
    const t = tuitionForSchool(s.id)
    colleges.push({
      id: s.id,
      name: spoken(s.name),
      level: DIVISION_SHORT[program.division] as Level,
      state: s.state,
      place: `${s.city}, ${s.state}`,
      latitude: s.latitude,
      longitude: s.longitude,
      inState: s.state === ctx.homeState,
      athletic: fit.lines.athletic.status,
      academic: fit.lines.academic.status,
      majors: MAJORS[s.id] ?? null,
      undergrads: fit.fit?.undergrads ?? null,
      setting: fit.fit?.setting ?? null,
      openWeights,
      rosterSeason: room?.season ?? null,
      sticker: fit.cost?.amount ?? null,
      averageNet: fit.net?.amount ?? null,
      calculator: fit.fit?.netPriceCalculatorUrl ?? null,
      serviceAcademy: Boolean(t && t.inState === 0 && (t.outOfState ?? 0) === 0),
      coachViews: views.get(s.id)?.views ?? 0,
      coachNeedWeight: needAt.get(s.id) ?? null,
      firstSeason: s.firstSeason ?? null,
    })
  }
  const inState = ALL.filter((s) => s.state === ctx.homeState)
  const centre: [number, number] | null = inState.length ? [inState.reduce((n, s) => n + s.latitude, 0) / inState.length, inState.reduce((n, s) => n + s.longitude, 0) / inState.length] : null
  const team0 = team ?? "mens"
  return { colleges, weights: { near: nearFor(team0), up: upFor(team0) }, arrivalFall: arrival, centre }
}

function view(
  respondent: Respondent,
  bestFit: ListCard[],
  opportunities: ListCard[],
  notes: string[],
  shapedBy: string,
  shortReason: ShortListReason | null,
  name: string,
  batchIds: PriorityListsView["batchIds"],
): PriorityListsView {
  const short = bestFit.length + opportunities.length < 6 && shortReason ? shortListLine(shortReason, name) : null
  return { respondent, bestFit, opportunities, notes, shapedBy, shortLine: short, batchIds }
}
