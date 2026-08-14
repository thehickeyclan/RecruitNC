const pillars = [
  { title: "Master every style", body: "Folkstyle, freestyle and Greco-Roman each develop different positions, instincts and solutions. A complete wrestler learns to adapt across rulesets rather than depending on one narrow skill set." },
  { title: "Recover with purpose", body: "Recovery is essential, but it is not the same as abandoning development. Active recovery, strategic rest and mental preparation can restore the athlete while preserving momentum." },
  { title: "Keep the journey moving", body: "The transition from the school season to national and international competition is an opportunity to refine technique, build strength and deepen competitive experience." },
] as const

export function WrestlingYearRoundMartialArt2025Content() {
  return (
    <div className="space-y-10">
      <section><p className="text-xl font-semibold text-[#13294B]">Wrestling is more than a seasonal sport. Approached as a martial art, it becomes a year-round path of technical mastery, disciplined preparation and continual self-improvement.</p><p>The lessons of NHSCA Nationals reinforced that meaningful progress does not fit neatly inside one school season. Athletes pursuing higher levels must balance consistent development with deliberate recovery throughout the year.</p></section>

      <section><h2>A complete approach to development</h2><div className="not-prose grid gap-4 md:grid-cols-3">{pillars.map((pillar) => <article key={pillar.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><h3 className="text-lg font-black text-[#13294B]">{pillar.title}</h3><p className="mt-3 leading-7 text-slate-700">{pillar.body}</p></article>)}</div></section>

      <section><h2>Redefining the offseason</h2><p>After a demanding season, athletes need time to restore their bodies and minds. That period should be individualized and health-centered, using appropriate rest, mobility, low-intensity work and gradual re-entry rather than treating every week identically.</p><p>Year-round commitment does not mean year-round maximum intensity. Sustainable growth requires athletes, families and coaches to manage training load carefully and make recovery part of the plan.</p></section>

      <section className="not-prose rounded-2xl bg-[#071b4b] p-6 text-white md:p-8"><p className="text-sm font-black uppercase tracking-[0.2em] text-[#D3B574]">A martial-arts mentality</p><p className="mt-3 text-2xl font-bold leading-9">Wrestling becomes a lifestyle when athletes pursue mastery with consistency, curiosity and respect for the recovery that makes long-term progress possible.</p></section>

      <section><h2>Beyond the season</h2><p>By learning across styles, training with intention and recovering intelligently, wrestlers can move beyond seasonal thinking without sacrificing their health. The goal is not simply to stay busy—it is to keep building the skills, resilience and understanding that unlock long-term potential.</p></section>
    </div>
  )
}
