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
import { redirect } from "next/navigation"

import data from "@/lib/college-programs/programs-2026-27.json"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { INCOME_BRACKETS, fitForSchool, netPriceFor, satTotalRange, scorePlacement, type Placement } from "@/lib/college-programs/fit"
import { rosterForSchool } from "@/lib/college-programs/rosters"
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

  // The wrestler being compared: the oldest still in school, whose own scores sit beside each college's.
  const { data: rows } = ids.length
    ? await admin.from("athletes").select('id, "firstName", name, graduationyear, academic_gpa, academic_sat, academic_act').in("id", ids)
    : { data: [] }
  const graduated = mostRecentGraduatedClassYear()
  const wrestler = (rows ?? [])
    .filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
    .sort((a, b) => Number(a.graduationyear ?? 9999) - Number(b.graduationyear ?? 9999))[0]
  const first = wrestler ? String(wrestler.firstName ?? "").trim() || String(wrestler.name ?? "").split(" ")[0] : null
  const sat = Number(String(wrestler?.academic_sat ?? "").replace(/[^0-9]/g, "")) || null
  const act = Number(String(wrestler?.academic_act ?? "").replace(/[^0-9]/g, "")) || null
  const team = focus?.gender ?? null

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
      const cells: Record<string, Cell> = {
        level: programs.length
          ? { main: programs.map((p) => DIVISION_SHORT[p.division]).join(", "), sub: programs.map((p) => p.conference).filter(Boolean).join(", ") || undefined }
          : { main: `No ${team === "womens" ? "women's" : "men's"} team`, className: "text-amber-200" },
        ranking: rankings[0] ? { main: `No. ${rankings[0].rank}`, sub: `${rankings[0].pollName}, ${rankings[0].pollDate.slice(0, 4)}` } : { main: "Not ranked in a poll we read" },
        nc: roster.anyReviewed ? { main: `${ncOnRoster} from North Carolina`, sub: "On the current roster" } : { main: "Roster not read" },
        where: { main: `${school.city}, ${school.state}`, sub: fit?.setting ?? undefined },
        size: fit?.undergrads ? { main: `${fit.undergrads.toLocaleString("en-US")} undergraduates` } : { main: "Not published" },
        cost: cost ? { main: dollars(cost.amount), sub: `Tuition, fees, housing, food and books, ${cost.year}, before aid` } : { main: "Not published" },
        net: net?.amount != null ? { main: dollars(net.amount), sub: net.note } : { main: "No published figure", sub: net?.note ?? undefined },
        admit: fit?.admitRate != null ? { main: `${fit.admitRate}% admitted` } : { main: "Admits most applicants or does not report" },
        sat: satRange[0] != null ? { main: `${satRange[0]} to ${satRange[1]}`, sub: satMark ? `${sat}: ${MARK[satMark].text}` : undefined, className: satMark ? MARK[satMark].className : undefined } : { main: "Not reported" },
        act: fit && fit.act[0] != null ? { main: `${fit.act[0]} to ${fit.act[1]}`, sub: actMark ? `${act}: ${MARK[actMark].text}` : undefined, className: actMark ? MARK[actMark].className : undefined } : { main: "Not reported" },
        grad: fit?.gradRate != null ? { main: `${fit.gradRate}%`, sub: fit.gradRateKind ?? undefined } : { main: "Not reported" },
        retention: fit?.retention != null ? { main: `${fit.retention}%`, sub: "Return for a second year" } : { main: "Not reported" },
      }
      return { school, fit, cells }
    }),
  )

  const ROWS: Array<{ key: string; label: string; group: string }> = [
    { key: "level", label: "Level and conference", group: "The program" },
    { key: "ranking", label: "Team ranking", group: "The program" },
    { key: "nc", label: "North Carolina wrestlers", group: "The program" },
    { key: "cost", label: "Published yearly cost", group: "Cost" },
    { key: "net", label: "What families like yours paid", group: "Cost" },
    { key: "admit", label: "Acceptance rate", group: "Academics" },
    { key: "sat", label: "SAT, middle half admitted", group: "Academics" },
    { key: "act", label: "ACT, middle half admitted", group: "Academics" },
    { key: "grad", label: "Graduation rate", group: "Academics" },
    { key: "retention", label: "First-year retention", group: "Academics" },
    { key: "where", label: "Where", group: "Campus" },
    { key: "size", label: "Size", group: "Campus" },
  ]
  const link = (next: Record<string, string | null>) => {
    const q = new URLSearchParams()
    const s = next.s !== undefined ? next.s : chosen.map((c) => c.id).join(",")
    const inc = next.income !== undefined ? next.income : income != null ? String(income) : null
    if (s) q.set("s", s)
    if (inc != null) q.set("income", inc)
    return `/recruiting/compare?${q.toString()}`
  }

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <a href="/my-recruiting#plan" className="text-xs font-semibold text-white/55 hover:text-white">
          ← Recruiting Command Center
        </a>
        <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">RecruitNC · Recruiting Portal</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Compare colleges</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
          Your saved colleges side by side{first ? `, for ${first}` : ""}: the program, what it costs, how hard it is to get in, and the campus.
          {sat || act ? ` ${first ?? "Your wrestler"}'s ${[sat ? `SAT ${sat}` : null, act ? `ACT ${act}` : null].filter(Boolean).join(" and ")} is set beside each college's range.` : ""}
        </p>

        {!blue ? (
          <div className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-5 text-sm leading-6 text-white/80">
            Comparing colleges is part of NC United Blue.{" "}
            <a href="/blue" className="font-bold text-[#D3B574] underline">
              Learn about Blue
            </a>
          </div>
        ) : saved.length < 2 && !asked.length ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-[#0f1c2e] p-5 text-sm leading-6 text-white/80">
            Save at least two colleges to your list, then compare them here.{" "}
            <a href="/recruiting/college-map" className="font-bold text-[#D3B574] underline">
              Open the map
            </a>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <p className="text-xs font-semibold text-white/55">Choose up to {MAX} from your list:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {saved.map((s) => {
                  const on = chosen.some((c) => c.id === s.id)
                  const nextIds = on ? chosen.filter((c) => c.id !== s.id).map((c) => c.id) : [...chosen.map((c) => c.id), s.id].slice(0, MAX)
                  return (
                    <a
                      key={s.id}
                      href={link({ s: nextIds.join(",") })}
                      aria-pressed={on}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${on ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/65 hover:text-white"}`}
                    >
                      {on ? "✓ " : "+ "}
                      {spoken(s.name)}
                    </a>
                  )
                })}
              </div>
              <p className="mt-4 text-xs font-semibold text-white/55">Your family&apos;s income, to see what families like yours paid (not saved):</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {INCOME_BRACKETS.map((label, i) => (
                  <a
                    key={label}
                    href={link({ income: income === i ? null : String(i) })}
                    aria-pressed={income === i}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${income === i ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/65 hover:text-white"}`}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#0f1c2e]">
                    <th className="sticky left-0 z-10 w-40 bg-[#0f1c2e] p-3 text-left text-xs font-semibold text-white/50" />
                    {columns.map(({ school }) => (
                      <th key={school.id} className="p-3 text-left align-bottom">
                        <a href={`/recruiting/schools/${school.id}`} className="font-bold text-white hover:underline">
                          {spoken(school.name)}
                        </a>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <>
                      {i === 0 || ROWS[i - 1].group !== row.group ? (
                        <tr key={`${row.group}-head`}>
                          <td colSpan={columns.length + 1} className="bg-white/[0.03] px-3 pb-1 pt-4 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">
                            {row.group}
                          </td>
                        </tr>
                      ) : null}
                      <tr key={row.key} className="border-t border-white/10">
                        <th className="sticky left-0 z-10 bg-[#0A1628] p-3 text-left text-xs font-semibold text-white/60">{row.label}</th>
                        {columns.map(({ school, cells }) => {
                          const cell = cells[row.key]
                          return (
                            <td key={school.id} className="p-3 align-top">
                              <span className={`block font-semibold ${cell.className ?? "text-white"}`}>{cell.main}</span>
                              {cell.sub ? <span className="mt-0.5 block text-xs leading-4 text-white/50">{cell.sub}</span> : null}
                            </td>
                          )
                        })}
                      </tr>
                    </>
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

            <p className="mt-4 max-w-3xl text-xs leading-5 text-white/45">
              College figures are from the US Department of Education: costs for 2024-25 or 2023-24; admissions and test scores for students entering
              in fall 2023; what families paid is the average for first-year students receiving federal aid in 2022-23. A public college reports that
              figure for its own state&apos;s students only. Test scores are compared with the middle half of admitted students, the 25th to 75th
              percentile. Your family&apos;s income is not saved, and nothing on this page is shown to a coach.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
