/**
 * Learn, the heart of the Command Center (Matt, 14 Oct 2026: "the learning portal is critical").
 *
 * Rebuilt 15 Oct 2026 to the mock-up Matt had ChatGPT draw: a product page, not a reading list.
 * It opens on the family's own wrestler (class, team, grade and the three things that matter this
 * year), then four big doors, the topics, what to do with what you've read, the most-used guides
 * and the questions families ask. Every link lands on the verified library in lib/recruiting/learn;
 * nothing on this page states a rule itself. The mock's videos are left out until we have them.
 */
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  DollarSign,
  FileText,
  GraduationCap,
  HelpCircle,
  ListChecks,
  Mail,
  Map as MapIcon,
  Scale,
  ShieldAlert,
  Target,
  Trophy,
  Users,
} from "lucide-react"

import { LearnSearch } from "@/components/portal/learn-search"
import { PortalShell } from "@/components/portal/portal-shell"
import { RulesTimeline, type TrackTimeline } from "@/components/portal/rules-timeline"
import { D1_TRACK_LABEL, d1TrackFor, learnPage, sectionId, type D1Track } from "@/lib/recruiting/learn/content"
import { buildSearchIndex } from "@/lib/recruiting/learn/search-index"
import { GRADE_NAME, alwaysOpen, gradeFromLabel, openingsFor, timelineFor } from "@/lib/recruiting/learn/timeline"
import { loadCommandCenter } from "../load"

export const dynamic = "force-dynamic"
export const metadata = { title: "Learn | Recruiting Command Center" }

const GOLD = "#D3B574"
const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5"
const TRACKS: D1Track[] = ["men-2028", "men-2027", "women"]

const TABS = [
  { label: "Overview", href: "/my-recruiting/learn" },
  { label: "Timeline", href: "/recruiting/learn/timeline" },
  { label: "Rules", href: "/recruiting/learn/division-1" },
  { label: "Academics", href: "/recruiting/learn/eligibility-center" },
  { label: "Costs & aid", href: "/recruiting/learn/paying-for-college" },
  { label: "Getting recruited", href: "/recruiting/learn/working-the-process" },
  { label: "Tournaments", href: "/recruiting/learn/tournaments" },
  { label: "FAQs", href: "/recruiting/learn/questions-families-ask" },
]

const DOORS = [
  { image: "/focused-wrestler.png", title: "Recruiting timeline", text: "What to do each year, 8th grade to signing.", cta: "View timeline", href: "/recruiting/learn/timeline" },
  { image: "/grappling-duel.png", title: "The rules, level by level", text: "Contact, calls, visits and what's allowed.", cta: "Learn the rules", href: "/recruiting/learn/division-1" },
  { image: "/hero-banner-nc-wrestling-arena.png", title: "What college costs", text: "Full cost, aid, and how academics lower it.", cta: "Get the guide", href: "/recruiting/learn/paying-for-college" },
  { image: "/focused-grappler.png", title: "Find the right fit", text: "Compare colleges on fit, cost and roster.", cta: "Compare colleges", href: "/recruiting/compare" },
]

const TOPICS: Array<{ icon: LucideIcon; label: string; href: string }> = [
  { icon: CalendarDays, label: "Grade-by-grade timeline", href: "/recruiting/learn/timeline" },
  { icon: Scale, label: "NCAA Division I", href: "/recruiting/learn/division-1" },
  { icon: Scale, label: "NCAA Division II", href: "/recruiting/learn/division-2" },
  { icon: Scale, label: "NCAA Division III", href: "/recruiting/learn/division-3" },
  { icon: Scale, label: "NAIA", href: "/recruiting/learn/naia" },
  { icon: Scale, label: "Junior college (NJCAA)", href: "/recruiting/learn/njcaa" },
  { icon: GraduationCap, label: "The NCAA Eligibility Center", href: "/recruiting/learn/eligibility-center" },
  { icon: DollarSign, label: "Costs, scholarships and aid", href: "/recruiting/learn/paying-for-college" },
  { icon: ListChecks, label: "Getting recruited", href: "/recruiting/learn/working-the-process" },
  { icon: Trophy, label: "Tournaments coaches watch", href: "/recruiting/learn/tournaments" },
  { icon: ShieldAlert, label: "Staying eligible in NC", href: "/recruiting/learn/staying-eligible-in-north-carolina" },
]

