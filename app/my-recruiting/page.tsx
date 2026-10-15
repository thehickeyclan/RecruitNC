/**
 * The Recruiting Command Center home (Matt's design, 14 Oct 2026): where recruiting stands for the
 * family's wrestler at a glance - four numbers, the next steps, recent activity, the college list
 * and the map - inside the portal frame, with Plan, Colleges, Map, Messages, Learn and Activity a
 * tap away in the menu. Was one long page with Plan, Learn and Activity sections (named the War
 * Room until 13 Oct, which is why files here still say so).
 *
 * The plan, list and schedule are NC United Blue; everyone else sees what they are and how to get
 * them. The data comes from ./load.ts, shared with the other portal pages.
 */
import Link from "next/link"
import { ArrowRight, Eye, ListChecks, Pencil, Star, UserCheck } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { buildMapPreview } from "@/lib/college-programs/map-preview"
import { listTarget, planSteps } from "@/lib/college-programs/roadmap"
import data from "@/lib/college-programs/programs-2026-27.json"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import type { CollegeMapSchool } from "@/lib/college-programs/types"
import { loadCommandCenter } from "./load"
import { MapPreviewCard } from "./map-preview"
import { WarRoomPlan } from "./war-room-plan"

export const dynamic = "force-dynamic"
export const metadata = { title: "Recruiting Command Center | RecruitNC" }

const ALL_SCHOOLS = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]
const card = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const ago = (iso: string) => {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function CommandCenterHome() {
  const cc = await loadCommandCenter("/my-recruiting")
  const { athletes, wrestlers, schools, blue, focus, views, premium } = cc
  const first = athletes[0] ?? null
  const w = wrestlers[0] ?? null

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

  const tiles = first
    ? [
        { icon: UserCheck, value: `${first.completeness.percent}%`, label: "Profile complete", action: first.completeness.percent === 100 ? "Keep it current" : "Finish the profile", href: `/athletes/${first.id}` },
        { icon: Star, value: String(schools.length), label: "Colleges on your list", action: schools.length >= target ? "Compare them" : `Build toward ${target}`, href: schools.length >= 2 ? "/recruiting/compare" : "/recruiting/college-map" },
        {
          icon: Eye,
          value: seen ? String(seen.programs) : "–",
          label: "College programs viewed the profile",
          action: !seen || seen.programs === 0 ? "Finish the profile and email a coach" : "See who",
          href: "/my-recruiting/activity",
        },
        { icon: ListChecks, value: String(open), label: "Next actions", action: open ? "See your plan" : "All done for now", href: "#plan" },
      ]
    : []

  // Recent activity: colleges saved or moved, and college programs that viewed the profile.
  const recent = [
    ...schools.filter((s) => s.savedAt).map((s) => ({ at: s.savedAt!, title: s.name, text: "On your college list" })),
    ...(premium && seen ? seen.schools.map((v) => ({ at: v.lastViewedAt, title: v.school, text: `Viewed ${first?.firstName ?? "the"}'s profile` })) : []),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6)

  return (
    <PortalShell active="home">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Recruiting Command Center</h1>
          <p className="mt-1 text-sm text-white/65">
            {first ? `Welcome back. Here is where ${athletes.map((a) => a.firstName).join(" and ")}'s recruiting stands.` : "Welcome. This is where recruiting gets done."}
          </p>
          {first ? (
            <p className="mt-1 text-sm text-white/45">{[first.classYear ? `Class of ${first.classYear}` : null, first.highSchool].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
        {first ? (
          <Link href={`/athletes/${first.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/85 hover:border-[#D3B574]">
            <Pencil className="h-4 w-4" aria-hidden /> Edit profile
          </Link>
        ) : null}
      </header>

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
          <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map(({ icon: Icon, value, label, action, href }) => (
              <li key={label}>
                <Link href={href} className={`${card} flex h-full flex-col p-4 hover:border-[#D3B574]/60`}>
                  <Icon className="h-4 w-4 text-[#D3B574]" aria-hidden />
                  <span className="mt-2 text-3xl font-black">{value}</span>
                  <span className="text-sm text-white/70">{label}</span>
                  <span className="mt-auto pt-2 text-xs font-bold text-[#D3B574]">{action} →</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <section id="plan" className="scroll-mt-24 xl:col-span-2" aria-label="Your plan">
              <WarRoomPlan blue={blue} wrestlers={wrestlers} schools={schools} />
            </section>

            <div className="grid content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
              <section className={`${card} p-5`} aria-labelledby="cc-recent">
                <div className="flex items-center justify-between">
                  <h2 id="cc-recent" className="text-sm font-black uppercase tracking-widest text-[#D3B574]">
                    Recent activity
                  </h2>
                  <Link href="/my-recruiting/activity" className="text-xs font-bold text-white/60 hover:text-white">
                    View all →
                  </Link>
                </div>
                {recent.length ? (
                  <ul className="mt-3 divide-y divide-white/10">
                    {recent.map((r) => (
                      <li key={`${r.title}-${r.at}`} className="flex items-start justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-white">{r.title}</span>
                          <span className="block text-xs text-white/55">{r.text}</span>
                        </span>
                        <span className="shrink-0 text-xs text-white/45">{ago(r.at)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-white/60">Nothing yet. Save colleges from the map and they appear here, with the college programs that view the profile.</p>
                )}
              </section>

              <div className="[&>a]:mt-0">
              <MapPreviewCard
                preview={buildMapPreview(ALL_SCHOOLS, { team: focus?.gender ?? null, savedIds: schools.map((s) => s.id), accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN })}
                who={focus?.names.join(" and ") || null}
                team={focus?.gender ?? null}
                savedCount={schools.length}
              />
              </div>

              {blue && schools.length >= 2 ? (
                <Link href="/recruiting/compare" className={`${card} flex items-center justify-between gap-3 border-[#D3B574]/40 p-4 hover:border-[#D3B574]`}>
                  <span>
                    <span className="block text-sm font-bold text-white">Compare your colleges</span>
                    <span className="block text-xs text-white/60">Fit, cost, admissions and the team, side by side.</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </PortalShell>
  )
}
