/**
 * A college's page in the Recruiting Portal (13 Oct 2026).
 *
 * The map found the 436 schools; this is where a school's information lives. It has an address,
 * so the Command Center list, the map and one parent texting another can all point at it -
 * which the map's pop-up card never could.
 *
 * What the school is and where is public. Who to contact, the recruiting questionnaire, who from
 * North Carolina went there, My List and the coach email are the Recruiting Portal: NC United
 * Blue (admins and verified coaches see the read-only parts too). Each section asks its own API,
 * so the gate is the same here as on the map.
 */
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ChevronRight, ExternalLink, Lock, MapPin, ShieldCheck, Trophy } from "lucide-react"

import { SchoolActions } from "@/components/colleges/school-actions"
import { StaffList } from "@/components/colleges/staff-list"
import { WentHereSection } from "@/components/colleges/went-here-section"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { loadCollegeMap } from "@/lib/college-programs/load"
import { schoolLogoUrl } from "@/lib/college-programs/logo"
import data from "@/lib/college-programs/programs-2026-27.json"
import { STATE_NAMES } from "@/lib/college-programs/states"
import { TUITION_NOTE, costFacts, tuitionFacts } from "@/lib/college-programs/tuition"
import { rankingSentence } from "@/lib/college-programs/team-rankings"
import { teamRankingsForSchool } from "@/lib/college-programs/team-rankings-snapshot"
import { DIVISION_COLOR, DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const SCHOOLS = new Map([...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s]))
const spoken = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").trim()

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const school = SCHOOLS.get((await params).id)
  if (!school) return { title: "College wrestling program | RecruitNC" }
  const name = spoken(school.name)
  const levels = school.programs.map((p) => DIVISION_SHORT[p.division]).join(" / ")
  return {
    title: `${name} wrestling | RecruitNC`,
    description: `${name} wrestling (${levels}) in ${school.city}, ${STATE_NAMES[school.state] ?? school.state}: programs, conference and recruiting information for wrestlers and families.`,
  }
}

