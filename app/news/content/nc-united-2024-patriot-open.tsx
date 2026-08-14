import Image from "next/image"

const athletes = [
  ["Liam Hickey", "133", "2–0", "4th place", "1.6"],
  ["Lorenzo Alston", "157", "2–2", "Quarterfinals", "1.2"],
  ["Bentley Sly", "149", "2–2", "Round of 32", "1.1"],
  ["Everest Ouellette", "285", "1–2", "Round of 16", "0.8"],
  ["Jack Harty", "184", "0–2", "Round of 16", "0.0"],
] as const

export function NcUnited2024PatriotOpenContent() {
  return (
    <div className="space-y-10">
      <section><p className="text-xl font-semibold text-[#13294B]">Five NC United high school wrestlers entered the 2024 Patriot Open and tested themselves primarily against college athletes from programs including Navy, Maryland, App State, George Mason and Drexel.</p><p>Their second collegiate tournament produced the program&apos;s first podium finish, several wins over Division I opponents and a measurable step forward from the Southeast Open.</p></section>

      <section><h2>Patriot Open performance</h2><div className="not-prose overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#087c42] text-white"><tr><th className="p-3">Athlete</th><th className="p-3">Weight</th><th className="p-3">Record</th><th className="p-3">Progression</th><th className="p-3">CAP score</th></tr></thead><tbody>{athletes.map(([name, weight, record, progression, cap]) => <tr key={name} className="border-t border-slate-200 even:bg-slate-50"><td className="p-3 font-semibold">{name}</td><td className="p-3">{weight}</td><td className="p-3">{record}</td><td className="p-3">{progression}</td><td className="p-3 font-bold">{cap}</td></tr>)}</tbody></table></div></section>

      <section className="not-prose grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-[#087c42] p-5 text-center text-white"><div className="text-4xl font-black text-[#f3d67a]">4th</div><div className="mt-2 font-bold uppercase">Liam Hickey</div></div><div className="rounded-xl bg-[#087c42] p-5 text-center text-white"><div className="text-4xl font-black text-[#f3d67a]">0.94</div><div className="mt-2 font-bold uppercase">Team CAP average</div></div><div className="rounded-xl bg-[#087c42] p-5 text-center text-white"><div className="text-4xl font-black text-[#f3d67a]">44%</div><div className="mt-2 font-bold uppercase">Improvement</div></div></section>

      <section><h2>Measurable growth</h2><p>Liam Hickey went unbeaten before a medical forfeit and recorded the program&apos;s first collegiate-open podium finish. Lorenzo Alston reached the quarterfinals, while Sly and Ouellette also earned wins in a substantially stronger field than the group faced in its debut.</p><p>Six of the team&apos;s seven victories came against Division I opponents. The collective CAP score rose 44% from the Southeast Open, giving the program another benchmark for evaluating preparation and competitive progress.</p></section>

      <figure className="not-prose overflow-hidden rounded-2xl border border-slate-200 bg-[#087c42]"><Image src="/images/news/legacy/nc-united-2024-patriot-open/patriot-open-performance.png" alt="Patriot Open tournament overview, athlete results and CAP score rankings" width={1600} height={900} className="h-auto w-full" /><figcaption className="bg-white px-4 py-3 text-sm text-slate-600">Tournament overview, results and CAP score analysis.</figcaption></figure>

      <section><h2>Wins that raised the standard</h2><ul><li>Hickey defeated Drexel&apos;s John Hildebrandt and George Mason&apos;s Geoffry Whelan.</li><li>Alston earned a 5–4 victory over Navy&apos;s Charlie Evans.</li><li>Sly pinned Franklin &amp; Marshall&apos;s Kyle Diesley.</li><li>Ouellette defeated Gardner-Webb&apos;s Mason Blue, a 2024 North Carolina state finalist.</li></ul><p>The field also exposed the wrestlers to NCAA qualifiers, experienced Division I starters and the eventual heavyweight champion—exactly the kind of competition the program sought.</p></section>

      <figure className="not-prose overflow-hidden rounded-2xl border border-slate-200"><Image src="/images/news/legacy/nc-united-2024-patriot-open/patriot-open-insights.png" alt="Patriot Open notable wins, challenges and additional insights" width={1600} height={900} className="h-auto w-full" /><figcaption className="px-4 py-3 text-sm text-slate-600">Notable wins and competitive insights from the Patriot Open.</figcaption></figure>

      <section><h2>Another step forward</h2><p>Competing in collegiate tournaments while still in high school remained unusual, but the Patriot Open demonstrated why NC United pursued the opportunity. The athletes gained experience against older opponents, identified the next areas for growth and proved they could earn meaningful results at that level.</p></section>
    </div>
  )
}
