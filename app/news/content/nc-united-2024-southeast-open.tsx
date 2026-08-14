import Image from "next/image"

const athletes = [
  ["Lorenzo Alston", "157", "3–2", "1.1"],
  ["Nate Askew", "149", "2–2", "0.9"],
  ["Liam Hickey", "133", "1–2", "0.7"],
  ["Jack Harty", "184", "1–2", "0.6"],
  ["Tyler Watt", "133", "1–2", "0.6"],
  ["Sebastian Rivera", "HWT", "0–2", "0.0"],
] as const

export function NcUnited2024SoutheastOpenContent() {
  return (
    <div className="space-y-10">
      <section>
        <p className="text-xl font-semibold text-[#13294B]">For the first time, six NC United high school wrestlers entered a college tournament and tested themselves against athletes from NCAA Division I, II and III programs.</p>
        <p>The 2024 Southeast Open established a new developmental benchmark for the program and provided the first tournament dataset for NC United&apos;s Competitive Advancement Progress scoring system.</p>
      </section>

      <section>
        <h2>Six wrestlers take on college competition</h2>
        <div className="not-prose overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-[#970c48] text-white"><tr><th className="p-3">Athlete</th><th className="p-3">Weight</th><th className="p-3">Record</th><th className="p-3">CAP score</th></tr></thead>
            <tbody>{athletes.map(([name, weight, record, cap]) => <tr key={name} className="border-t border-slate-200 even:bg-slate-50"><td className="p-3 font-semibold">{name}</td><td className="p-3">{weight}</td><td className="p-3">{record}</td><td className="p-3 font-bold">{cap}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="not-prose grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-[#970c48] p-5 text-center text-white"><div className="text-4xl font-black text-[#f7931e]">6</div><div className="mt-2 font-bold uppercase">High school athletes</div></div>
        <div className="rounded-xl bg-[#970c48] p-5 text-center text-white"><div className="text-4xl font-black text-[#f7931e]">0.65</div><div className="mt-2 font-bold uppercase">Team CAP average</div></div>
        <div className="rounded-xl bg-[#970c48] p-5 text-center text-white"><div className="text-4xl font-black text-[#f7931e]">6</div><div className="mt-2 font-bold uppercase">Wins over DI opponents</div></div>
      </section>

      <section>
        <h2>The CAP scoring system at work</h2>
        <p>The CAP system evaluated more than win-loss records. It accounted for opponent quality, bracket progression and the level of competition, giving athletes and coaches a clearer view of performance and development.</p>
        <p>Alston led the group with a 3–2 record and 1.1 CAP score. Askew made the deepest tournament run, while Hickey recorded the group&apos;s highest-quality victory.</p>
      </section>

      <figure className="not-prose overflow-hidden rounded-2xl border border-slate-200 bg-[#970c48]"><Image src="/images/news/legacy/nc-united-2024-southeast-open/southeast-open-performance.png" alt="Southeast Open tournament overview, athlete records and CAP score rankings" width={1536} height={864} className="h-auto w-full" /><figcaption className="bg-white px-4 py-3 text-sm text-slate-600">Tournament results, bracket progression and CAP score analysis.</figcaption></figure>

      <section>
        <h2>Notable wins against elite competition</h2>
        <ul>
          <li>Hickey defeated Campbell&apos;s Zander Phaturous, who entered with a 13–8 Division I record.</li>
          <li>Alston defeated Virginia&apos;s Nathan Rickards, a three-time National Prep All-American and Pennsylvania state champion.</li>
          <li>Askew defeated Chattanooga&apos;s Hayden Hughes, an Ohio state champion and runner-up.</li>
        </ul>
        <p>Every loss came against a tournament placer, underscoring the strength of the field and the value of the experience.</p>
      </section>

      <figure className="not-prose overflow-hidden rounded-2xl border border-slate-200"><Image src="/images/news/legacy/nc-united-2024-southeast-open/southeast-open-insights.png" alt="Southeast Open notable wins, losses and additional performance insights" width={1536} height={864} className="h-auto w-full" /><figcaption className="px-4 py-3 text-sm text-slate-600">Notable results and competitive insights from NC United&apos;s college-tournament debut.</figcaption></figure>

      <section>
        <h2>A foundation for future growth</h2>
        <p>The debut was about more than the final records. It gave the athletes high-level experience, established a measurable baseline and proved that North Carolina high school wrestlers could earn meaningful wins against college competition.</p>
      </section>
    </div>
  )
}