export default async function SchoolPage({ params }: Params) {
  const { id } = await params
  const school = SCHOOLS.get(id)
  if (!school) notFound()

  const admin = createAdminClient()
  const { viewer, userId } = await resolvePortalViewer({ supabase: await createClient(), admin })
  const full = Boolean(viewer.isBlueMember || viewer.isAdmin || viewer.isVerifiedCoach)
  // "On RecruitNC" is part of the portal; a map that will not load must not take the page down.
  const onRecruitNC = full
    ? await loadCollegeMap(admin, true)
        .then((map) => map.schools.find((s) => s.id === id)?.onRecruitNC === true)
        .catch(() => false)
    : false

  const name = spoken(school.name)
  const tuition = tuitionFacts(school.id, school.state)
  const cost = costFacts(school.id, school.state)
  // The page follows the family's wrestler: her team, its coach and its ranking come first.
  const focus = await familyFocus(admin, userId)
  const theirs = focus?.gender ?? null
  const hasTheirTeam = theirs ? school.programs.some((p) => p[theirs]) : true
  const programs = theirs ? [...school.programs].sort((a, b) => Number(b[theirs]) - Number(a[theirs])) : school.programs
  const rankings = (await teamRankingsForSchool(school.id)).sort((a, b) => (theirs ? Number(b.gender === theirs) - Number(a.gender === theirs) : 0))
  const logo = await schoolLogoUrl(school)
  return (
    <main className="min-h-screen bg-[#060f1f] text-white">
      <section className="relative border-b border-white/10 bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs font-semibold text-white/55">
            <a href="/my-recruiting" className="hover:text-white">
              Recruiting Command Center
            </a>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <a href="/recruiting/college-map" className="hover:text-white">
              College programs
            </a>
          </nav>
          <div className="mt-3 flex items-center gap-4">
            {logo ? (
              // A white tile: college marks are drawn for light backgrounds and vanish on navy.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={`${name} logo`} className="h-16 w-16 shrink-0 rounded-md bg-white object-contain p-1.5 sm:h-20 sm:w-20" />
            ) : null}
            <h1 className={`text-4xl leading-[0.95] text-white sm:text-6xl ${tocDisplayClass()}`}>{name}</h1>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-white/70">
            <MapPin className="h-4 w-4 text-[#D7B968]" aria-hidden />
            {school.city}, {STATE_NAMES[school.state] ?? school.state}
          </p>
          {school.firstSeason ? (
            <p className="mt-2 text-sm font-semibold text-[#D7B968]">New program · first season {school.firstSeason}, recruiting now</p>
          ) : null}

          {focus && !hasTheirTeam ? (
            <p className="mt-4 max-w-xl rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
              {name} does not have a {theirs === "womens" ? "women's" : "men's"} wrestling team in 2026-27.{" "}
              <a href="/recruiting/college-map" className="underline hover:text-white">
                See the colleges that do
              </a>
            </p>
          ) : null}

          <ul className="mt-4 space-y-2">
            {programs.map((p) => (
              <li key={p.division} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-0.5 inline-flex min-w-[3.25rem] justify-center rounded-sm px-1.5 py-0.5 text-xs font-bold text-[#071427]"
                  style={{ backgroundColor: DIVISION_COLOR[p.division] }}
                >
                  {DIVISION_SHORT[p.division]}
                </span>
                <span className="text-white/90">
                  {(theirs === "womens" ? [p.womens ? "Women's" : null, p.mens ? "Men's" : null] : [p.mens ? "Men's" : null, p.womens ? "Women's" : null]).filter(Boolean).join(" & ")} wrestling
                  {p.conference ? <span className="text-white/55"> · {p.conference}</span> : null}
                </span>
              </li>
            ))}
          </ul>

          {rankings.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {rankings.map((r) => (
                <li key={`${r.scope}-${r.gender}`} className="flex items-start gap-2 text-sm">
                  <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-[#D7B968]" aria-hidden />
                  <span className="text-white/90">
                    <span className="font-bold text-white">{r.gender === "womens" ? "Women: " : rankings.length > 1 ? "Men: " : ""}</span>
                    {rankingSentence(r)}.{" "}
                    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white/55 underline hover:text-white">
                      The poll
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {cost ? (
            <div className="mt-4 max-w-xl rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 text-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#D7B968]">
                What a year costs{cost.control ? ` · ${cost.control} college` : ""}
              </p>
              <p className="mt-1 text-base font-bold text-white">{cost.headline}</p>
              <p className="text-white/75">{cost.breakdown}</p>
              {cost.other ? <p className="text-white/55">{cost.other}</p> : null}
              <p className="mt-1.5 text-xs leading-5 text-white/50">
                {cost.note}{" "}
                <a href="/recruiting/learn/paying-for-college" className="underline hover:text-white/80">
                  What a family really pays
                </a>
              </p>
            </div>
          ) : tuition && (tuition.control || tuition.lines.length > 0) ? (
            <div className="mt-4 max-w-xl rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 text-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#D7B968]">
                Tuition{tuition.control ? ` · ${tuition.control} college` : ""}
              </p>
              {tuition.lines.map((line, i) => (
                <p key={line} className={i === 0 ? "mt-1 font-bold text-white" : "text-white/65"}>
                  {line}
                </p>
              ))}
              {tuition.lines.length > 0 && !/No tuition/.test(tuition.lines[0]) ? <p className="mt-1.5 text-xs leading-5 text-white/50">{TUITION_NOTE}</p> : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
            {onRecruitNC ? (
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-white/10 px-2 py-1 text-xs text-white">
                <ShieldCheck className="h-3.5 w-3.5 text-[#D7B968]" aria-hidden /> Coaches on RecruitNC
              </span>
            ) : null}
            {school.website ? (
              <a href={school.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#F5D985] hover:underline">
                Athletics website <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
            <a href={`/recruiting/college-map?school=${school.id}`} className="inline-flex items-center gap-1.5 text-[#F5D985] hover:underline">
              See it on the map <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>

          <SchoolActions schoolId={school.id} schoolName={name} />
        </div>
        <TocPatrioticBar />
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {full ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-[#0B1D3A]/60 p-5">
              <h2 className={`text-2xl text-white ${tocDisplayClass()}`}>Who to contact</h2>
              <StaffList school={{ id: school.id, programs: school.programs }} focus={theirs} />
            </div>
            <div className="rounded-sm border border-white/10 bg-[#0B1D3A]/60 p-5">
              <h2 className={`text-2xl text-white ${tocDisplayClass()}`}>Where you stand</h2>
              <WentHereSection schoolId={school.id} schoolName={name} focus={theirs} />
            </div>
          </div>
        ) : (
          <div className="rounded-sm border border-[#D7B968]/30 bg-[#D7B968]/10 p-5 sm:p-6">
            <p className="flex items-center gap-2 text-base font-bold">
              <Lock className="h-4 w-4 text-[#F5D985]" aria-hidden /> The rest of this page is part of NC United Blue
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Blue members see {name}&apos;s coaching staff and how to reach them, the recruiting questionnaire, which North
              Carolina wrestlers went there and what they had won, and can save the school to their list and email the
              coach from verified results.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/blue" className="rounded-sm bg-[#CC0000] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a80000]">
                Learn about Blue
              </a>
              <a href="/recruiting/college-map" className="rounded-sm border border-white/25 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
                See every program on the map
              </a>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