/** Learn connects to action: every guide has a next step in the Command Center. */
const DO_NEXT: Array<{ icon: LucideIcon; label: string; text: string; href: string }> = [
  { icon: Mail, label: "Write to a coach", text: "From verified results", href: "/my-recruiting/colleges" },
  { icon: MapIcon, label: "Find colleges at a level", text: "Every program on the map", href: "/recruiting/college-map" },
  { icon: BarChart3, label: "Compare your colleges", text: "Fit, full cost, roster", href: "/recruiting/compare" },
  { icon: Target, label: "Your next steps", text: "The plan for this year", href: "/my-recruiting/plan" },
]

const RESOURCES: Array<{ label: string; href: string }> = [
  { label: "How to write to a coach", href: "/recruiting/learn/working-the-process" },
  { label: "Questions to ask a coach", href: "/recruiting/learn/working-the-process" },
  { label: "Who pays for a visit", href: `/recruiting/learn/questions-families-ask#${sectionId("Who pays for a recruiting visit?")}` },
  { label: "Registering with the Eligibility Center", href: "/recruiting/learn/eligibility-center" },
  { label: "Grants vs. scholarships", href: `/recruiting/learn/questions-families-ask#${sectionId("What is the difference between a grant and a scholarship?")}` },
  { label: "NIL and revenue sharing", href: `/recruiting/learn/questions-families-ask#${sectionId("What is NIL?")}` },
  { label: "Prize money and NIL in NC high school", href: "/recruiting/learn/staying-eligible-in-north-carolina" },
]

