/**
 * A college's page in the Recruiting Portal (13 Oct 2026; redesigned 15 Oct 2026 from the
 * Command Center mock-up Matt had ChatGPT draw).
 *
 * A product page, not a pile of text: big numbers, short labels, cards, and the explanation behind
 * a tap. Every figure is ours and true - the mock's invented records, results and family quotes
 * became what we actually hold: the team ranking, the full yearly cost, what families at each
 * income paid, the family's own fit, and the North Carolina wrestlers on the roster and gone there.
 *
 * What the school is and what it costs is public. Who to contact, who from North Carolina went
 * there, fit, My List and the coach email are the Recruiting Portal: NC United Blue (admins and
 * verified coaches see the read-only parts too). A college coach never gets the family's shell.
 */
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  Eye,
  BarChart3,
  BookOpen,
  Building2,
  ChevronRight,
  DollarSign,
  ExternalLink,
  GraduationCap,
  Lock,
  Map as MapIcon,
  MapPin,
  Medal,
  Plane,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { SchoolActions } from "@/components/colleges/school-actions"
import { StaffList } from "@/components/colleges/staff-list"
import { WentHereSection } from "@/components/colleges/went-here-section"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { INCOME_BRACKETS, fitForSchool, satTotalRange } from "@/lib/college-programs/fit"
import { loadCollegeMap } from "@/lib/college-programs/load"
import { schoolLogoUrl } from "@/lib/college-programs/logo"
import majorsData from "@/lib/college-programs/majors.json"
import data from "@/lib/college-programs/programs-2026-27.json"
import { depthFor } from "@/lib/college-programs/roster-depth"
import { rosterForSchool } from "@/lib/college-programs/rosters"
import { STATE_NAMES } from "@/lib/college-programs/states"
import { costLines, tuitionFacts } from "@/lib/college-programs/tuition"
import { NICHE_CATEGORIES, NICHE_SOURCE, gradeTone, nicheFor } from "@/lib/college-programs/niche"
import { teamRankingsForSchool } from "@/lib/college-programs/team-rankings-snapshot"
import { DIVISION_COLOR, DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { readWentHereSnapshot, snapshotForState } from "@/lib/college-programs/went-here-snapshot"
import { familyState } from "@/lib/recruiting/family-state"
import { collegeFitFor, loadFamilyFitContext } from "@/lib/recruiting/college-fit"
import { collegeViewsFor } from "@/lib/recruiting/college-views"
import { familyAthleteIds } from "@/lib/coach-messages"
import { MAJOR_FAMILIES, type FitLine, type FitStatus } from "@/lib/recruiting/family-fit"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { BrandName } from "@/components/recruiting/brand-name"

export const dynamic = "force-dynamic"

const SCHOOLS = new Map([...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s]))
const MAJORS = majorsData.majors as Record<string, string[]>
const spoken = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").trim()
const dollars = (n: number) => `$${n.toLocaleString("en-US")}`

// The recruiting accent: blue in recruiting areas, gold elsewhere (app/recruit-brand.css).
const GOLD = "var(--recruit-accent)"
const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
const cardTitle = "text-base font-bold text-white"

/** Athletic fit is a target to build toward, so it is never called a "concern". */
const FIT_LABEL: Record<"athletic" | "other", Record<FitStatus, string>> = {
  athletic: { fit: "In line", stretch: "Close", concern: "Building toward it", unknown: "Not enough to say" },
  other: { fit: "Good fit", stretch: "Stretch", concern: "Concern", unknown: "Not enough to say" },
}
const DOT: Record<FitStatus, string> = { fit: "bg-emerald-400", stretch: "bg-amber-300", concern: "bg-red-400", unknown: "bg-white/30" }
const DOT_ATHLETIC: Record<FitStatus, string> = { ...DOT, concern: "bg-sky-300" }

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const school = SCHOOLS.get((await params).id)
  if (!school) return { title: "College wrestling program | RecruitNC" }
  const name = spoken(school.name)
  const levels = school.programs.map((p) => DIVISION_SHORT[p.division]).join(" / ")
  return {
    title: `${name} wrestling | RecruitNC`,
    description: `${name} wrestling (${levels}) in ${school.city}, ${STATE_NAMES[school.state] ?? school.state}: programs, conference, cost and recruiting information for wrestlers and families.`,
  }
}

