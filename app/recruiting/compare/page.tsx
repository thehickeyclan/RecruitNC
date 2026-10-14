/**
 * Compare colleges side by side, for one family's wrestler (lib/college-programs/fit.ts).
 *
 * The family picks two to four colleges from My List. Each row is a fact about the college; where
 * the wrestler's own record makes a comparison mechanical (test scores against the middle half of
 * admitted students, cost for the family's income) it is marked, and nothing is said beyond it.
 * Part of NC United Blue. The wrestler's grades and the family's income are read for this page
 * only: income is never stored, and none of it is shown to a coach.
 */
import type { Metadata } from "next"
import { Fragment } from "react"
import { redirect } from "next/navigation"

import data from "@/lib/college-programs/programs-2026-27.json"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { INCOME_BRACKETS, fitForSchool, netPriceFor, satTotalRange, scorePlacement, type Placement } from "@/lib/college-programs/fit"
import { rosterForSchool } from "@/lib/college-programs/rosters"
import majorsData from "@/lib/college-programs/majors.json"
import { readWentHereSnapshot } from "@/lib/college-programs/went-here-snapshot"
import { parseGpa, standingOf } from "@/lib/college-programs/went-here-stats"
import { loadAthleteCredentials } from "@/lib/credentials/athlete-credentials"
import { EMPTY_PROFILE, academicFit, athleticFit, cleanProfile, costFit, fitScore, goalsFit, milesBetween, type FitLine, type FitStatus } from "@/lib/recruiting/family-fit"
import ncZips from "@/lib/recruiting/nc-zips.json"
import { FamilyFitForm } from "@/components/colleges/family-fit-form"
import { depthAtWeights, depthFor, nearestCollegeWeights } from "@/lib/college-programs/roster-depth"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { teamRankingsForSchool } from "@/lib/college-programs/team-rankings-snapshot"
import { yearlyCostFor } from "@/lib/college-programs/tuition"
import { DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { familyAthleteIds } from "@/lib/coach-messages"
import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Compare colleges | RecruitNC" }

const SCHOOLS = new Map([...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s]))
const MAX = 4
const dollars = (n: number) => `$${n.toLocaleString("en-US")}`
const spoken = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").trim()

const MARK: Record<Placement, { text: string; className: string }> = {
  above: { text: "Above most admitted students", className: "text-emerald-300" },
  within: { text: "Within the middle half", className: "text-white" },
  below: { text: "Below most admitted students", className: "text-amber-200" },
}

type Cell = { main: string; sub?: string; className?: string }

const MAJORS = majorsData.majors as Record<string, string[]>
const NC_ZIPS = ncZips.zips as Record<string, number[]>
/** Athletic fit is a target to build toward, so it is never called a "concern". */
const ATHLETIC_STATUS: Record<FitStatus, { label: string; className: string }> = {
  fit: { label: "In line with what they recruit", className: "text-emerald-300" },
  stretch: { label: "Close", className: "text-amber-200" },
  concern: { label: "Still building toward it", className: "text-white" },
  unknown: { label: "Not enough to say", className: "text-white/60" },
}
const STATUS: Record<FitStatus, { label: string; className: string }> = {
  fit: { label: "Good fit", className: "text-emerald-300" },
  stretch: { label: "Stretch", className: "text-amber-200" },
  concern: { label: "Concern", className: "text-red-300" },
  unknown: { label: "Not enough to say", className: "text-white/60" },
}

