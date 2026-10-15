/**
 * The Recruiting Command Center home: a dashboard taken in at a glance (Matt's design, 15 Oct
 * 2026). The detail lives behind the menu - Plan (steps and schedule), Colleges (the board and the
 * comparison), Learn, Activity - and every card here links into it.
 *
 * Every number is real: the plan steps, the list, the profile views and the inbox. Data comes from
 * ./load.ts, shared with the other portal pages.
 */
import Link from "next/link"
import { ArrowRight, CalendarDays, Check, Circle, DollarSign, HelpCircle, ListChecks, Mail, Pencil, Scale } from "lucide-react"

import { InfoSheetCard } from "@/components/portal/info-sheet-card"
import { PortalShell } from "@/components/portal/portal-shell"
import { unreadCount } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { COLLEGE_LIST_STATUS_LABEL } from "@/lib/college-programs/list"
import { buildMapPreview } from "@/lib/college-programs/map-preview"
import data from "@/lib/college-programs/programs-2026-27.json"
import { listTarget, planSteps } from "@/lib/college-programs/roadmap"
import type { CollegeMapSchool } from "@/lib/college-programs/types"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildInfoSheet } from "./info-sheet"
import { loadCommandCenter } from "./load"
import { MapPreviewCard } from "./map-preview"

export const dynamic = "force-dynamic"
export const metadata = { title: "Recruiting Command Center | RecruitNC" }

const ALL_SCHOOLS = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]
const card = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const title = "text-base font-black text-white"
const more = "inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:underline"

const LEARN_LINKS = [
  { icon: CalendarDays, label: "Grade-by-grade timeline", href: "/recruiting/learn/timeline" },
  { icon: Scale, label: "Rules by level", href: "/recruiting/learn" },
  { icon: DollarSign, label: "Costs and financial aid", href: "/recruiting/learn/paying-for-college" },
  { icon: HelpCircle, label: "Questions families ask", href: "/recruiting/learn/questions-families-ask" },
]