function SnapshotRow({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/40" aria-hidden />
      <span className="w-28 shrink-0 text-sm text-white/55">{label}</span>
      <span className="min-w-0 text-sm font-semibold text-white">
        {value}
        {sub ? <span className="block text-xs font-normal text-white/45">{sub}</span> : null}
      </span>
    </li>
  )
}

function FitRow({ icon: Icon, label, line, athletic }: { icon: LucideIcon; label: string; line: FitLine; athletic?: boolean }) {
  const status = FIT_LABEL[athletic ? "athletic" : "other"][line.status]
  return (
    <details className="group border-t border-white/10 first:border-t-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <Icon className="h-5 w-5 shrink-0" style={{ color: GOLD }} aria-hidden />
        <span className="w-24 shrink-0 text-sm font-semibold text-white">{label}</span>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-white">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${(athletic ? DOT_ATHLETIC : DOT)[line.status]}`} aria-hidden />
          {status}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-white/40 transition group-open:rotate-90" aria-hidden />
      </summary>
      <p className="pb-3 pl-8 text-xs leading-5 text-white/65">{line.text}</p>
    </details>
  )
}

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/50">{label}</p>
      {sub ? <p className="mt-1 text-xs text-white/40">{sub}</p> : null}
    </div>
  )
}

export default async function SchoolPage({ params }: Params) {
  const { id } = await params
  const school = SCHOOLS.get(id)
  const niche = school ? nicheFor(school.id) : null
  if (!school) notFound()

  const admin = createAdminClient()
  const { viewer, userId } = await resolvePortalViewer({ supabase: await createClient(), admin })
  const full = Boolean(hasPortalAccess(viewer) || viewer.isVerifiedCoach)
  // A college coach reads the page, but never inside the family's Command Center.
  const familySide = hasPortalAccess(viewer)
  const name = spoken(school.name)

  const focus = await familyFocus(admin, userId)
  const theirs = focus?.gender ?? null
  const team: "mens" | "womens" = theirs && school.programs.some((p) => p[theirs]) ? theirs : school.programs.some((p) => p.mens) ? "mens" : "womens"
  const hasTheirTeam = theirs ? school.programs.some((p) => p[theirs]) : true
  const programs = theirs ? [...school.programs].sort((a, b) => Number(b[theirs]) - Number(a[theirs])) : school.programs
  const program = programs.find((p) => p[team]) ?? programs[0]

  // The family's own state: a RecruitSC family sees South Carolina's alumni, not North Carolina's.
  const homeState = familySide ? await familyState(admin, userId).catch(() => "NC") : "NC"
  const homeStateName = STATE_NAMES[homeState] ?? homeState
  const [rankingsAll, logo, onRecruitNC, ctx, snapshot] = await Promise.all([
    teamRankingsForSchool(school.id),
    schoolLogoUrl(school),
    // "On RecruitNC" is part of the portal; a map that will not load must not take the page down.
    full
      ? loadCollegeMap(admin, true)
          .then((map) => map.schools.find((s) => s.id === id)?.onRecruitNC === true)
          .catch(() => false)
      : Promise.resolve(false),
    familySide && userId ? loadFamilyFitContext(admin, userId, theirs).catch(() => null) : Promise.resolve(null),
    full ? readWentHereSnapshot().then((s) => snapshotForState(s, homeState)).catch(() => null) : Promise.resolve(null),
  ])
  const rankings = rankingsAll.sort((a, b) => Number(b.gender === team) - Number(a.gender === team))
  const ranking = rankings[0] ?? null

  const cost = costLines(school.id, school.state)
  const tuition = cost ? null : tuitionFacts(school.id, school.state)
  const fit = fitForSchool(school.id)
  const depth = depthFor(school.id, team)
  const roster = rosterForSchool(school.id)
  // The roster file lists North Carolina wrestlers only, so it speaks to an NC family alone.
  const ncNow = homeState === "NC" ? roster.wrestlers.filter((w) => w.team === team) : []
  const rosterRead = homeState === "NC" && roster.anyReviewed
  const wentHere = (snapshot?.commits ?? [])
    .filter((c) => c.schoolId === school.id && (!c.gender || c.gender === team))
    .sort((a, b) => (b.classYear ?? 0) - (a.classYear ?? 0))
  // The family's own fit only once there is a wrestler to fit; a coach or a family without one sees none.
  const fitResult = ctx && ctx.first ? collegeFitFor(ctx, school, null) : null
  // This college's coaches looking at the family's wrestler: the reason RecruitNC exists.
  const viewed =
    familySide && userId
      ? ((await collegeViewsFor(admin, await familyAthleteIds(admin, userId).catch(() => [])).catch(() => new Map())).get(school.id) ?? null)
      : null
  const viewedDate = viewed ? new Date(viewed.lastViewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : null
  const satRange = fit ? satTotalRange(fit) : [null, null]
  const majors = new Set(MAJORS[school.id] ?? [])
  const majorLabels = MAJOR_FAMILIES.filter((m) => majors.has(m.code)).map((m) => m.label)
  const teamWord = team === "womens" ? "Women's" : "Men's"
  const tabs = [
    { href: "#overview", label: "Overview" },
    { href: "#cost", label: "Cost & aid" },
    ...(full ? [{ href: "#staff", label: "Coaching staff" }, { href: "#roster", label: "Roster" }] : []),
    { href: "#academics", label: "Academics" },
  ]
  const button = "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition sm:px-4 sm:py-2.5"

  const page = (
    <div className="mx-auto max-w-7xl text-white">
      {/* Header band */}
      <section id="overview" className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1D3A]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-banner-nchsaa-2026-arena.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D3A] via-[#0B1D3A]/90 to-[#0B1D3A]/40" aria-hidden />
        <div className="relative flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <a href="/recruiting/college-map" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: GOLD }}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> All colleges
            </a>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              {logo ? (
                // A white tile: college marks are drawn for light backgrounds and vanish on navy.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={`${name} logo`} className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-2 shadow-lg sm:h-28 sm:w-28" />
              ) : null}
              <div className="min-w-0">
                <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-4xl">{name}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
                  <MapPin className="h-4 w-4" style={{ color: GOLD }} aria-hidden />
                  {school.city}, {STATE_NAMES[school.state] ?? school.state}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 whitespace-nowrap text-xs font-bold">
                  {program ? (
                    <span className="rounded-md px-2.5 py-1 text-[#071427]" style={{ backgroundColor: DIVISION_COLOR[program.division] }}>
                      {DIVISION_SHORT[program.division]}
                    </span>
                  ) : null}
                  {program?.conference ? <span className="rounded-md border border-white/20 px-2.5 py-1 text-white/85">{program.conference}</span> : null}
                  {school.programs.some((p) => p[team]) ? <span className="rounded-md border border-white/20 px-2.5 py-1 text-white/85">{teamWord} wrestling</span> : null}
                  {ranking ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-white">
                      <Trophy className="h-3.5 w-3.5" style={{ color: GOLD }} aria-hidden /> No. {ranking.rank} {ranking.gender === "womens" && team !== "womens" ? "women" : ""}
                    </span>
                  ) : null}
                  {viewed ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/15 px-2.5 py-1 text-emerald-200">
                      <Eye className="h-3.5 w-3.5" aria-hidden /> Viewed {ctx?.first ? `${ctx.first}'s` : "your"} profile · {viewed.views}× · {viewedDate}
                    </span>
                  ) : null}
                  {onRecruitNC ? (
                    <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1" style={{ backgroundColor: GOLD, color: "var(--recruit-on-accent)" }}>
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Coaches on <BrandName />
                    </span>
                  ) : null}
                  {school.firstSeason ? <span className="rounded-md bg-emerald-400/15 px-2.5 py-1 text-emerald-200">New program · {school.firstSeason}</span> : null}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p className="hidden text-right text-sm font-semibold uppercase leading-6 tracking-[0.3em] text-white/70 lg:block">
              Same grind.
              <br />
              Higher opportunities.
            </p>
            <div className="flex flex-wrap gap-2">
              {familySide ? (
                <a href={`/recruiting/compare?s=${school.id}&step=colleges`} className={`${button} border border-white/20 hover:bg-white/10`}>
                  <BarChart3 className="h-4 w-4" aria-hidden /> Compare
                </a>
              ) : null}
              <a href={`/recruiting/college-map?school=${school.id}`} className={`${button} border border-white/20 hover:bg-white/10`}>
                <MapIcon className="h-4 w-4" aria-hidden /> Map
              </a>
              {school.website ? (
                <a href={school.website} target="_blank" rel="noopener noreferrer" className={`${button} border border-white/20 hover:bg-white/10`}>
                  Athletics <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
          </div>
        </div>
        {familySide ? (
          <div className="relative border-t border-white/10 px-5 py-4 sm:px-8">
            <SchoolActions schoolId={school.id} schoolName={name} />
          </div>
        ) : null}
      </section>

      {focus && !hasTheirTeam ? (
        <p className="mt-4 rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
          No {theirs === "womens" ? "women's" : "men's"} team here in 2026-27.{" "}
          <a href="/recruiting/college-map" className="underline hover:text-white">
            Colleges that have one
          </a>
        </p>
      ) : null}

      {/* Section tabs */}
      <nav aria-label="On this page" className="sticky top-0 z-10 -mx-4 mt-4 overflow-x-auto border-b border-white/10 bg-[#060f1f]/90 px-4 backdrop-blur sm:mx-0 sm:px-0">
        <ul className="flex gap-6 whitespace-nowrap text-sm font-semibold">
          {tabs.map((t, i) => (
            <li key={t.href}>
              <a href={t.href} className={`block border-b-2 py-3 ${i === 0 ? "border-[#D3B574] text-[#D3B574]" : "border-transparent text-white/65 hover:text-white"}`}>
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Column one */}
        <div className="space-y-5">
          <section className={card}>
            <h2 className={cardTitle}>Program snapshot</h2>
            <ul className="mt-2 divide-y divide-white/5">
              {program ? <SnapshotRow icon={Medal} label="Division" value={DIVISION_SHORT[program.division]} /> : null}
              {program?.conference ? <SnapshotRow icon={Building2} label="Conference" value={program.conference} /> : null}
              <SnapshotRow icon={MapPin} label="Location" value={`${school.city}, ${school.state}`} sub={fit?.setting ?? undefined} />
              {fit?.undergrads ? <SnapshotRow icon={Users} label="Undergrads" value={fit.undergrads.toLocaleString("en-US")} /> : null}
              <SnapshotRow
                icon={Trophy}
                label="Team ranking"
                value={ranking ? `No. ${ranking.rank} of ${ranking.of}` : "Unranked"}
                sub={ranking ? `${ranking.pollName}, ${new Date(`${ranking.pollDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}` : undefined}
              />
              {depth ? <SnapshotRow icon={Users} label="Roster" value={`${depth.size} wrestlers`} sub={depth.season ? `${depth.season} roster` : undefined} /> : null}
              {full && rosterRead ? <SnapshotRow icon={MapPin} label={`From ${homeState}`} value={`${ncNow.length} on the roster`} /> : null}
            </ul>
            {ranking ? (
              <a href={ranking.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-white/45 underline hover:text-white">
                The poll
              </a>
            ) : null}
          </section>

          {full ? (
            <section className={card}>
              <div className="flex items-baseline justify-between">
                <h2 className={cardTitle}>{homeStateName} here</h2>
                <a href="#roster" className="text-xs font-semibold" style={{ color: GOLD }}>
                  Where you stand →
                </a>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat value={rosterRead ? String(ncNow.length) : "-"} label="On the roster" sub={rosterRead ? undefined : homeState === "NC" ? "Roster not read" : "Coming soon"} />
                <Stat value={String(wentHere.length)} label={`Committed from ${homeState}`} />
              </div>
              {ncNow.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {ncNow.slice(0, 5).map((w) => (
                    <li key={w.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-semibold">{w.name}</span>
                      <span className="shrink-0 text-xs text-white/50">{[w.weight, w.class].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* Column two */}
        <div className="space-y-5">
          <section id="cost" className={`${card} scroll-mt-16`}>
            <h2 className={cardTitle}>What a year costs{cost ? <span className="font-normal text-white/50"> ({cost.year})</span> : null}</h2>
            {cost ? (
              <>
                <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
                  <div>
                    <p className="text-4xl font-black tracking-tight">{dollars(cost.total)}</p>
                    <p className="mt-1 text-xs text-white/55">{cost.who}</p>
                  </div>
                  <ul className="min-w-[11rem] flex-1 space-y-1 text-xs">
                    {cost.lines.map((l) => (
                      <li key={l.label} className="flex justify-between gap-3 border-b border-white/5 pb-1">
                        <span className="text-white/60">{l.label}</span>
                        <span className="font-semibold">{dollars(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {cost.other ? <p className="mt-3 text-xs text-white/55">{cost.other}</p> : null}
                <details className="mt-3 text-xs text-white/45">
                  <summary className="cursor-pointer">Source · before aid</summary>
                  <p className="mt-1 leading-5">{cost.note}</p>
                </details>
              </>
            ) : tuition && tuition.lines.length > 0 ? (
              <p className="mt-2 text-sm text-white/75">{tuition.lines[0]}</p>
            ) : (
              <p className="mt-2 text-sm text-white/55">Not published.</p>
            )}
          </section>

          {fitResult && ctx ? (
            <section className={card}>
              <div className="flex items-baseline justify-between">
                <h2 className={cardTitle}>A good fit for {ctx.first}?</h2>
                <a href={`/recruiting/compare?s=${school.id}&step=matters`} className="text-xs font-semibold" style={{ color: GOLD }}>
                  {ctx.profileSet ? "Edit goals" : "Add goals"}
                </a>
              </div>
              <div className="mt-2">
                <FitRow icon={Target} label="Athletic" line={fitResult.lines.athletic} athletic />
                <FitRow icon={GraduationCap} label="Academic" line={fitResult.lines.academic} />
                <FitRow icon={DollarSign} label="Financial" line={fitResult.lines.cost} />
                <FitRow icon={MapPin} label="Your goals" line={fitResult.lines.goals} />
              </div>
            </section>
          ) : null}

          {fit ? (
            <section className={card}>
              <h2 className={cardTitle}>What families paid</h2>
              {fit.netPriceInStateOnly && school.state !== "NC" ? (
                <p className="mt-2 text-sm text-white/65">
                  Published for in-state families only.{" "}
                  {fit.netPriceCalculatorUrl ? (
                    <a href={fit.netPriceCalculatorUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: GOLD }}>
                      Their calculator
                    </a>
                  ) : null}
                </p>
              ) : fit.netPriceByIncome?.some((n) => n != null) ? (
                <>
                  <ul className="mt-4 space-y-2.5">
                    {INCOME_BRACKETS.map((label, i) => {
                      const amount = fit.netPriceByIncome?.[i] ?? null
                      const top = Math.max(...(fit.netPriceByIncome ?? []).map((n) => n ?? 0), 1)
                      return (
                        <li key={label} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 text-xs">
                          <span className="text-white/55">{label.replace(" to ", "–")}</span>
                          <span className="h-2 overflow-hidden rounded-full bg-white/10">
                            {amount != null ? <span className="block h-full rounded-full" style={{ width: `${Math.max(4, (amount / top) * 100)}%`, backgroundColor: GOLD }} /> : null}
                          </span>
                          <span className="text-right font-semibold">{amount != null ? dollars(amount) : "-"}</span>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-3 text-xs text-white/40">Average paid after grants, first-year students, 2022-23.</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-white/55">Not published.</p>
              )}
            </section>
          ) : null}
        </div>

        {/* Column three */}
        <div className="space-y-5">
          {full ? (
            <section id="staff" className={`${card} scroll-mt-16`}>
              <h2 className={cardTitle}>Coaching staff</h2>
              <StaffList school={{ id: school.id, programs: school.programs }} focus={theirs} />
            </section>
          ) : (
            <section className="rounded-2xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-5">
              <p className="flex items-center gap-2 text-base font-bold">
                <Lock className="h-4 w-4" style={{ color: GOLD }} aria-hidden /> Part of the Command Center
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-white/75">
                <li>Coaching staff and emails</li>
                <li>NC wrestlers on the roster</li>
                <li>Fit for your wrestler</li>
                <li>Save, track and email the coach</li>
              </ul>
              <a href="/plans" className={`${button} mt-4 bg-[#D3B574] text-[#0A1628] hover:bg-[#e2c98d]`}>
                See plans
              </a>
            </section>
          )}

          {familySide ? (
            <section className={card}>
              <h2 className={cardTitle}>Next steps</h2>
              <ul className="mt-3 space-y-2">
                {[
                  { href: `/recruiting/compare?s=${school.id}&step=colleges`, icon: BarChart3, label: "Compare with other colleges" },
                  { href: "/recruiting/learn/questions-families-ask", icon: Plane, label: "Plan a visit: who pays" },
                  { href: "/my-recruiting/plan", icon: Target, label: "Your recruiting plan" },
                  { href: "/recruiting/learn/paying-for-college", icon: BookOpen, label: "How aid works" },
                ].map(({ href, icon: Icon, label }) => (
                  <li key={href}>
                    <a href={href} className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-semibold hover:border-white/30 hover:bg-white/5">
                      <Icon className="h-4 w-4" style={{ color: GOLD }} aria-hidden />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="h-4 w-4 text-white/40" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {full ? (
        <section id="roster" className={`${card} mt-5 scroll-mt-16`}>
          <h2 className={cardTitle}>Where you stand</h2>
          <WentHereSection schoolId={school.id} schoolName={name} focus={theirs} />
        </section>
      ) : null}

      <section id="academics" className={`${card} mt-5 scroll-mt-16`}>
        <h2 className={cardTitle}>Academics</h2>
        {fit ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={fit.admitRate != null ? `${fit.admitRate}%` : "Open"} label="Admitted" sub={fit.admitRate == null ? "Admits most or does not report" : undefined} />
            <Stat value={satRange[0] != null ? `${satRange[0]}–${satRange[1]}` : "-"} label="SAT middle half" />
            <Stat value={fit.act[0] != null ? `${fit.act[0]}–${fit.act[1]}` : "-"} label="ACT middle half" />
            <Stat value={fit.gradRate != null ? `${fit.gradRate}%` : "-"} label="Graduate" sub={fit.gradRateKind ?? undefined} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/55">Not reported.</p>
        )}
        {majorLabels.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {majorLabels.slice(0, 8).map((m) => (
              <span key={m} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75">
                {m}
              </span>
            ))}
            {majorLabels.length > 8 ? <span className="px-1 py-1 text-xs text-white/45">+{majorLabels.length - 8} more fields of study</span> : null}
          </div>
        ) : null}
        <p className="mt-4 text-xs text-white/40">US Department of Education.</p>
      </section>

      {niche && Object.keys(niche.grades).length ? (
        <section id="campus" className={`${card} mt-5 scroll-mt-16`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className={cardTitle}>Campus life grades</h2>
            {niche.grades.overall ? (
              <span className="text-sm text-white/60">
                Overall <span className={`ml-1 rounded-md px-2 py-0.5 text-base font-black ring-1 ${gradeTone(niche.grades.overall)}`}>{niche.grades.overall}</span>
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {NICHE_CATEGORIES.filter((c) => c.key !== "overall" && niche.grades[c.key]).map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="text-xs text-white/65">{c.label}</span>
                <span className={`rounded px-1.5 py-0.5 text-sm font-black ring-1 ${gradeTone(niche.grades[c.key]!)}`}>{niche.grades[c.key]}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/40">
            {NICHE_SOURCE}.{" "}
            {niche.url ? (
              <a href={niche.url} target="_blank" rel="noreferrer" className="underline hover:text-white/70">
                The full report card
              </a>
            ) : null}
          </p>
        </section>
      ) : null}
    </div>
  )

  return familySide ? (
    <PortalShell active="colleges">{page}</PortalShell>
  ) : (
    <main className="min-h-screen bg-[#060f1f] px-4 py-6 sm:px-6 lg:px-8">{page}</main>
  )
}
