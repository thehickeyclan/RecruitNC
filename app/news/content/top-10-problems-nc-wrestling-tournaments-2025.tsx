const problems = [
  ["Athletes spend 20-plus hours in gyms for less than 30 minutes of wrestling", "Two-day schedules can consume an entire weekend while actual mat time remains minimal. The strain falls on athletes, families and coaches before the most meaningful matches even begin."],
  ["Saturday weigh-ins and late starts create guaranteed dead time", "A 7 a.m. report time followed by a two-hour wait delays every round that follows. At many regional events, the second weigh-in adds time without improving competition."],
  ["Round timing is poorly communicated", "Without reliable schedules for quarterfinals, consolations and finals, coaches plan blindly, parents wait without updates and athletes risk missing warm-ups or mat calls."],
  ["Too many teams and too few mats overwhelm the format", "Participation and girls divisions have grown, but mat capacity often has not. More wrestlers on the same number of surfaces guarantees backups and late finishes."],
  ["Finals reduce mat usage and waste hours", "Facilities capable of running three or four mats often shrink to one boys mat and one girls mat for finals, leaving usable surfaces idle while families wait."],
  ["Weak Wi-Fi and outdated technology disrupt brackets", "Frozen brackets, lagging bout boards and unreliable connectivity undermine tournament flow and make it harder for athletes and families to follow assignments."],
  ["Concessions fail to support performance", "Athletes and coaches spend long days in the gym while food options frequently center on pizza, fried food, candy and soda rather than useful competition-day nutrition."],
  ["Spectator areas are cramped and uncomfortable", "Poor sightlines, crowded walkways and aging bleachers make already long sessions harder for families and less welcoming for new spectators."],
  ["Bathrooms become overcrowded and unsanitary", "School facilities are rarely prepared for continuous 12-to-16-hour traffic, leading to access, cleanliness and supply problems throughout the day."],
  ["Awards are handled inefficiently", "Pausing competition for awards or holding every podium ceremony until the end keeps families in the building long after an athlete's final match."],
] as const

export function Top10ProblemsNcWrestlingTournaments2025Content() {
  return (
    <div className="space-y-10">
      <section>
        <p className="text-xl font-semibold text-[#13294B]">Elevating the standard begins by recognizing that many tournament inefficiencies are self-inflicted—and fixable.</p>
        <p>North Carolina wrestling continued to grow in talent, participation and statewide passion, but outdated systems and exhausting weekend structures often worked against that momentum.</p>
      </section>

      <section>
        <h2>Where the tournament model falls short</h2>
        <div className="not-prose grid gap-4">
          {problems.map(([title, description], index) => (
            <article key={title} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[3rem_1fr]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#13294B] text-lg font-black text-white">{index + 1}</div>
              <div><h3 className="text-lg font-bold text-[#13294B]">{title}</h3><p className="mt-2 leading-7 text-slate-700">{description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="not-prose rounded-2xl border border-amber-300 bg-amber-50 p-6 md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-800">Bonus problem</p>
        <h2 className="mt-2 text-2xl font-bold text-[#13294B]">Ticket prices rise while the experience declines</h2>
        <p className="mt-3 leading-7 text-slate-700">A two-day pass can cost $25 per person. A family of four may spend $100 on admission before food or travel, yet still encounter long waits, poor communication, unreliable technology and delayed awards.</p>
      </section>

      <section>
        <h2>North Carolina wrestling is capped by its tournament structure</h2>
        <p>The state has the athletes, participation and passion to become a national wrestling force. Tournament weekends shape how families experience the sport, and too many create exhaustion instead of enthusiasm.</p>
        <p>Better scheduling, communication, infrastructure, nutrition and use of facilities would respect athletes, honor families and strengthen the foundation of North Carolina wrestling.</p>
      </section>
    </div>
  )
}