export default async function CommandCenterLearn() {
  const { wrestlers, athletes } = await loadCommandCenter("/my-recruiting/learn")
  const w = wrestlers[0] ?? null
  const grade = gradeFromLabel(w?.grade ?? null)
  const year = grade ? timelineFor(grade) : null
  const first = athletes[0] ?? null
  const track: D1Track = first ? d1TrackFor(first.gender, first.classYear) : "men-2028"
  const team = first?.gender && /^f/i.test(first.gender) ? "Women's wrestling" : first?.gender ? "Men's wrestling" : null
  const questions = (learnPage("questions-families-ask")?.sections ?? []).map((s) => s.heading)

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
      <div className="mx-auto max-w-7xl text-white">
        {/* Header band */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1D3A]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-banner-nchsaa-2026-arena.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D3A] via-[#0B1D3A]/85 to-[#0B1D3A]/30" aria-hidden />
          <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
                Learn
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Know the process. Be ready.</h1>
              <p className="mt-2 text-sm text-white/70 sm:text-base">College wrestling recruiting, men&apos;s and women&apos;s, every level.</p>
              <div className="mt-5 max-w-xl">
                <LearnSearch entries={buildSearchIndex()} />
              </div>
            </div>
            <p className="hidden text-right text-sm font-semibold uppercase leading-6 tracking-[0.3em] text-white/70 lg:block">
              Same grind.
              <br />
              Higher opportunities.
              <span className="mt-3 ml-auto block h-0.5 w-10" style={{ backgroundColor: GOLD }} />
            </p>
          </div>
        </section>

        {/* Tabs */}
        <nav aria-label="Learn sections" className="-mx-4 mt-4 overflow-x-auto border-b border-white/10 px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-6 whitespace-nowrap text-sm font-semibold">
            {TABS.map((t, i) => (
              <li key={t.label}>
                <a href={t.href} className={`block border-b-2 py-3 ${i === 0 ? "border-[#D3B574] text-[#D3B574]" : "border-transparent text-white/65 hover:text-white"}`}>
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Your roadmap: the wrestler's own year first */}
        {year && w ? (
          <section className="mt-6 overflow-hidden rounded-2xl border border-[#D3B574]/50 bg-gradient-to-br from-[#D3B574]/[0.14] via-[#0d1d36] to-[#0d1d36] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-2 text-xs font-black uppercase tracking-widest" style={{ color: GOLD }}>
                {w.firstName}&apos;s roadmap
              </p>
              {first?.classYear ? <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold">Class of {first.classYear}</span> : null}
              {team ? <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold">{team}</span> : null}
              <span className="rounded-md px-2.5 py-1 text-xs font-bold text-[#0A1628]" style={{ backgroundColor: GOLD }}>
                {GRADE_NAME[year.grade]}
              </span>
            </div>
            <ol className="mt-4 grid gap-3 md:grid-cols-3">
              {year.steps.slice(0, 3).map((step, i) => (
                <li key={step.text} className="flex gap-3 rounded-xl border border-white/10 bg-[#0A1628]/70 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black text-[#0A1628]" style={{ backgroundColor: GOLD }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-3 text-sm leading-6 text-white/90">{step.text}</p>
                    {step.href ? (
                      <a href={step.href} className="mt-1 inline-block text-xs font-bold hover:underline" style={{ color: GOLD }}>
                        {step.cta} →
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            <a href={`/recruiting/learn/timeline#grade-${year.grade}`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold hover:underline" style={{ color: GOLD }}>
              Explore the roadmap <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </section>
        ) : null}

        {/* Four doors */}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DOORS.map((d) => (
            <li key={d.title}>
              <a href={d.href} className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-[#060f1f] via-[#060f1f]/75 to-transparent" aria-hidden />
                <span className="relative p-5">
                  <span className="block text-lg font-black uppercase tracking-wide">{d.title}</span>
                  <span className="mt-1 block text-sm text-white/75">{d.text}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold transition group-hover:bg-[#D3B574] group-hover:text-[#0A1628]" style={{ borderColor: GOLD }}>
                    {d.cta} <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {/* Browse by topic */}
          <section className={card}>
            <h2 className="text-base font-bold">Browse by topic</h2>
            <ul className="mt-2 divide-y divide-white/5">
              {TOPICS.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <a href={href} className="flex items-center gap-3 py-2.5 text-sm text-white/85 hover:text-white">
                    <Icon className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="h-4 w-4 text-white/35" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <div className="space-y-5">
            {/* Learn connects to action */}
            <section className={card}>
              <h2 className="text-base font-bold">Put it to work</h2>
              <ul className="mt-3 grid grid-cols-2 gap-3">
                {DO_NEXT.map(({ icon: Icon, label, text, href }) => (
                  <li key={label}>
                    <a href={href} className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-0.5 hover:border-[#D3B574]/60">
                      <Icon className="h-5 w-5" style={{ color: GOLD }} aria-hidden />
                      <span className="mt-3 text-sm font-bold">{label}</span>
                      <span className="mt-0.5 text-xs text-white/50">{text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {/* The questions families ask */}
            <section className={card}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold">Common questions</h2>
                <a href="/recruiting/learn/questions-families-ask" className="text-xs font-semibold" style={{ color: GOLD }}>
                  View all →
                </a>
              </div>
              <ul className="mt-2 divide-y divide-white/5">
                {questions.slice(0, 6).map((q) => (
                  <li key={q}>
                    <a href={`/recruiting/learn/questions-families-ask#${sectionId(q)}`} className="flex items-center gap-3 py-2.5 text-sm text-white/85 hover:text-white">
                      <span className="flex-1">{q}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-5">
            <section className={card}>
              <h2 className="text-base font-bold">Popular guides</h2>
              <ul className="mt-2 divide-y divide-white/5">
                {RESOURCES.map((r) => (
                  <li key={r.label}>
                    <a href={r.href} className="flex items-center gap-3 py-2.5 text-sm text-white/85 hover:text-white">
                      <FileText className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                      <span className="flex-1">{r.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-[#D3B574]/50 bg-[#D3B574]/[0.08] p-5">
              <p className="flex items-center gap-2 text-base font-bold">
                <HelpCircle className="h-5 w-5" style={{ color: GOLD }} aria-hidden /> Still have questions?
              </p>
              <p className="mt-1 text-sm text-white/65">Search above, or read every question families ask.</p>
              <a href="/recruiting/learn/questions-families-ask" className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-[#0A1628]" style={{ backgroundColor: GOLD }}>
                Go to FAQs <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </section>
          </div>
        </div>

        {/* Contact dates, interactive */}
        <section className={`${card} mt-6`}>
          <div className="flex flex-wrap items-center gap-2">
            <Users className="h-5 w-5" style={{ color: GOLD }} aria-hidden />
            <h2 className="text-base font-bold">When college coaches can reach you</h2>
          </div>
          <p className="mt-1 text-xs text-white/50">Tap any date for the rule and its source.</p>
          <div className="mt-4">
            <RulesTimeline tracks={tracks} labels={D1_TRACK_LABEL} initial={track} grade={grade} name={w?.firstName ?? null} />
          </div>
        </section>

        <p className="mt-6 flex items-center gap-2 text-xs text-white/40">
          <BookOpen className="h-3.5 w-3.5" aria-hidden /> Every rule is checked against the governing body&apos;s own documents, with the source and date on its page.
        </p>
      </div>
    </PortalShell>
  )
}