export default async function ComparePage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {}
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/signin?returnTo=%2Frecruiting%2Fcompare")
  const admin = createAdminClient()
  const portal = await resolvePortalViewer({ supabase, admin })
  const userId = portal.userId ?? auth.user.id
  const blue = Boolean(portal.viewer.isBlueMember || portal.viewer.isAdmin)

  const [{ data: list }, focus, ids] = await Promise.all([
    admin.from("college_list_items").select("school_id, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
    familyFocus(admin, userId),
    familyAthleteIds(admin, userId),
  ])
  const saved = (list ?? []).map((r) => SCHOOLS.get(String(r.school_id))).filter((s): s is CollegeMapSchool => Boolean(s))
  const asked = String(params.s ?? "").split(",").filter(Boolean)
  const chosen = (asked.length ? asked.map((id) => SCHOOLS.get(id)).filter((s): s is CollegeMapSchool => Boolean(s)) : saved).slice(0, MAX)
  const income = params.income != null && /^[0-4]$/.test(params.income) ? Number(params.income) : null
  const askedStep = params.step === "colleges" || params.step === "matters" || params.step === "results" ? params.step : null

  // The wrestler being compared: the oldest still in school, whose own scores sit beside each college's.
  const { data: rows } = ids.length
    ? await admin.from("athletes").select('id, name, wrestling_name, "firstName", "lastName", highschool, graduationyear, gender, weightclass, college, college_id, academic_gpa, academic_sat, academic_act, nhsca_results, super32_results').in("id", ids)
    : { data: [] }
  const graduated = mostRecentGraduatedClassYear()
  const wrestler = (rows ?? [])
    .filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
    .sort((a, b) => Number(a.graduationyear ?? 9999) - Number(b.graduationyear ?? 9999))[0]
  const first = wrestler ? String(wrestler.firstName ?? "").trim() || String(wrestler.name ?? "").split(" ")[0] : null
  const sat = Number(String(wrestler?.academic_sat ?? "").replace(/[^0-9]/g, "")) || null
  const act = Number(String(wrestler?.academic_act ?? "").replace(/[^0-9]/g, "")) || null
  const team = focus?.gender ?? null
  // The family's own fit profile, from their account (the previewed family's, on a developer's machine).
  const { data: account } = await admin.auth.admin.getUserById(userId)
  const profile = cleanProfile(account?.user?.user_metadata?.family_fit ?? EMPTY_PROFILE)
  const profileSet = Boolean(profile.majors.length || profile.budget || profile.maxMiles || profile.size || profile.settings.length)
  const home = profile.homeZip ? (NC_ZIPS[profile.homeZip] as [number, number] | undefined) ?? null : null
  const mine = wrestler ? standingOf(await loadAthleteCredentials(admin, wrestler as unknown as Record<string, unknown>)) : null
  const myGpa = parseGpa(wrestler?.academic_gpa)
  const snapshot = await readWentHereSnapshot()
  const among = team === "womens" ? "women" : team === "mens" ? "men" : "wrestlers"
  // The weight the wrestler last competed at, never the profile's listed one (it goes stale).
  const last = wrestler ? (await loadLastCompeted(admin, [String(wrestler.id)], new Map([[String(wrestler.id), wrestler.graduationyear ? Number(wrestler.graduationyear) : null]]))).get(String(wrestler.id)) : null
  const weight = Number(String(last?.weight ?? "").replace(/[^0-9]/g, "")) || null

  const columns = await Promise.all(
    chosen.map(async (school) => {
      const fit = fitForSchool(school.id)
      const cost = yearlyCostFor(school.id, school.state)
      const rankings = (await teamRankingsForSchool(school.id)).filter((r) => !team || r.gender === team)
      const roster = rosterForSchool(school.id)
      const ncOnRoster = roster.wrestlers.filter((w) => !team || w.team === team).length
      const satRange = fit ? satTotalRange(fit) : ([null, null] as [null, null])
      const satMark = scorePlacement(sat, satRange)
      const actMark = fit ? scorePlacement(act, fit.act) : null
      const net = fit ? netPriceFor(fit, school.state, income) : null
      const programs = school.programs.filter((p) => !team || p[team])
      const rosterTeam = team ?? (school.programs.some((p) => p.mens) ? "mens" : "womens")
      const depth = depthFor(school.id, rosterTeam)
      const near = weight ? nearestCollegeWeights(weight, rosterTeam) : []
      const atWeight = depth && near.length ? depthAtWeights(depth, near) : null
      // The four parts of fit for this college.
      const division = (team ? school.programs.find((p) => p[team])?.division : null) ?? school.programs[0]?.division
      const group = (snapshot?.commits ?? []).filter((c) => c.division === division && (!team || c.gender === team)).map((c) => c.standing)
      const schoolGpa = (team ? snapshot?.gpaBySchoolGender?.[`${school.id}|${team}`] : snapshot?.gpaBySchool[school.id]) ?? null
      const levelGpa = division ? ((team ? snapshot?.gpaByDivisionGender?.[`${division}|${team}`] : snapshot?.gpaByDivision[division]) ?? null) : null
      const gpaGroup = schoolGpa ? { ...schoolGpa, label: `NC ${among} who went to ${spoken(school.name)}` } : levelGpa ? { ...levelGpa, label: `NC ${among} who went ${division ? DIVISION_SHORT[division] : ""}` } : null
      const satR = fit ? satTotalRange(fit) : [null, null]
      const fitLines = {
        athletic: division ? athleticFit(mine, group, DIVISION_SHORT[division], among, first ?? "Your wrestler") : { status: "unknown" as const, text: `No ${among === "women" ? "women's" : "men's"} team.` },
        academic: academicFit({
          sat: sat && satR[0] != null && satR[1] != null ? { score: sat, low: satR[0], high: satR[1] } : null,
          act: act && fit?.act[0] != null && fit.act[1] != null ? { score: act, low: fit.act[0], high: fit.act[1] } : null,
          gpa: myGpa != null && gpaGroup ? { mine: myGpa, average: gpaGroup.average, count: gpaGroup.count, label: gpaGroup.label } : null,
          admitRate: fit?.admitRate ?? null,
        }),
        cost: costFit({ netPrice: net?.amount ?? null, netNote: net?.note ?? "", published: cost?.amount ?? null, budget: profile.budget }),
        goals: goalsFit(profile, {
          majors: (MAJORS[school.id] as string[] | undefined) ?? null,
          miles: home ? milesBetween(home, [school.latitude, school.longitude]) : null,
          undergrads: fit?.undergrads ?? null,
          setting: fit?.setting ?? null,
        }),
      }
      const fitCell = (l: FitLine, labels = STATUS): Cell => ({ main: labels[l.status].label, sub: l.text, className: labels[l.status].className })
      const cells: Record<string, Cell> = {
        fitAthletic: fitCell(fitLines.athletic, ATHLETIC_STATUS),
        fitAcademic: fitCell(fitLines.academic),
        fitCost: fitCell(fitLines.cost),
        fitGoals: fitCell(fitLines.goals),
        size: depth
          ? { main: `${depth.size} wrestlers`, sub: depth.season ? `${depth.season} roster` : "Season not stated on the roster" }
          : { main: "Roster not read" },
        depth: !weight
          ? { main: "No recent weight on file" }
          : !depth
            ? { main: "Roster not read" }
            : !atWeight
              ? { main: "The roster lists no weights" }
              : {
                  main: atWeight.map((l) => `${l.weight}: ${l.wrestlers}`).join(" · "),
                  sub: `${atWeight.map((l) => `${l.finalYear} in their final year at ${l.weight}`).join(", ")}. ${depth.season ?? "Current"} roster; redshirts and transfers change it.`,
                },
        level: programs.length
          ? { main: programs.map((p) => DIVISION_SHORT[p.division]).join(", "), sub: programs.map((p) => p.conference).filter(Boolean).join(", ") || undefined }
          : { main: `No ${team === "womens" ? "women's" : "men's"} team`, className: "text-amber-200" },
        ranking: rankings[0] ? { main: `No. ${rankings[0].rank}`, sub: `${rankings[0].pollName}, ${rankings[0].pollDate.slice(0, 4)}` } : { main: "Not ranked in a poll we read" },
        nc: roster.anyReviewed ? { main: `${ncOnRoster} from North Carolina`, sub: "On the current roster" } : { main: "Roster not read" },
        where: { main: `${school.city}, ${school.state}`, sub: fit?.setting ?? undefined },
        students: fit?.undergrads ? { main: `${fit.undergrads.toLocaleString("en-US")} undergraduates` } : { main: "Not published" },
        cost: cost ? { main: dollars(cost.amount), sub: `Tuition, fees, housing, food and books, ${cost.year}, before aid` } : { main: "Not published" },
        net: net?.amount != null ? { main: dollars(net.amount), sub: net.note } : { main: "No published figure", sub: net?.note ?? undefined },
        admit: fit?.admitRate != null ? { main: `${fit.admitRate}% admitted` } : { main: "Admits most applicants or does not report" },
        sat: satRange[0] != null ? { main: `${satRange[0]} to ${satRange[1]}`, sub: satMark ? `${sat}: ${MARK[satMark].text}` : undefined, className: satMark ? MARK[satMark].className : undefined } : { main: "Not reported" },
        act: fit && fit.act[0] != null ? { main: `${fit.act[0]} to ${fit.act[1]}`, sub: actMark ? `${act}: ${MARK[actMark].text}` : undefined, className: actMark ? MARK[actMark].className : undefined } : { main: "Not reported" },
        grad: fit?.gradRate != null ? { main: `${fit.gradRate}%`, sub: fit.gradRateKind ?? undefined } : { main: "Not reported" },
        retention: fit?.retention != null ? { main: `${fit.retention}%`, sub: "Return for a second year" } : { main: "Not reported" },
      }
      return { school, fit, cells, score: fitScore(Object.values(fitLines)) }
    }),
  )

  // Best match on what the family told us first; the order is said on the page, never called a verdict.
  columns.sort((a, b) => b.score - a.score)
  const ROWS: Array<{ key: string; label: string; group: string }> = [
    { key: "level", label: "Level and conference", group: "The program" },
    { key: "ranking", label: "Team ranking", group: "The program" },
    { key: "size", label: "Roster size", group: "The program" },
    { key: "depth", label: weight ? `At the weights near ${first}'s ${weight}` : "At your weight", group: "The program" },
    { key: "nc", label: "North Carolina wrestlers", group: "The program" },
    { key: "cost", label: "Published yearly cost", group: "Cost" },
    { key: "net", label: "What families like yours paid", group: "Cost" },
    { key: "admit", label: "Acceptance rate", group: "Academics" },
    { key: "sat", label: "SAT, middle half admitted", group: "Academics" },
    { key: "act", label: "ACT, middle half admitted", group: "Academics" },
    { key: "grad", label: "Graduation rate", group: "Academics" },
    { key: "retention", label: "First-year retention", group: "Academics" },
    { key: "where", label: "Where", group: "Campus" },
    { key: "students", label: "Size", group: "Campus" },
  ]
  const FIT_ROWS = [
    { key: "fitAthletic", label: "Athletic" },
    { key: "fitAcademic", label: "Academic" },
    { key: "fitCost", label: "Finances" },
    { key: "fitGoals", label: "Your goals" },
  ] as const

  // A wizard: choose colleges, say what matters, then see the comparison. It opens on the first step
  // the family has not done.
  const step = askedStep ?? (chosen.length < 2 ? "colleges" : !profileSet ? "matters" : "results")
  const link = (next: Record<string, string | null>) => {
    const q = new URLSearchParams()
    const sv = next.s !== undefined ? next.s : chosen.map((c) => c.id).join(",")
    const inc = next.income !== undefined ? next.income : income != null ? String(income) : null
    const st = next.step !== undefined ? next.step : step
    if (sv) q.set("s", sv)
    if (inc != null) q.set("income", inc)
    if (st) q.set("step", st)
    return `/recruiting/compare?${q.toString()}`
  }
  const STEPS = [
    { key: "colleges", label: "Choose colleges", done: chosen.length >= 2 },
    { key: "matters", label: "What matters", done: profileSet },
    { key: "results", label: "Your comparison", done: false },
  ] as const
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"}`
  const button = "inline-flex items-center justify-center rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]"
  const ghost = "inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/5"
  const dot: Record<FitStatus, string> = { fit: "bg-emerald-400", stretch: "bg-amber-300", concern: "bg-red-400", unknown: "bg-white/30" }

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <a href="/my-recruiting#plan" className="text-xs font-semibold text-white/55 hover:text-white">
          ← Recruiting Command Center
        </a>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Compare colleges{first ? <span className="text-white/50"> for {first}</span> : null}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Pick the colleges, tell us what matters, and see how each one fits.</p>

        {!blue ? (
          <div className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-5 text-sm leading-6 text-white/80">
            Comparing colleges is part of NC United Blue.{" "}
            <a href="/blue" className="font-bold text-[#D3B574] underline">
              Learn about Blue
            </a>
          </div>
        ) : (
          <>
            <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Steps">
              {STEPS.map((s, i) => {
                const current = s.key === step
                return (
                  <li key={s.key}>
                    <a
                      href={link({ step: s.key })}
                      aria-current={current ? "step" : undefined}
                      className={`flex h-full items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold sm:text-sm ${current ? "border-[#D3B574] bg-[#D3B574]/10 text-white" : "border-white/10 text-white/55 hover:text-white"}`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${s.done ? "bg-emerald-400 text-[#0A1628]" : current ? "bg-[#D3B574] text-[#0A1628]" : "bg-white/10 text-white/70"}`}>
                        {s.done ? "✓" : i + 1}
                      </span>
                      {s.label}
                    </a>
                  </li>
                )
              })}
            </ol>

            {step === "colleges" ? (
              <section className="mt-6 rounded-xl border border-white/10 bg-[#0f1c2e] p-5 sm:p-6">
                <h2 className="text-lg font-black">Which colleges do you want to compare?</h2>
                <p className="mt-1 text-sm text-white/60">Pick two to four from your list. Tap one to add or remove it.</p>
                {saved.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {saved.map((sc) => {
                      const on = chosen.some((c) => c.id === sc.id)
                      const nextIds = on ? chosen.filter((c) => c.id !== sc.id).map((c) => c.id) : [...chosen.map((c) => c.id), sc.id].slice(0, MAX)
                      return (
                        <a key={sc.id} href={link({ s: nextIds.join(","), step: "colleges" })} aria-pressed={on} className={chip(on)}>
                          {on ? "✓ " : ""}
                          {spoken(sc.name)}
                        </a>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-white/70">Your list is empty.</p>
                )}
                <div className="mt-5 rounded-lg border border-dashed border-white/20 p-4">
                  <p className="text-sm font-bold text-white">Want to compare a college that is not here?</p>
                  <p className="mt-1 text-sm text-white/60">Find it on the map and tap Save to My List. Then come back here.</p>
                  <a href="/recruiting/college-map?from=compare" className={`${ghost} mt-3`}>
                    + Add more colleges
                  </a>
                </div>
                <div className="mt-6 flex justify-end">
                  {chosen.length >= 2 ? (
                    <a href={link({ step: profileSet ? "results" : "matters" })} className={button}>
                      Next: what matters →
                    </a>
                  ) : (
                    <span className="text-sm text-white/50">Choose at least two to continue.</span>
                  )}
                </div>
              </section>
            ) : step === "matters" ? (
              <section className="mt-6 rounded-xl border border-white/10 bg-[#0f1c2e] p-5 sm:p-6">
                <h2 className="text-lg font-black">What matters to your family?</h2>
                <p className="mt-1 text-sm text-white/60">Answer what you can. Everything is optional, and a coach never sees it.</p>
                <p className="mt-5 text-sm font-semibold text-white">Your family&apos;s income</p>
                <p className="text-xs text-white/50">To show what families like yours actually paid. Not saved anywhere.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {INCOME_BRACKETS.map((label, i) => (
                    <a key={label} href={link({ income: income === i ? null : String(i), step: "matters" })} aria-pressed={income === i} className={chip(income === i)}>
                      {label}
                    </a>
                  ))}
                </div>
                <FamilyFitForm initial={profile} open embedded afterSave={link({ step: "results" })} />
                <div className="mt-4 flex justify-between">
                  <a href={link({ step: "colleges" })} className="text-sm font-semibold text-white/60 hover:text-white">
                    ← Back
                  </a>
                  <a href={link({ step: "results" })} className="text-sm font-semibold text-white/60 hover:text-white">
                    Skip for now →
                  </a>
                </div>
              </section>
            ) : (
              <section className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-2xl text-sm leading-6 text-white/70">
                    {columns.length > 1 ? <>Best match on what you told us first. </> : null}
                    This is fit on paper, not a verdict: a coach&apos;s interest, a visit and the money offered decide it.
                  </p>
                  <div className="flex gap-2">
                    <a href={link({ step: "colleges" })} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/80 hover:text-white">
                      Change colleges
                    </a>
                    <a href={link({ step: "matters" })} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/80 hover:text-white">
                      Edit what matters
                    </a>
                  </div>
                </div>

                <ul className={`mt-4 grid gap-4 ${columns.length > 2 ? "lg:grid-cols-3" : ""} sm:grid-cols-2`}>
                  {columns.map(({ school, cells }, rank) => (
                    <li key={school.id} className="flex flex-col rounded-xl border border-white/10 bg-[#0f1c2e] p-5">
                      <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">{columns.length > 1 ? `Match ${rank + 1} of ${columns.length}` : "Your college"}</p>
                      <a href={`/recruiting/schools/${school.id}`} className="mt-1 text-lg font-black leading-6 text-white hover:underline">
                        {spoken(school.name)}
                      </a>
                      <p className="mt-0.5 text-xs text-white/55">
                        {cells.level.main} · {school.city}, {school.state}
                      </p>
                      <p className="mt-3 text-sm">
                        <span className="font-bold text-white">{cells.cost.main}</span>
                        <span className="text-white/50"> a year, published</span>
                        {cells.net.main.startsWith("$") ? (
                          <span className="block text-white/70">
                            <span className="font-bold text-white">{cells.net.main}</span> paid by families at your income
                          </span>
                        ) : null}
                      </p>
                      <dl className="mt-4 space-y-3 border-t border-white/10 pt-4">
                        {FIT_ROWS.map((row) => {
                          const cell = cells[row.key]
                          const status = (Object.keys(STATUS) as FitStatus[]).find((k) => STATUS[k].label === cell.main || ATHLETIC_STATUS[k].label === cell.main) ?? "unknown"
                          return (
                            <div key={row.key}>
                              <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
                                <span className={`h-2.5 w-2.5 rounded-full ${dot[status]}`} aria-hidden />
                                {row.label}
                                <span className={`normal-case tracking-normal ${cell.className ?? "text-white"}`}>· {cell.main}</span>
                              </dt>
                              <dd className="mt-0.5 text-sm leading-5 text-white/75">{cell.sub}</dd>
                            </div>
                          )
                        })}
                      </dl>
                    </li>
                  ))}
                </ul>

                <details className="group mt-6 rounded-xl border border-white/10">
                  <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold text-white [&::-webkit-details-marker]:hidden">
                    See every detail side by side <span className="text-white/40 group-open:hidden">▸</span>
                    <span className="hidden text-white/40 group-open:inline">▾</span>
                  </summary>
                  <div className="overflow-x-auto border-t border-white/10">
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#0f1c2e]">
                          <th className="sticky left-0 z-10 w-44 bg-[#0f1c2e] p-3 text-left text-xs font-semibold text-white/50" />
                          {columns.map(({ school }) => (
                            <th key={school.id} className="p-3 text-left align-bottom font-bold text-white">
                              {spoken(school.name)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ROWS.map((row, i) => (
                          <Fragment key={row.key}>
                            {i === 0 || ROWS[i - 1].group !== row.group ? (
                              <tr>
                                <td colSpan={columns.length + 1} className="bg-white/[0.03] px-3 pb-1 pt-4 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">
                                  {row.group}
                                </td>
                              </tr>
                            ) : null}
                            <tr className="border-t border-white/10">
                              <th className="sticky left-0 z-10 bg-[#0A1628] p-3 text-left text-xs font-semibold text-white/60">{row.label}</th>
                              {columns.map(({ school, cells }) => (
                                <td key={school.id} className="p-3 align-top">
                                  <span className={`block font-semibold ${cells[row.key].className ?? "text-white"}`}>{cells[row.key].main}</span>
                                  {cells[row.key].sub ? <span className="mt-0.5 block text-xs leading-4 text-white/50">{cells[row.key].sub}</span> : null}
                                </td>
                              ))}
                            </tr>
                          </Fragment>
                        ))}
                        <tr className="border-t border-white/10">
                          <th className="sticky left-0 z-10 bg-[#0A1628] p-3 text-left text-xs font-semibold text-white/60">Links</th>
                          {columns.map(({ school, fit }) => (
                            <td key={school.id} className="space-y-1 p-3 align-top text-xs">
                              {fit?.netPriceCalculatorUrl ? (
                                <a className="block font-semibold text-[#D3B574] hover:underline" href={/^https?:/i.test(fit.netPriceCalculatorUrl) ? fit.netPriceCalculatorUrl : `https://${fit.netPriceCalculatorUrl}`} target="_blank" rel="noopener noreferrer">
                                  Net price calculator
                                </a>
                              ) : null}
                              {fit?.admissionsUrl ? (
                                <a className="block font-semibold text-[#D3B574] hover:underline" href={/^https?:/i.test(fit.admissionsUrl) ? fit.admissionsUrl : `https://${fit.admissionsUrl}`} target="_blank" rel="noopener noreferrer">
                                  Admissions
                                </a>
                              ) : null}
                              <a className="block font-semibold text-[#D3B574] hover:underline" href={`/recruiting/schools/${school.id}`}>
                                Coaches and questionnaire
                              </a>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>

                <p className="mt-4 max-w-3xl text-xs leading-5 text-white/45">
                  College figures are from the US Department of Education: costs for 2024-25 or 2023-24; admissions and test scores for students entering in fall
                  2023; what families paid is the 2022-23 average for first-year students receiving federal aid, and a public college reports it for its own
                  state&apos;s students only. Rosters are each program&apos;s published roster, read in October 2026; a count at a weight shows how crowded it is,
                  not whether a spot is open. Your profile is saved on your account only, your income is not saved, and a coach never sees any of it.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
