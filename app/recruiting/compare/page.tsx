/**
 * Compare colleges side by side, for one family's wrestler (lib/college-programs/fit.ts).
 *
 * The family picks two to four colleges from My List. Each row is a fact about the college; where
 * the wrestler's own record makes a comparison mechanical (test scores against the middle half of
 * admitted students, cost after aid) it is marked, and nothing is said beyond it.
 * Part of NC United Blue. The wrestler's grades are read for this page only, none of it is shown to
 * a coach, and family income is never asked (Matt, 19 Oct 2026): cost is the average after aid.
 */
import type { Metadata } from "next"
import { PortalShell } from "@/components/portal/portal-shell"
import { Fragment } from "react"
import { redirect } from "next/navigation"

import data from "@/lib/college-programs/programs-2026-27.json"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { satTotalRange, scorePlacement, type Placement } from "@/lib/college-programs/fit"
import { rosterForSchool } from "@/lib/college-programs/rosters"
import { fitScore, type FitLine, type FitStatus } from "@/lib/recruiting/family-fit"
import { NEED_LABEL } from "@/lib/college-programs/roster-room"
import { collegeFitFor, loadFamilyFitContext } from "@/lib/recruiting/college-fit"
import { collegeViewsFor } from "@/lib/recruiting/college-views"
import { familyAthleteIds } from "@/lib/coach-messages"
import { FamilyFitForm } from "@/components/colleges/family-fit-form"
import { teamRankingsForSchool } from "@/lib/college-programs/team-rankings-snapshot"
import { DIVISION_COLOR, DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { schoolLogoUrl } from "@/lib/college-programs/logo"
import { COLLEGE_LIST_STATUS_LABEL, type CollegeListStatus } from "@/lib/college-programs/list"
import { Building2, DollarSign, GraduationCap, MapPin, Plus, Target, X } from "lucide-react"
import { NICHE_CATEGORIES, NICHE_SOURCE, gradePoints, gradeTone, nicheFor } from "@/lib/college-programs/niche"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hasPortalAccess } from "@/lib/ranking-visibility"

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

const SORTS = [
  { key: "overall", label: "Overall" },
  { key: "athletic", label: "Athletic" },
  { key: "academic", label: "Academic" },
  { key: "cost", label: "Cost" },
  { key: "goals", label: "Personal" },
] as const