export default async function CommandCenterHome() {
  const cc = await loadCommandCenter("/my-recruiting")
  const { athletes, wrestlers, schools, blue, focus, views, viewerId } = cc
  const admin = createAdminClient()
  const first = athletes[0] ?? null
  const w = wrestlers[0] ?? null

  const [lastCompeted, unread, sheet] = await Promise.all([
    first ? loadLastCompeted(admin, [first.id], new Map([[first.id, first.classYear]])).then((m) => m.get(first.id) ?? null).catch(() => null) : null,
    unreadCount(admin, viewerId).catch(() => 0),
    blue && first ? buildInfoSheet(admin, first.id).catch(() => null) : null,
  ])
  const weight = lastCompeted?.weight ? `${String(lastCompeted.weight).replace(/\s*lbs?$/i, "")} lbs` : null

  const steps = w
    ? planSteps({
        firstName: w.firstName,
        athleteId: w.id,
        grade: w.grade,
        profilePercent: w.profilePercent,
        profileTodo: w.profileTodo,
        listStatuses: schools.map((s) => s.status),
        listLevels: schools.map((s) => s.level),
        questionnairesWaiting: schools.filter((s) => s.hasQuestionnaire && s.status === "interested").length,
        scheduleCount: w.events.length,
      })
    : []
  const open = steps.filter((s) => !s.done).length
  const seen = first ? views.get(first.id) : null
  const target = listTarget(w?.grade ?? null)
  const percent = first?.completeness.percent ?? 0

  return (
    <PortalShell active="home">
      {/* Header band: who this is for, over an NC arena. */}
      <section className="relative -mx-4 -mt-6 overflow-hidden border-b border-white/10 px-4 pb-6 pt-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-banner-nchsaa-2026-arena.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628] via-[#0A1628]/85 to-[#0A1628]/40" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">RecruitNC · Recruiting Portal</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">Recruiting Command Center</h1>
            <p className="mt-2 text-sm text-white/75 sm:text-base">
              {first ? `Welcome back. Here is ${athletes.map((a) => a.firstName).join(" and ")}'s recruiting progress and what to do next.` : "Welcome. This is where recruiting gets done."}
            </p>
            {first ? <p className="mt-1 text-sm text-white/50">{[first.classYear ? `Class of ${first.classYear}` : null, first.highSchool, weight].filter(Boolean).join(" · ")}</p> : null}
          </div>
          {first ? (
            <Link href={`/athletes/${first.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-[#0A1628]/60 px-3 py-2 text-sm font-semibold text-white hover:border-[#D3B574]">
              <Pencil className="h-4 w-4" aria-hidden /> Edit profile
            </Link>
          ) : null}
        </div>
        {first ? (
          <ul className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <li className={`${card} bg-[#0f1c2e]/90 p-4`}>
              <p className="text-3xl font-black">{percent}%</p>
              <p className="text-sm text-white/70">Profile complete</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#D3B574]" style={{ width: `${percent}%` }} />
              </div>
            </li>
            <li>
              <Link href="/my-recruiting/colleges" className={`${card} flex h-full flex-col bg-[#0f1c2e]/90 p-4 hover:border-[#D3B574]/60`}>
                <span className="text-3xl font-black">{schools.length}</span>
                <span className="text-sm text-white/70">Colleges on my list</span>
                <span className={`${more} mt-auto pt-1`}>{schools.length >= target ? "Compare them" : `Build toward ${target}`} →</span>
              </Link>
            </li>
            <li>
              <Link href="/my-recruiting/activity" className={`${card} flex h-full flex-col bg-[#0f1c2e]/90 p-4 hover:border-[#D3B574]/60`}>
                <span className="text-3xl font-black">{seen ? seen.programs : "–"}</span>
                <span className="text-sm text-white/70">College programs viewed</span>
                <span className={`${more} mt-auto pt-1`}>{!seen || seen.programs === 0 ? "Keep building" : "See who"} →</span>
              </Link>
            </li>
            <li>
              <Link href="/my-recruiting/plan" className={`${card} flex h-full flex-col bg-[#0f1c2e]/90 p-4 hover:border-[#D3B574]/60`}>
                <span className="text-3xl font-black">{open}</span>
                <span className="text-sm text-white/70">Next actions</span>
                <span className={`${more} mt-auto pt-1`}>{open ? "View your plan" : "All done for now"} →</span>
              </Link>
            </li>
          </ul>
        ) : null}
      </section>

      {!first ? (
        <div className={`${card} mt-8 p-8 text-center`}>
          <p className="text-lg font-bold">{cc.graduatesOnly ? "No wrestler still in high school on this account" : "No wrestler on this account yet"}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-white/60">
            {cc.graduatesOnly
              ? "The Command Center is for wrestlers who are still being recruited. Link a younger wrestler and it fills in from their record."
              : "Claim your profile, or link to your child's as a parent, and the Command Center fills in from their record."}
          </p>
          <Link href="/athletes" className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
            Find the profile
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {/* Next steps */}
            <section className={`${card} flex flex-col p-5`} aria-labelledby="cc-steps">
              <div className="flex items-baseline justify-between">
                <h2 id="cc-steps" className={title}>
                  Your next steps
                </h2>
                <span className="text-xs text-white/45">This month</span>
              </div>
              {blue ? (
                <ul className="mt-3 space-y-3">
                  {steps.slice(0, 4).map((s) => (
                    <li key={s.key} className="flex gap-3">
                      {s.done ? <Check className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-500 p-0.5 text-[#0A1628]" aria-label="Done" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-white/40" aria-label="To do" />}
                      <span className="min-w-0">
                        <span className={`block text-sm font-semibold ${s.done ? "text-white/60" : "text-white"}`}>{s.title}</span>
                        <span className="line-clamp-1 text-xs text-white/45">{s.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-white/60">The plan, college board and schedule are part of NC United Blue.</p>
              )}
              <Link href={blue ? "/my-recruiting/plan" : "/blue"} className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg bg-[#D3B574] px-3 py-2 pt-2 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d] [margin-top:1rem]">
                {blue ? "View your full plan" : "Learn about Blue"} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </section>

            {/* My college list */}
            <section className={`${card} flex flex-col p-5`} aria-labelledby="cc-list">
              <div className="flex items-baseline justify-between">
                <h2 id="cc-list" className={title}>
                  My college list <span className="text-xs font-semibold text-white/45">{schools.length} {schools.length === 1 ? "school" : "schools"}</span>
                </h2>
                <Link href="/my-recruiting/colleges" className={more}>
                  View all →
                </Link>
              </div>
              {schools.length ? (
                <ul className="mt-3 space-y-3">
                  {schools.slice(0, 3).map((s) => (
                    <li key={s.id} className="flex items-center gap-3">
                      {s.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo} alt="" className="h-10 w-10 shrink-0 rounded bg-white object-contain p-0.5" />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded bg-white/[0.06]" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <a href={`/recruiting/schools/${s.id}`} className="block truncate text-sm font-bold text-white hover:underline">
                          {s.name}
                        </a>
                        <span className="block text-xs text-white/50">
                          {s.level} · {COLLEGE_LIST_STATUS_LABEL[s.status]}
                        </span>
                      </span>
                      <Link href={`/my-recruiting/colleges?email=${s.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs font-bold text-white/85 hover:border-[#D3B574]">
                        <Mail className="h-3.5 w-3.5" aria-hidden /> Email
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-white/60">No colleges yet. Save them from the map; go wide, across levels.</p>
              )}
              <Link href={schools.length ? "/my-recruiting/colleges" : "/recruiting/college-map"} className={`${more} mt-auto pt-4`}>
                {schools.length ? "Open your college board" : "Open the map"} →
              </Link>
            </section>

            {/* The map */}
            <div className="min-w-0 [&>a]:mt-0">
              <MapPreviewCard
                preview={buildMapPreview(ALL_SCHOOLS, { team: focus?.gender ?? null, savedIds: schools.map((s) => s.id), accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN })}
                who={focus?.names.join(" and ") || null}
                team={focus?.gender ?? null}
                savedCount={schools.length}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Recruiting activity */}
            <section className={`${card} p-5`} aria-labelledby="cc-activity">
              <div className="flex items-baseline justify-between">
                <h2 id="cc-activity" className={title}>
                  Recruiting activity
                </h2>
                <Link href="/my-recruiting/activity" className={more}>
                  View all →
                </Link>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <dt className="sr-only">College programs that viewed</dt>
                  <dd className="text-3xl font-black text-[#D3B574]">{seen ? seen.programs : 0}</dd>
                  <dd className="text-[11px] leading-4 text-white/55">Programs viewed {first.firstName}</dd>
                </div>
                <div>
                  <dt className="sr-only">Total profile views</dt>
                  <dd className="text-3xl font-black">{seen ? seen.total : 0}</dd>
                  <dd className="text-[11px] leading-4 text-white/55">Total profile views</dd>
                </div>
                <div>
                  <dt className="sr-only">New messages</dt>
                  <dd className="text-3xl font-black">{unread}</dd>
                  <dd className="text-[11px] leading-4 text-white/55">{unread ? <Link href="/inbox" className="underline">New messages</Link> : "New messages"}</dd>
                </div>
              </dl>
            </section>

            {/* Learn */}
            <section className={`${card} p-5`} aria-labelledby="cc-learn">
              <div className="flex items-baseline justify-between">
                <h2 id="cc-learn" className={title}>
                  Learn
                </h2>
                <Link href="/my-recruiting/learn" className={more}>
                  Open →
                </Link>
              </div>
              <p className="mt-1 text-xs text-white/50">Rules, timelines, costs and answers to the questions families ask.</p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {LEARN_LINKS.map(({ icon: Icon, label, href }) => (
                  <li key={label}>
                    <a href={href} className="flex h-full items-center gap-2 rounded-lg border border-white/10 p-2.5 text-xs font-semibold text-white/85 hover:border-[#D3B574]/60">
                      <Icon className="h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden /> {label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {/* Info sheet, or the brand line before there is one */}
            {sheet ? (
              <InfoSheetCard sheet={sheet} name={first.firstName} />
            ) : (
              <section className={`${card} relative overflow-hidden p-5`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/hero-banner-nchsaa-2026-arena.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
                <p className="relative text-lg font-black leading-7 text-white">Same grind. Higher opportunities.</p>
                <p className="relative mt-2 text-sm text-white/65">Plan, prepare, compete, succeed.</p>
              </section>
            )}
          </div>

          {blue ? (
            <p className="mt-4 flex items-center gap-2 text-xs text-white/45">
              <ListChecks className="h-4 w-4" aria-hidden /> Your plan, list and schedule are part of NC United Blue.
            </p>
          ) : null}
        </>
      )}
    </PortalShell>
  )
}
