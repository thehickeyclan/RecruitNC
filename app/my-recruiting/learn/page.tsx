/**
 * Learn, the heart of the Command Center (Matt, 14 Oct 2026: "the learning portal is critical").
 *
 * It opens on the family's own wrestler: where they are and the three things that matter this
 * year, an instant search across the whole library, the contact and visit dates laid out across
 * high school with "you are here", and then every topic. Every word comes from the verified
 * library in lib/recruiting/learn.
 */
import Link from "next/link"
import { ArrowRight, BookOpen, CalendarDays, ListChecks, DollarSign, HelpCircle, Scale, ShieldAlert, Trophy } from "lucide-react"

import { LearnSearch } from "@/components/portal/learn-search"
import { PortalShell } from "@/components/portal/portal-shell"
import { RulesTimeline, type TrackTimeline } from "@/components/portal/rules-timeline"
import { D1_TRACK_LABEL, d1TrackFor, type D1Track } from "@/lib/recruiting/learn/content"
import { buildSearchIndex } from "@/lib/recruiting/learn/search-index"
import { GRADE_NAME, alwaysOpen, gradeFromLabel, openingsFor, timelineFor } from "@/lib/recruiting/learn/timeline"
import { loadCommandCenter } from "../load"
import { WarRoomLearn } from "../war-room-learn"

export const dynamic = "force-dynamic"
export const metadata = { title: "Learn | Recruiting Command Center" }

const TRACKS: D1Track[] = ["men-2028", "men-2027", "women"]
const TOPICS = [
  { icon: CalendarDays, title: "Your timeline", text: "What to do each year, 8th grade to signing", href: "/recruiting/learn/timeline" },
  { icon: ListChecks, title: "Working the process", text: "Questionnaires, writing to coaches, camps, calls", href: "/recruiting/learn/working-the-process" },
  { icon: HelpCircle, title: "Questions families ask", text: "Visits, NIL, revenue sharing, the Ivies", href: "/recruiting/learn/questions-families-ask" },
  { icon: DollarSign, title: "Paying for college", text: "Full rides, academics, need-based aid", href: "/recruiting/learn/paying-for-college" },
  { icon: Scale, title: "The rules, level by level", text: "D1, D2, D3, NAIA and junior college", href: "/recruiting/learn" },
  { icon: Trophy, title: "Tournaments coaches watch", text: "Men's folkstyle, freestyle, and women's", href: "/recruiting/learn/tournaments" },
  { icon: ShieldAlert, title: "Staying eligible in NC", text: "Prize money and NIL in high school", href: "/recruiting/learn/staying-eligible-in-north-carolina" },
  { icon: BookOpen, title: "The NCAA Eligibility Center", text: "Which account, when, and what it costs", href: "/recruiting/learn/eligibility-center" },
]

export default async function CommandCenterLearn() {
  const { wrestlers, athletes } = await loadCommandCenter("/my-recruiting/learn")
  const w = wrestlers[0] ?? null
  const grade = gradeFromLabel(w?.grade ?? null)
  const year = grade ? timelineFor(grade) : null
  const first = athletes[0] ?? null
  const track: D1Track = first ? d1TrackFor(first.gender, first.classYear) : "men-2028"

  const cell = (o: { level: string; what: string; when: string; href: string }) => ({ level: o.level, what: o.what, when: o.when, href: o.href })
  const tracks = Object.fromEntries(
    TRACKS.map((t) => [
      t,
      {
        anyAge: alwaysOpen(t).map(cell),
        byGrade: { "10": openingsFor(10, t).map(cell), "11": openingsFor(11, t).map(cell), "12": openingsFor(12, t).map(cell) },
      } satisfies TrackTimeline,
    ]),
  ) as Record<D1Track, TrackTimeline>

  return (
    <PortalShell active="learn">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Learn</h1>
      <p className="mt-1 max-w-2xl text-sm text-white/65">How college wrestling recruiting works, for men&apos;s and women&apos;s wrestling, from rules checked against each governing body&apos;s own documents.</p>

      <div className="mt-6">
        <LearnSearch entries={buildSearchIndex()} />
      </div>

      {year && w ? (
        <section className="mt-8 rounded-2xl border border-[#D3B574]/50 bg-gradient-to-br from-[#D3B574]/[0.12] to-transparent p-5 sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Start here · {w.firstName}, {GRADE_NAME[year.grade].toLowerCase()}</p>
          <p className="mt-2 text-lg font-bold leading-7 text-white">{year.headline}</p>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {year.steps.slice(0, 3).map((step, i) => (
              <li key={step.text} className="rounded-xl border border-white/10 bg-[#0A1628]/60 p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D3B574] text-sm font-black text-[#0A1628]">{i + 1}</span>
                <p className="mt-2 text-sm leading-6 text-white/85">{step.text}</p>
                {step.href ? (
                  <a href={step.href} className="mt-2 inline-block text-xs font-bold text-[#D3B574] hover:underline">
                    {step.cta} →
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
          <Link href={`/recruiting/learn/timeline#grade-${year.grade}`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#D3B574] hover:underline">
            The full {GRADE_NAME[year.grade].toLowerCase()} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xl font-black tracking-tight">When college coaches can reach you</h2>
        <p className="mt-1 text-sm text-white/60">The first date each level of coach may call, meet and host a wrestler, across high school. Tap any date for the rule and its source.</p>
        <div className="mt-4">
          <RulesTimeline tracks={tracks} labels={D1_TRACK_LABEL} initial={track} grade={grade} name={w?.firstName ?? null} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-black tracking-tight">Topics</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOPICS.map(({ icon: Icon, title, text, href }) => (
            <li key={title}>
              <a href={href} className="group flex h-full flex-col rounded-xl border border-white/10 bg-[#0f1c2e] p-4 transition hover:-translate-y-0.5 hover:border-[#D3B574]/60">
                <Icon className="h-5 w-5 text-[#D3B574]" aria-hidden />
                <span className="mt-3 text-sm font-bold text-white">{title}</span>
                <span className="mt-0.5 text-xs leading-5 text-white/55">{text}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-black tracking-tight">Every question and rule</h2>
        <WarRoomLearn wrestlers={wrestlers} showYear={false} />
      </section>
    </PortalShell>
  )
}
