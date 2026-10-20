/**
 * The family's four-part fit for one college, shared by Compare and the college's own page
 * (15 Oct 2026). The family is read once (loadFamilyFitContext); each college is then worked out
 * from facts (collegeFitFor). Nothing here is stored or shown to a coach.
 */
import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { mostRecentGraduatedClassYear, seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import majorsData from "@/lib/college-programs/majors.json"
import { fitForSchool, netPriceFor, satTotalRange, type CollegeFit, type NetPrice } from "@/lib/college-programs/fit"
import { depthAtWeights, depthFor, nearestCollegeWeights, type TeamDepth, type WeightLine } from "@/lib/college-programs/roster-depth"
import { roomByWeight, roomFor, weightsPublished, type WeightRow } from "@/lib/college-programs/roster-room"
import { yearlyCostFor } from "@/lib/college-programs/tuition"
import { DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { readWentHereSnapshot, snapshotForState } from "@/lib/college-programs/went-here-snapshot"
import { familyState } from "@/lib/recruiting/family-state"
import { parseGpa, standingOf, type Standing } from "@/lib/college-programs/went-here-stats"
import { loadAthleteCredentials } from "@/lib/credentials/athlete-credentials"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { EMPTY_PROFILE, academicFit, athleticFit, cleanProfile, costFit, goalsFit, milesBetween, type FamilyFitProfile, type FitLine } from "@/lib/recruiting/family-fit"
import ncZips from "@/lib/recruiting/nc-zips.json"

const MAJORS = majorsData.majors as Record<string, string[]>
const NC_ZIPS = ncZips.zips as Record<string, number[]>
const spoken = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").trim()

export type FamilyFitContext = {
  team: "mens" | "womens" | null
  among: "men" | "women" | "wrestlers"
  first: string | null
  sat: number | null
  act: number | null
  /** The weight the wrestler last competed at, never the profile's listed one. */
  weight: number | null
  /** The wrestler's high school class: the fall they would arrive at college. */
  classYear: number | null
  profile: FamilyFitProfile
  profileSet: boolean
  home: [number, number] | null
  mine: Standing | null
  myGpa: number | null
  snapshot: Awaited<ReturnType<typeof readWentHereSnapshot>>
}

/** The family's wrestler (the oldest still in school) and their own fit profile. */
export async function loadFamilyFitContext(admin: SupabaseClient, userId: string, team: "mens" | "womens" | null): Promise<FamilyFitContext> {
  const ids = await familyAthleteIds(admin, userId)
  const { data: rows } = ids.length
    ? await admin.from("athletes").select('id, name, wrestling_name, "firstName", "lastName", highschool, graduationyear, gender, weightclass, college, college_id, academic_gpa, academic_sat, academic_act, nhsca_results, super32_results').in("id", ids)
    : { data: [] }
  const graduated = mostRecentGraduatedClassYear()
  const wrestler = (rows ?? [])
    .filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
    .sort((a, b) => Number(a.graduationyear ?? 9999) - Number(b.graduationyear ?? 9999))[0]
  const first = wrestler ? String(wrestler.firstName ?? "").trim() || String(wrestler.name ?? "").split(" ")[0] || null : null
  const { data: account } = await admin.auth.admin.getUserById(userId)
  const profile = cleanProfile(account?.user?.user_metadata?.family_fit ?? EMPTY_PROFILE)
  const [mine, snapshot, last] = await Promise.all([
    wrestler ? loadAthleteCredentials(admin, wrestler as unknown as Record<string, unknown>).then(standingOf) : Promise.resolve(null),
    // The family's own state's alumni only (RecruitNC: NC, RecruitSC: SC).
    familyState(admin, userId).then(async (state) => snapshotForState(await readWentHereSnapshot(), state)),
    wrestler
      ? loadLastCompeted(admin, [String(wrestler.id)], new Map([[String(wrestler.id), wrestler.graduationyear ? Number(wrestler.graduationyear) : null]])).then((m) => m.get(String(wrestler.id)) ?? null)
      : Promise.resolve(null),
  ])
  return {
    team,
    among: team === "womens" ? "women" : team === "mens" ? "men" : "wrestlers",
    first,
    sat: Number(String(wrestler?.academic_sat ?? "").replace(/[^0-9]/g, "")) || null,
    act: Number(String(wrestler?.academic_act ?? "").replace(/[^0-9]/g, "")) || null,
    weight: Number(String(last?.weight ?? "").replace(/[^0-9]/g, "")) || null,
    classYear: Number(wrestler?.graduationyear) || null,
    profile,
    profileSet: Boolean(profile.majors.length || profile.budget || profile.maxMiles || profile.size || profile.settings.length),
    home: profile.homeZip ? ((NC_ZIPS[profile.homeZip] as [number, number] | undefined) ?? null) : null,
    mine,
    myGpa: parseGpa(wrestler?.academic_gpa),
    snapshot,
  }
}

export type CollegeFitResult = {
  fit: CollegeFit | null
  net: NetPrice | null
  cost: { amount: number; year: string } | null
  depth: TeamDepth | null
  atWeight: WeightLine[] | null
  /** The room at the wrestler's college weights in the fall they would arrive; null when the team prints too few weights. */
  room: { arrival: number; rows: WeightRow[] } | null
  lines: { athletic: FitLine; academic: FitLine; cost: FitLine; goals: FitLine }
}

/** The four parts of fit for one college, with the facts behind them. */
export function collegeFitFor(ctx: FamilyFitContext, school: CollegeMapSchool, income: number | null): CollegeFitResult {
  const { team, among } = ctx
  const fit = fitForSchool(school.id)
  const cost = yearlyCostFor(school.id, school.state)
  const net = fit ? netPriceFor(fit, school.state, income) : null
  const rosterTeam = team ?? (school.programs.some((p) => p.mens) ? "mens" : "womens")
  const depth = depthFor(school.id, rosterTeam)
  const near = ctx.weight ? nearestCollegeWeights(ctx.weight, rosterTeam) : []
  const atWeight = depth && near.length ? depthAtWeights(depth, near) : null
  const arrival = ctx.classYear ?? seniorClassYear()
  const teamRoom = roomFor(school.id, rosterTeam)
  const room = teamRoom && near.length && weightsPublished(teamRoom) ? { arrival, rows: roomByWeight(teamRoom, rosterTeam, arrival).filter((r) => near.includes(r.weight)) } : null
  const division = (team ? school.programs.find((p) => p[team])?.division : null) ?? school.programs[0]?.division
  const group = (ctx.snapshot?.commits ?? []).filter((c) => c.division === division && (!team || c.gender === team)).map((c) => c.standing)
  const schoolGpa = (team ? ctx.snapshot?.gpaBySchoolGender?.[`${school.id}|${team}`] : ctx.snapshot?.gpaBySchool[school.id]) ?? null
  const levelGpa = division ? ((team ? ctx.snapshot?.gpaByDivisionGender?.[`${division}|${team}`] : ctx.snapshot?.gpaByDivision[division]) ?? null) : null
  const gpaGroup = schoolGpa
    ? { ...schoolGpa, label: `NC ${among} who went to ${spoken(school.name)}` }
    : levelGpa
      ? { ...levelGpa, label: `NC ${among} who went ${division ? DIVISION_SHORT[division] : ""}` }
      : null
  const satR = fit ? satTotalRange(fit) : [null, null]
  const { sat, act, myGpa, profile, home } = ctx
  return {
    fit,
    net,
    cost,
    depth,
    atWeight,
    room,
    lines: {
      athletic: division
        ? athleticFit(ctx.mine, group, DIVISION_SHORT[division], among, ctx.first ?? "Your wrestler")
        : { status: "unknown", text: `No ${among === "women" ? "women's" : "men's"} team.` },
      academic: academicFit({
        sat: sat && satR[0] != null && satR[1] != null ? { score: sat, low: satR[0], high: satR[1] } : null,
        act: act && fit?.act[0] != null && fit.act[1] != null ? { score: act, low: fit.act[0], high: fit.act[1] } : null,
        gpa: myGpa != null && gpaGroup ? { mine: myGpa, average: gpaGroup.average, count: gpaGroup.count, label: gpaGroup.label } : null,
        admitRate: fit?.admitRate ?? null,
      }),
      cost: costFit({ netPrice: net?.amount ?? null, netNote: net?.note ?? "", published: cost?.amount ?? null, budget: profile.budget }),
      goals: goalsFit(profile, {
        majors: MAJORS[school.id] ?? null,
        miles: home ? milesBetween(home, [school.latitude, school.longitude]) : null,
        undergrads: fit?.undergrads ?? null,
        setting: fit?.setting ?? null,
      }),
    },
  }
}