type Cell = { main: string; sub?: string; className?: string }

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
  const blue = hasPortalAccess(portal.viewer)

  const [{ data: list }, focus] = await Promise.all([
    admin.from("college_list_items").select("school_id, status, note, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
    familyFocus(admin, userId),
  ])
  const listed = new Map((list ?? []).map((r) => [String(r.school_id), { status: r.status as CollegeListStatus, note: (r.note as string | null) ?? null }]))
  const saved = (list ?? []).map((r) => SCHOOLS.get(String(r.school_id))).filter((s): s is CollegeMapSchool => Boolean(s))
  const asked = String(params.s ?? "").split(",").filter(Boolean)
  const chosen = (asked.length ? asked.map((id) => SCHOOLS.get(id)).filter((s): s is CollegeMapSchool => Boolean(s)) : saved).slice(0, MAX)
  // Family income is never asked (Matt, 19 Oct 2026): the cost row is the average for aided students.
  const income = null
  const askedStep = params.step === "colleges" || params.step === "matters" || params.step === "results" ? params.step : null

  // The wrestler being compared and the family's own fit profile (the previewed family's, on a developer's machine).
  const team = focus?.gender ?? null
  const ctx = await loadFamilyFitContext(admin, userId, team)
  // Logos for the picking step only: the list can be long.
  const savedLogos = askedStep === "colleges" || (!askedStep && chosen.length < 2) ? await Promise.all(saved.map((sc) => schoolLogoUrl(sc).catch(() => null))) : []
  const { first, sat, act, profile, profileSet, weight } = ctx
  // Coaches of each college who viewed the wrestler: a verified signal, shown beside the list stage.
  const viewsByCollege = blue ? await collegeViewsFor(admin, await familyAthleteIds(admin, userId).catch(() => [])).catch(() => new Map()) : new Map()

  const columns = await Promise.all(
    chosen.map(async (school) => {
      const { fit, cost, net, depth, room, lines: fitLines } = collegeFitFor(ctx, school, income)
      const rankings = (await teamRankingsForSchool(school.id)).filter((r) => !team || r.gender === team)
      const roster = rosterForSchool(school.id)
      const ncOnRoster = roster.wrestlers.filter((w) => !team || w.team === team).length
      const satRange = fit ? satTotalRange(fit) : ([null, null] as [null, null])
      const satMark = scorePlacement(sat, satRange)
      const actMark = fit ? scorePlacement(act, fit.act) : null
      const programs = school.programs.filter((p) => !team || p[team])
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
            : !room
              ? { main: "The roster lists few weights" }
              : {
                  main: room.rows.map((r) => `${r.weight}: ${NEED_LABEL[r.need]}`).join(" · "),
                  sub: `${room.rows.map((r) => `${r.staying} still at ${r.weight} in fall ${room.arrival}`).join(", ")}. ${depth.season ?? "Current"} roster; redshirts, transfers and new signings change it.`,
                  className: room.rows.some((r) => r.need === "likely") ? "text-emerald-300" : room.rows.every((r) => r.need === "crowded") ? "text-amber-200" : undefined,
                },
        level: programs.length
          ? { main: programs.map((p) => DIVISION_SHORT[p.division]).join(", "), sub: programs.map((p) => p.conference).filter(Boolean).join(", ") || undefined }
          : { main: `No ${team === "womens" ? "women's" : "men's"} team`, className: "text-amber-200" },
        ranking: rankings[0] ? { main: `No. ${rankings[0].rank}`, sub: `${rankings[0].pollName}, ${rankings[0].pollDate.slice(0, 4)}` } : { main: "Not ranked in a poll we read" },
        nc: roster.anyReviewed ? { main: `${ncOnRoster} from North Carolina`, sub: "On the current roster" } : { main: "Roster not read" },
        where: { main: `${school.city}, ${school.state}`, sub: fit?.setting ?? undefined },
        students: fit?.undergrads ? { main: `${fit.undergrads.toLocaleString("en-US")} undergraduates` } : { main: "Not published" },
        cost: cost ? { main: dollars(cost.amount), sub: `Tuition, fees, housing, food and books, ${cost.year}, before aid` } : { main: "Not published" },
        net: net?.amount != null ? { main: dollars(net.amount), sub: "All aided first-year students, before any athletic scholarship" } : { main: "No published figure", sub: net?.note ?? undefined },
        admit: fit?.admitRate != null ? { main: `${fit.admitRate}% admitted` } : { main: "Admits most applicants or does not report" },
        sat: satRange[0] != null ? { main: `${satRange[0]} to ${satRange[1]}`, sub: satMark ? `${sat}: ${MARK[satMark].text}` : undefined, className: satMark ? MARK[satMark].className : undefined } : { main: "Not reported" },
        act: fit && fit.act[0] != null ? { main: `${fit.act[0]} to ${fit.act[1]}`, sub: actMark ? `${act}: ${MARK[actMark].text}` : undefined, className: actMark ? MARK[actMark].className : undefined } : { main: "Not reported" },
        grad: fit?.gradRate != null ? { main: `${fit.gradRate}%`, sub: fit.gradRateKind ?? undefined } : { main: "Not reported" },
        retention: fit?.retention != null ? { main: `${fit.retention}%`, sub: "Return for a second year" } : { main: "Not reported" },
      }
      return { school, fit, cells, lines: fitLines, logo: await schoolLogoUrl(school).catch(() => null), score: fitScore(Object.values(fitLines)) }
    }),
  )

  // The family chooses what matters most; the order follows it, and is said on the page, never called a verdict.
  const sort = SORTS.find((x) => x.key === params.sort)?.key ?? "overall"
  const RANK: Record<FitStatus, number> = { fit: 3, stretch: 2, unknown: 1, concern: 0 }
  columns.sort((a, b) => (sort === "overall" ? b.score - a.score : RANK[b.lines[sort].status] - RANK[a.lines[sort].status] || b.score - a.score))
  const ROWS: Array<{ key: string; label: string; group: string }> = [
    { key: "level", label: "Level and conference", group: "The program" },
    { key: "ranking", label: "Team ranking", group: "The program" },
    { key: "size", label: "Roster size", group: "The program" },
    { key: "depth", label: weight ? `At the weights near ${first}'s ${weight}` : "At your weight", group: "The program" },
    { key: "nc", label: "North Carolina wrestlers", group: "The program" },
    { key: "cost", label: "Published yearly cost", group: "Cost" },
    { key: "net", label: "Average paid after aid", group: "Cost" },
    { key: "admit", label: "Acceptance rate", group: "Academics" },
    { key: "sat", label: "SAT, middle half admitted", group: "Academics" },
    { key: "act", label: "ACT, middle half admitted", group: "Academics" },
    { key: "grad", label: "Graduation rate", group: "Academics" },
    { key: "retention", label: "First-year retention", group: "Academics" },
    { key: "where", label: "Where", group: "Campus" },
    { key: "students", label: "Size", group: "Campus" },
  ]
  const GROUPS = [
    { key: "athletic", label: "Athletic fit", icon: Target, rows: ["ranking", "size", "depth", "nc"] },
    { key: "academic", label: "Academic fit", icon: GraduationCap, rows: ["admit", "sat", "act", "grad"] },
    { key: "cost", label: "Financial fit", icon: DollarSign, rows: ["cost", "net"] },
    { key: "goals", label: "Personal fit", icon: MapPin, rows: ["where", "students"] },
  ] as const
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
    const st = next.step !== undefined ? next.step : step
    const so = next.sort !== undefined ? next.sort : sort !== "overall" ? sort : null
    if (sv) q.set("s", sv)
    if (st) q.set("step", st)
    if (so) q.set("sort", so)
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
    <PortalShell active="colleges">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D3B574]">
          <a href="/my-recruiting/colleges" className="hover:underline">Colleges</a> › Compare
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Compare colleges{first ? <span className="text-white/45"> for {first}</span> : null}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/65 sm:text-base">Athletic, academic, financial and personal fit, side by side.</p>

        {!blue ? (
          <div className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-5 text-sm leading-6 text-white/80">
            Comparing colleges is part of the Command Center.{" "}
            <a href="/plans" className="font-bold text-[#D3B574] underline">
              See plans
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
              <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-black">Choose up to {MAX} colleges</h2>
                  <span className="text-sm font-semibold text-[#D3B574]">{chosen.length} of {MAX} chosen</span>
                </div>
                {saved.length ? (
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {saved.map((sc, i) => {
                      const on = chosen.some((c) => c.id === sc.id)
                      const nextIds = on ? chosen.filter((c) => c.id !== sc.id).map((c) => c.id) : [...chosen.map((c) => c.id), sc.id].slice(0, MAX)
                      const division = sc.programs.find((p) => !team || p[team])?.division ?? sc.programs[0]?.division
                      return (
                        <li key={sc.id}>
                          <a
                            href={link({ s: nextIds.join(","), step: "colleges" })}
                            aria-pressed={on}
                            className={`relative flex h-full items-center gap-3 rounded-xl border p-3 transition ${on ? "border-[#D3B574] bg-[#D3B574]/10" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}
                          >
                            {savedLogos[i] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={savedLogos[i]!} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-1" />
                            ) : (
                              <span className="h-11 w-11 shrink-0 rounded-lg bg-white/10" aria-hidden />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 block text-sm font-bold leading-5 text-white">{spoken(sc.name)}</span>
                              <span className="block text-xs text-white/50">
                                {division ? DIVISION_SHORT[division] : ""} · {sc.state}
                              </span>
                            </span>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black ${on ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/25 text-transparent"}`}>✓</span>
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-white/70">Your list is empty.</p>
                )}
                <a href="/recruiting/college-map?from=compare" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 p-4 text-sm font-bold text-white/75 hover:border-[#D3B574] hover:text-[#D3B574]">
                  + Add a college from the map
                </a>
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
              <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5 sm:p-6">
                <h2 className="text-xl font-black">What matters to your family?</h2>
                <p className="mt-1 text-sm text-white/60">All optional. A coach never sees it.</p>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-white/50">What matters most:</span>
                    {SORTS.map((x) => (
                      <a key={x.key} href={link({ sort: x.key === "overall" ? null : x.key })} aria-pressed={sort === x.key} className={chip(sort === x.key)}>
                        {x.label}
                      </a>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <a href={link({ step: "colleges" })} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D3B574]/60 px-3 py-2 text-xs font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
                      <Plus className="h-3.5 w-3.5" aria-hidden /> Add a college
                    </a>
                    <a href={link({ step: "matters" })} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/80 hover:text-white">
                      Edit goals
                    </a>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#0d1d36]/80">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 w-48 bg-[#0d1d36] p-4 text-left align-top">
                          <span className="text-sm font-bold text-white">{columns.length} colleges</span>
                          <span className="mt-1 block text-xs font-normal text-white/45">{sort === "overall" ? "Best overall fit first" : `Best ${SORTS.find((x) => x.key === sort)?.label.toLowerCase()} fit first`}</span>
                        </th>
                        {columns.map(({ school, logo, cells }, rank) => {
                          const division = school.programs.find((p) => !team || p[team])?.division ?? school.programs[0]?.division
                          return (
                            <th key={school.id} className="min-w-[13rem] border-l border-white/10 p-4 text-left align-top font-normal">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#D3B574]">{columns.length > 1 && rank === 0 ? "Top match" : `#${rank + 1}`}</span>
                                <a href={link({ s: columns.filter((c) => c.school.id !== school.id).map((c) => c.school.id).join(",") })} aria-label={`Remove ${spoken(school.name)}`} className="text-white/40 hover:text-white">
                                  <X className="h-4 w-4" aria-hidden />
                                </a>
                              </div>
                              <div className="mt-2 flex items-center gap-3">
                                {logo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={logo} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain p-1" />
                                ) : null}
                                <div className="min-w-0">
                                  <a href={`/recruiting/schools/${school.id}`} className="block font-bold leading-5 text-white hover:underline">{spoken(school.name)}</a>
                                  <span className="block text-xs text-white/50">{school.city}, {school.state}</span>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                                {division ? <span className="rounded px-1.5 py-0.5 text-[#071427]" style={{ backgroundColor: DIVISION_COLOR[division] }}>{DIVISION_SHORT[division]}</span> : null}
                                {cells.level.sub ? <span className="rounded border border-white/20 px-1.5 py-0.5 text-white/75">{cells.level.sub}</span> : null}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {GROUPS.map((g) => (
                        <Fragment key={g.key}>
                          <tr className="border-t border-white/10 bg-white/[0.03]">
                            <th className="sticky left-0 z-10 bg-[#111f38] px-4 py-3 text-left">
                              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D3B574]">
                                <g.icon className="h-4 w-4" aria-hidden /> {g.label}
                              </span>
                            </th>
                            {columns.map(({ school, lines }) => {
                              const line = lines[g.key]
                              const label = (g.key === "athletic" ? ATHLETIC_STATUS : STATUS)[line.status]
                              return (
                                <td key={school.id} className="border-l border-white/10 px-4 py-3 align-top">
                                  <details className="group">
                                    <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                                      <span className={`h-2 w-10 rounded-full ${dot[line.status]}`} aria-hidden />
                                      <span className={`text-sm font-bold ${label.className}`}>{label.label}</span>
                                    </summary>
                                    <p className="mt-1.5 text-xs leading-5 text-white/60">{line.text}</p>
                                  </details>
                                </td>
                              )
                            })}
                          </tr>
                          {g.rows.map((key) => {
                            const row = ROWS.find((r) => r.key === key)!
                            return (
                              <tr key={key} className="border-t border-white/5">
                                <th className="sticky left-0 z-10 bg-[#0d1d36] px-4 py-2.5 text-left text-xs font-semibold text-white/55">{row.label}</th>
                                {columns.map(({ school, cells }) => (
                                  <td key={school.id} className="border-l border-white/10 px-4 py-2.5 align-top" title={cells[key].sub}>
                                    <span className={`block font-semibold ${cells[key].className ?? "text-white"}`}>{cells[key].main}</span>
                                    {cells[key].sub ? <span className="line-clamp-1 text-[11px] text-white/40">{cells[key].sub}</span> : null}
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </Fragment>
                      ))}
                      {/* Campus life: Niche's report-card grades, best in each row marked (lib/college-programs/niche.ts). */}
                      {(() => {
                        const graded = columns.map(({ school }) => nicheFor(school.id))
                        const rows = NICHE_CATEGORIES.filter((c) => graded.some((g) => g?.grades[c.key]))
                        if (!rows.length) return null
                        return (
                          <>
                            <tr className="border-t border-white/10 bg-white/[0.03]">
                              <th className="sticky left-0 z-10 bg-[#111f38] px-4 py-3 text-left">
                                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D3B574]">
                                  <Building2 className="h-4 w-4" aria-hidden /> Campus life grades
                                </span>
                              </th>
                              {columns.map(({ school }, i) => (
                                <td key={school.id} className="border-l border-white/10 px-4 py-3 align-top text-[11px] text-white/45">
                                  {graded[i]?.url ? (
                                    <a href={graded[i]!.url!} target="_blank" rel="noreferrer" className="underline hover:text-white/70">
                                      Niche report card
                                    </a>
                                  ) : (
                                    "No Niche grades"
                                  )}
                                </td>
                              ))}
                            </tr>
                            {rows.map((c) => {
                              const points = graded.map((g) => gradePoints(g?.grades[c.key]))
                              const best = Math.max(...points.map((p) => p ?? -1))
                              const gradedCount = points.filter((p) => p != null).length
                              return (
                                <tr key={`niche-${c.key}`} className="border-t border-white/5">
                                  <th className="sticky left-0 z-10 bg-[#0d1d36] px-4 py-2 text-left text-xs font-semibold text-white/55">{c.label}</th>
                                  {columns.map(({ school }, i) => {
                                    const grade = graded[i]?.grades[c.key]
                                    const top = grade != null && gradedCount > 1 && points[i] === best
                                    return (
                                      <td key={school.id} className="border-l border-white/10 px-4 py-2 align-top">
                                        {grade ? (
                                          <span className={`inline-flex min-w-[2.25rem] justify-center rounded-md px-2 py-0.5 text-sm font-black ring-1 ${gradeTone(grade)} ${top ? "outline outline-2 outline-offset-1 outline-[#D3B574]" : ""}`}>{grade}</span>
                                        ) : (
                                          <span className="text-xs text-white/35">Not graded</span>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                            <tr>
                              <td colSpan={columns.length + 1} className="px-4 pb-3 pt-1 text-[11px] text-white/40">
                                Gold outline: the best grade in the row. {NICHE_SOURCE}.
                              </td>
                            </tr>
                          </>
                        )
                      })()}
                      <tr className="border-t border-white/10 bg-white/[0.03]">
                        <th className="sticky left-0 z-10 bg-[#111f38] px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-[#D3B574]">Your relationship</th>
                        {columns.map(({ school }) => {
                          const item = listed.get(school.id)
                          return (
                            <td key={school.id} className="border-l border-white/10 px-4 py-3 align-top">
                              <span className="block font-semibold text-white">{item ? COLLEGE_LIST_STATUS_LABEL[item.status] : "Not on your list"}</span>
                              {viewsByCollege.get(school.id) ? (
                                <span className="mt-1 block text-xs font-semibold text-emerald-300">
                                  Coach viewed {first ? `${first}'s` : "the"} profile · {viewsByCollege.get(school.id)!.views}× · {new Date(viewsByCollege.get(school.id)!.lastViewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}
                                </span>
                              ) : null}
                              {item?.note ? <span className="mt-0.5 line-clamp-2 block text-xs italic text-white/55">{item.note}</span> : null}
                            </td>
                          )
                        })}
                      </tr>
                      <tr className="border-t border-white/10">
                        <th className="sticky left-0 z-10 bg-[#0d1d36] px-4 py-4 text-left text-sm font-bold text-white">Next step</th>
                        {columns.map(({ school }) => {
                          const item = listed.get(school.id)
                          const next = !item
                            ? { label: "Open the college", href: `/recruiting/schools/${school.id}` }
                            : item.status === "interested" || item.status === "questionnaire"
                              ? { label: "Email the coach", href: `/my-recruiting/colleges?email=${school.id}` }
                              : { label: "Plan a visit", href: "/recruiting/learn/questions-families-ask" }
                          return (
                            <td key={school.id} className="border-l border-white/10 px-4 py-4">
                              <a href={next.href} className="block rounded-lg border border-[#D3B574] px-3 py-2 text-center text-sm font-bold text-[#D3B574] hover:bg-[#D3B574] hover:text-[#0A1628]">
                                {next.label}
                              </a>
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="mt-4 max-w-3xl text-xs leading-5 text-white/45">
                  College figures are from the US Department of Education: costs for 2024-25 or 2023-24; admissions and test scores for students entering in fall
                  2023; what families paid is the 2022-23 average for first-year students receiving federal aid, and a public college reports it for its own
                  state&apos;s students only. Rosters are each program&apos;s published roster, read in October 2026; a count at a weight shows how crowded it is,
                  not whether a spot is open. Your profile is saved on your account only, and a coach never sees any of it.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </PortalShell>
  )
}
