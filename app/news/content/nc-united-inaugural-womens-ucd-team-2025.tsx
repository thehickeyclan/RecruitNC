const roster = [
  "Addison Gore", "Brianna Palmer", "Isabella Hernandez", "Jiselle Riley", "Julia McGee", "Khiry Reese", "Laila Tellez", "Rosie Horan Carillo", "Savada Kitchen", "Stephanie Diaz Mendoza", "Taylor Williams", "Zainab Hijawi", "Sophia Placencia", "Solyn Palmer",
]

export function NcUnitedInauguralWomensUcdTeam2025Content() {
  return (
    <div className="space-y-10">
      <section>
        <p><strong>SEPTEMBER 25, 2025 —</strong> NC United reached a major milestone by fielding its first official girls&apos; team at the Ultimate Club Duals, one of the nation&apos;s toughest women&apos;s wrestling competitions.</p>
        <p>Against a field that included World Team members, Fargo champions and All-Americans, the inaugural roster established a foundation for the future of women&apos;s wrestling in North Carolina.</p>
      </section>

      <section>
        <h2>More than wins and losses</h2>
        <p>Entering the tournament carried significance beyond the scoreboard. It represented a sustained commitment to creating opportunities for girls in a state where participation continued to grow rapidly.</p>
        <p>Coaches Veronica Carlson and Brandon Palmer led the team through a weekend in which every match offered a measure of progress and a clearer picture of the work ahead.</p>
        <blockquote>“It was amazing to see the improvement from match to match. These athletes are the future of wrestling, and they have what it takes to accomplish anything they desire. Their potential is limitless.”<footer>— Veronica Carlson</footer></blockquote>
      </section>

      <section>
        <h2>The inaugural roster</h2>
        <p>These athletes became the first to represent NC United&apos;s women&apos;s team at the Ultimate Club Duals:</p>
        <div className="not-prose grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {roster.map((name) => <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-[#13294B]">{name}</div>)}
        </div>
        <p className="text-sm text-slate-500">Roster list is not in photo order. Solyn Palmer is not pictured.</p>
      </section>

      <section>
        <h2>Toughness, confidence and freestyle experience</h2>
        <blockquote>“Our team showed incredible toughness. This year we stepped up to the challenge and earned some notable wins. The next step is not only to wrestle tough, but to do it with confidence.”<footer>— Brandon Palmer</footer></blockquote>
        <p>Palmer also emphasized the need for meaningful freestyle experience at younger ages. For girls, freestyle is not simply an offseason style—it is the collegiate pathway and an essential part of long-term development.</p>
      </section>

      <section>
        <h2>The beginning of a tradition</h2>
        <p>The tournament gave the athletes a national standard against which to measure themselves and gave the coaching staff clear priorities for future training. Every athlete on the roster represented another step toward opportunity and equity in the sport.</p>
        <p>The inaugural team was not a one-event project. It was the beginning of a tradition designed to help North Carolina girls train, compete and pursue collegiate wrestling with confidence and ambition.</p>
      </section>

      <section className="not-prose rounded-2xl bg-[#13294B] p-6 text-white md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#D3B574]">The pathway forward</p>
        <p className="mt-3 text-xl font-semibold leading-8">Freestyle is the pathway to college opportunities. Prioritizing it is essential to the future of North Carolina&apos;s women wrestlers.</p>
      </section>
    </div>
  )
}
