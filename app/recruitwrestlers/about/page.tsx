/**
 * About RecruitWrestlers, at www.recruitwrestlers.com/about (middleware rewrites it here; NC United
 * keeps its own /about). Matt, 26 Oct 2026: the Guild Ventures story is okay to tell. Every number
 * is live (lib/recruiting/national-stats.ts), never typed.
 */
import type { Metadata } from "next"
import Link from "next/link"
import { loadNationalStats } from "@/lib/recruiting/national-stats"
import { recruitingCoverage } from "@/lib/recruiting/brand"

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: "About | RecruitWrestlers" },
  description: "RecruitWrestlers, a Guild Ventures company: college wrestling recruiting built on verified results.",
}

const PRINCIPLES = [
  { title: "Verified, not typed", body: "Every result comes from the brackets of the events wrestlers compete in. Records, credentials and rankings are computed from those results, and every one can be traced back to a match." },
  { title: "Coaches on the same platform", body: "College coaches use RecruitWrestlers free. Families can see which programs viewed a profile, and coaches can message a wrestler with the parents on every conversation." },
  { title: "Kids first", body: "Most wrestlers here are in high school. Contact details and academics are seen only by verified college coaches and the wrestler's own family, never the public, and we never sell personal information." },
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
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#A3E635]">About</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">College wrestling recruiting, built on verified results.</h1>
          <p className="mt-5 max-w-3xl text-lg text-[#A8B3C5]">
            RecruitWrestlers puts every wrestler&apos;s results, the wins that matter and the colleges that fit in one place, for the families planning the path and the college coaches looking for their next recruits.
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
        <div className="mx-auto max-w-4xl space-y-4 text-[15px] leading-relaxed text-[#D6DEEA]">
          <h2 className="text-2xl font-black text-white">Who we are</h2>
          <p>
            RecruitWrestlers is a Guild Ventures company. It started in North Carolina as RecruitNC, the recruiting platform behind NC United, and grows state by state: {recruitingCoverage(true)} today, with more states as their results are checked.
          </p>
          <p>
            NC United still offers it to North Carolina families as RecruitNC. It is the same platform, the same profiles and the same college coaches, and one account works on both.
          </p>
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
          <ul className="mt-3 space-y-2 text-sm text-[#D6DEEA]">
            <li><span className="font-bold text-white">Free:</span> every wrestler&apos;s profile, claiming it, the news and a look at the rankings.</li>
            <li><span className="font-bold text-white">Insider:</span> every class ranking and which college programs viewed your profile.</li>
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
