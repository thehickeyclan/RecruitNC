/**
 * The Recruiting War Room: the family's recruiting portal, on one page (Matt, 12 Oct 2026).
 *
 * Coaches got a portal (app/coach-home). This is the family's: where the planning, the learning
 * and the activity happen. The map, My List, Email the coach and the schedule are features of it,
 * not places of their own.
 *
 * - **Plan** - this month's steps, the college list, where the wrestler competes next. Part of
 *   NC United Blue; everyone else sees what it is and how to get it.
 * - **Learn** - how recruiting works, in the order a family needs it.
 * - **Activity** - who wrote, who looked, what a coach will find missing. The panels are the
 *   profile's own, so the views paywall and messaging rules are the same here as there.
 */
import Link from "next/link"
import { redirect } from "next/navigation"

import { seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { isCollegeListStatus, type CollegeListStatus } from "@/lib/college-programs/list"
import { gradeLabel } from "@/lib/college-programs/outreach-results"
import data from "@/lib/college-programs/programs-2026-27.json"
import { questionnairesForSchool } from "@/lib/college-programs/questionnaires"
import { listUpcomingEvents, type UpcomingEvent } from "@/lib/college-programs/schedule"
import { DIVISION_SHORT, primaryDivision, type CollegeMapSchool } from "@/lib/college-programs/types"
import { completenessFromRow } from "@/lib/profile-completeness"
import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { MyRecruitingAthlete } from "./my-recruiting-athlete"
import { WarRoomLearn } from "./war-room-learn"
import { WarRoomPlan, type WarRoomSchool, type WarRoomWrestler } from "./war-room-plan"

export const dynamic = "force-dynamic"

export const metadata = { title: "Recruiting War Room | RecruitNC" }

const SCHOOLS = new Map([...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s]))

export default async function RecruitingWarRoomPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/signin?returnTo=%2Fmy-recruiting")

  const admin = createAdminClient()
  const [ids, { viewer }] = await Promise.all([
    familyAthleteIds(admin, user.id),
    resolveRankingViewerForUser({ admin, userId: user.id }),
  ])
  const blue = Boolean(viewer.isBlueMember || viewer.isAdmin)

  const { data: rows } = ids.length
    ? await admin
        .from("athletes")
        .select("id, name, firstName, graduationyear, highschool, photourl, academic_gpa, academic_sat, academic_act, highlight_video_url, phone, contactEmail")
        .in("id", ids)
        .order("graduationyear", { ascending: true })
    : { data: [] }
  const athletes = (rows ?? []).map((a) => ({
    id: String(a.id),
    name: String(a.name ?? "").trim() || "Your wrestler",
    firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").trim().split(" ")[0] || "Your wrestler",
    classYear: a.graduationyear ? Number(a.graduationyear) : null,
    highSchool: a.highschool && a.highschool !== "Not specified" ? String(a.highschool) : null,
    photo: a.photourl ? String(a.photourl) : null,
    completeness: completenessFromRow(a as Record<string, unknown>),
  }))

  // The plan is Blue's. Each part fails on its own: a list that will not load must not take the page down.
  let schools: WarRoomSchool[] = []
  const schedules = new Map<string, UpcomingEvent[]>()
  if (blue) {
    const [list, ...events] = await Promise.all([
      admin.from("college_list_items").select("school_id, status, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
      ...athletes.map((a) => listUpcomingEvents(admin, a.id).catch(() => ({ available: false, events: [] as UpcomingEvent[] }))),
    ])
    schools = (list.data ?? []).flatMap((row) => {
      const school = SCHOOLS.get(String(row.school_id))
      if (!school) return []
      const status: CollegeListStatus = isCollegeListStatus(row.status) ? row.status : "interested"
      return [
        {
          id: school.id,
          name: school.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
          place: `${school.city}, ${school.state}`,
          level: DIVISION_SHORT[primaryDivision(school)],
          status,
          hasQuestionnaire: questionnairesForSchool(school.id).length > 0,
        },
      ]
    })
    athletes.forEach((a, i) => schedules.set(a.id, events[i]?.events ?? []))
  }

  const senior = seniorClassYear()
  const wrestlers: WarRoomWrestler[] = athletes.map((a) => ({
    id: a.id,
    firstName: a.firstName,
    name: a.name,
    grade: gradeLabel(a.classYear, senior),
    profilePercent: a.completeness.percent,
    profileTodo: a.completeness.items.find((item) => !item.done) ?? null,
    events: schedules.get(a.id) ?? [],
  }))

  const names = athletes.map((a) => a.firstName)
  const who = names.length === 0 ? "your wrestler" : names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">RecruitNC · Recruiting Portal</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">Recruiting War Room</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
          Welcome. This is where recruiting gets done for {who}: the plan, what to learn next, and which college programs are paying attention.
        </p>

        <nav aria-label="War Room sections" className="mt-5 flex gap-2 text-sm font-bold">
          {[
            ["#plan", "Plan"],
            ["#learn", "Learn"],
            ["#activity", "Activity"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:border-[#D3B574] hover:text-white">
              {label}
            </a>
          ))}
        </nav>

        {athletes.length === 0 ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-lg font-bold">No wrestler on this account yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-white/60">
              Claim your profile, or link to your child&apos;s as a parent, and the War Room fills in from their record.
            </p>
            <Link href="/athletes" className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
              Find the profile
            </Link>
          </div>
        ) : null}

        <section id="plan" className="mt-10 scroll-mt-24">
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">Plan</h2>
          <p className="mt-1 text-sm text-white/55">What to do next, the schools you&apos;re aiming at, and where coaches can watch.</p>
          {athletes.length > 0 ? <WarRoomPlan blue={blue} wrestlers={wrestlers} schools={schools} /> : null}
        </section>

        <section id="learn" className="mt-12 scroll-mt-24">
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">Learn</h2>
          <p className="mt-1 text-sm text-white/55">How college wrestling recruiting works, in the order a family needs it.</p>
          <WarRoomLearn />
        </section>

        <section id="activity" className="mt-12 scroll-mt-24">
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">Activity</h2>
          <p className="mt-1 text-sm text-white/55">Which programs have looked, which have written, and what a coach will find on the profile.</p>
          <div className="mt-5 space-y-10">
            {athletes.map((a) => (
              <MyRecruitingAthlete key={a.id} athlete={a} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
