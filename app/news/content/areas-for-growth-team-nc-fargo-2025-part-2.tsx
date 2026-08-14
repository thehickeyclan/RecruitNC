import Image from "next/image"
import Link from "next/link"

const priorities = [
  ["Intention", "Begin freestyle and Greco-Roman development well before Fargo preparation so athletes build genuine international-style instincts."],
  ["Experience", "Seek sustained high-level competition at regional events, national duals and tournaments beyond North Carolina."],
  ["Knowledge", "Translate coaching expertise into repeatable execution, especially during decisive late-match situations."],
  ["Fuel and recovery", "Treat nutrition, hydration, recovery and athlete well-being as core performance requirements."],
  ["Execution", "Develop the conditioning and competitive resilience to sustain pace through multiple difficult matches in one day."],
] as const

export function AreasForGrowthTeamNcFargo2025Part2Content() {
  return (
    <div className="space-y-10">
      <section><p>Changing Team North Carolina&apos;s results required deliberate changes—not diminished morale. The 2025 Fargo experience identified five areas where more intentional preparation could help close the national gap.</p></section>

      <section><h2>Five priorities for growth</h2><div className="not-prose grid gap-4 md:grid-cols-2">{priorities.map(([title, detail], index) => <article key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#C20017]">Priority {index + 1}</div><h3 className="mt-2 font-bold text-[#13294B]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{detail}</p></article>)}</div></section>

      <section><h2>International styles needed to start earlier</h2><p>Freestyle and Greco-Roman repetitions could not begin only when Fargo approached. Athletes needed early exposure so positions, scoring and reactions became instinctive before their national debut.</p><p>That was especially important for North Carolina women because freestyle is the collegiate style and the direct path to higher-level opportunities.</p></section>

      <section><h2>Competition had to go beyond state events</h2><p>The Tar Heel Classic and state championships provided important starts, but Southeast Regionals offered a clearer national-readiness benchmark. A strong regional performance helped families make informed decisions about Fargo&apos;s significant cost and competitive demands.</p><p>Participation in 14U, 16U and Junior Duals was equally important. Athletes could receive at least seven matches in each style while Team NC gained meaningful state-versus-state measures of progress.</p><figure className="not-prose overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><div className="relative aspect-[4/5] md:aspect-[16/9]"><Image src="/images/news/legacy/team-nc-fargo-2025-part-2/fargodome-mats.png" alt="Competition mats inside the FargoDome at USA Wrestling Nationals" fill className="object-cover" sizes="100vw" /></div><figcaption className="p-3 text-sm text-slate-600">The FargoDome provided a clear national benchmark for Team North Carolina.</figcaption></figure></section>

      <section><h2>Preparation had to become complete</h2><p>Knowledge mattered only when athletes consistently executed it in practice and competition. Late-match decisions, high-pace conditioning, nutrition, hydration and recovery all influenced an athlete&apos;s ability to navigate Fargo&apos;s demanding format.</p><p>The gap was not in desire or heart. It was in the targeted preparation required to perform repeatedly on an elite stage.</p></section>

      <section><h2>Accountability created a path forward</h2><p>Team North Carolina could elevate its results by beginning international-style development sooner, competing against national fields more often and treating preparation as a year-round responsibility shared by athletes, coaches and families.</p><p><Link href="/news/team-north-carolina-women-fargo-2025-part-3">Continue to Part 3: Team North Carolina Women—Breaking Barriers and Building</Link></p></section>
    </div>
  )
}
