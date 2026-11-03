/**
 * About RecruitWrestlers, at www.recruitwrestlers.com/about (middleware rewrites it here; NC United
 * keeps its own /about). Matt, 26 Oct 2026: the Guild Ventures story is okay to tell. Every number
 * is live (lib/recruiting/national-stats.ts), never typed.
 *
 * Positioned as the recruiting platform for families and college coaches, not a results site, and
 * with no single-state origin story (Matt, 3 Nov 2026): results are the proof, not the pitch.
 */
import type { Metadata } from "next"
import Link from "next/link"
import { loadNationalStats } from "@/lib/recruiting/national-stats"
import { recruitingCoverage } from "@/lib/recruiting/brand"

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: "About | RecruitWrestlers" },
  description:
    "RecruitWrestlers is changing how high school wrestlers get recruited: one platform for families and the college coaches recruiting them.",
}

/** Recruiting today, for each side, and what changes. */
const SIDES = [
  {
    who: "Families",
    today: "Guessing which coaches are interested, what to send and when.",
    now: "A plan for every grade, every college program on one map, a list that tracks each school, and which programs viewed the profile.",
  },
  {
    who: "College coaches",
    today: "Piecing a recruit together from brackets, spreadsheets and a dozen websites.",
    now: "Every prospect searchable, scouting reports, comparisons and a shared board for the staff. Free.",
  },
]

const PRINCIPLES = [
  { title: "Both sides, one platform", body: "Coaches and families meet here. Families see which programs looked; coaches message a wrestler with the parents on every conversation." },
  { title: "Results you can trust", body: "Records, credentials and rankings come from the brackets of the events wrestlers compete in, so coaches evaluate on facts." },
  { title: "Kids first", body: "Contact details and academics are seen only by approved college coaches and the wrestler's own family. We never sell personal information." },
]

export default async function AboutRecruitWrestlers() {
  const stats = await loadNationalStats().catch(() => null)
  const figures = stats
    ? [
        { value: stats.wrestlers.toLocaleString(), label: `${recruitingCoverage(true)} wrestlers in the current classes` },
        { value: stats.programs.toLocaleString(), label: "college programs with coaches on RecruitWrestlers" },
        { value: stats.collegePrograms.toLocaleString(), label: "college wrestling programs on the map" },
      ]
    : []
  return (
    <main className="min-h-screen bg-[#0B1426] text-white">
      <section className="border-b border-white/10 bg-gradient-to-br from-[#15243B] via-[#11203A] to-[#0B1426] px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#A3E635]">About · Recruiting, out of the dark</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">One platform for families and coaches.</h1>
          <p className="mt-5 max-w-3xl text-lg text-[#A8B3C5]">
            We&apos;re changing how high school wrestlers get recruited: the families planning the path and the college coaches
            recruiting them, finally in the same place.
          </p>
        </div>
      </section>

      {figures.length ? (
        <section className="px-4 py-10">
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
            {figures.map((f) => (
              <div key={f.label} className="rounded-2xl border border-white/10 bg-[#15243B] p-5">
                <p className="text-3xl font-black text-[#A3E635]">{f.value}</p>
                <p className="mt-1 text-sm text-[#A8B3C5]">{f.label}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="px-4 py-6">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {SIDES.map((side) => (
            <div key={side.who} className="rounded-2xl border border-white/10 bg-[#15243B] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A3E635]">{side.who}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/40">Today</p>
              <p className="mt-1 text-sm text-[#A8B3C5]">{side.today}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#A3E635]">On RecruitWrestlers</p>
              <p className="mt-1 text-sm text-white">{side.now}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-2xl border border-white/10 bg-[#15243B] p-5">
              <p className="text-lg font-black">{p.title}</p>
              <p className="mt-2 text-sm text-[#A8B3C5]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#A3E635]/40 bg-[#A3E635]/[0.06] p-6">
          <p className="text-lg font-black">What we offer</p>
          <p className="mt-1 text-sm text-[#A8B3C5]">
            A Guild Ventures company, opening state by state: {recruitingCoverage(true)} today.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[#D6DEEA]">
            <li><span className="font-bold text-white">Free:</span> claim and manage the profile coaches see, the news and a look at the rankings.</li>
            <li><span className="font-bold text-white">Insider:</span> which college programs viewed the profile, and every class ranking.</li>
            <li><span className="font-bold text-white">Recruiting Command Center:</span> the plan, every college, your list, coach messages and Scout, with Insider included.</li>
            <li><span className="font-bold text-white">College coaches:</span> My Recruits, scouting reports and messaging, free.</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/membership" className="rounded-xl bg-[#A3E635] px-5 py-2.5 text-sm font-black text-[#0B1426] hover:bg-[#BEF264]">See the plans</Link>
            <Link href="/for-coaches" className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:border-[#A3E635] hover:text-[#A3E635]">For college coaches</Link>
            <Link href="/contact" className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:border-[#A3E635] hover:text-[#A3E635]">Contact</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
