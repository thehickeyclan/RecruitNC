import Image from "next/image"

const allAmericans = [
  ["Champion", "Faith Bane", "145", "New Bern", "5–0", "Bane completed a perfect tournament, pinned No. 7 Maddie Cooper in the quarterfinals and won the championship by fall."],
  ["Champion", "Taylor Williams", "152", "Kernersville", "4–0", "Williams produced the tournament's biggest upset by pinning top-seeded Angelinah DeLeon in the semifinals before a dominant finals performance."],
  ["4th", "Isabella Hernandez", "132", "Fayetteville", "7–1", "Hernandez recorded the most wins by a North Carolina woman and defeated No. 4 Kimber Alford, 6–2."],
  ["6th", "Sara Warren", "100", "Raeford", "4–3", "Warren opened with a fall over No. 6 Esperanza Gallegos and battled through the bracket to the podium."],
  ["6th", "Kaylah Evans", "152", "Catawba", "2–3", "Evans earned two early victories and became one of three North Carolina All-Americans at 152 pounds."],
  ["7th", "Daniella Jenkins", "235", "Harrisburg", "3–1", "Jenkins pinned No. 6 Ayanna Omollo and recorded multiple quick falls, including one in 45 seconds."],
  ["8th", "Stephanie Diaz Mendoza", "152", "Haw River", "4–1", "Diaz Mendoza completed North Carolina's three-wrestler All-America showing at 152 pounds."],
] as const

const seededWins = ["Taylor Williams over No. 1 Angelinah DeLeon", "Avery Daley over No. 2 Chykiya Miller", "Isabella Hernandez over No. 4 Kimber Alford", "Madelyn Korvink over No. 5 Olivia Byington", "Sara Warren over No. 6 Esperanza Gallegos", "Emma Yopp over No. 6 Alexandra Lubczenko", "Daniella Jenkins over No. 6 Ayanna Omollo", "Waylan Collins over No. 7 Samantha Maestas", "Emma Yopp over No. 7 Maddox Zuniga", "Faith Bane over No. 7 Maddie Cooper"] as const

export function NcWomenBreakthrough2025NhscaContent() {
  return (
    <div className="space-y-10">
      <section><p>North Carolina women delivered a milestone performance at the 2025 NHSCA Nationals, earning seven All-America honors and finishing fourth nationally. The total more than doubled the state&apos;s three placers from 2024, and Faith Bane and Taylor Williams became its first pair of champions at the same NHSCA Nationals.</p></section>

      <section><h2>Two national champions</h2><div className="not-prose grid gap-5 md:grid-cols-2"><figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><div className="relative aspect-[3/4]"><Image src="/images/news/legacy/2025-nhsca-women-breakthrough/faith-bane.png" alt="Faith Bane with her coaches and NHSCA All-America bracket" fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /></div><figcaption className="p-3 text-sm font-semibold text-[#13294B]">Faith Bane · 145-pound national champion</figcaption></figure><figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><div className="relative aspect-[3/4]"><Image src="/images/news/legacy/2025-nhsca-women-breakthrough/taylor-williams.png" alt="Taylor Williams with her coach and NHSCA championship bracket" fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /></div><figcaption className="p-3 text-sm font-semibold text-[#13294B]">Taylor Williams · 152-pound national champion</figcaption></figure></div></section>

      <section><h2>Seven All-Americans</h2><div className="not-prose grid gap-4 md:grid-cols-2">{allAmericans.map(([place, name, weight, hometown, record, detail]) => <article key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#13294B]">{name}</h3><span className="rounded-full bg-[#D3B574] px-3 py-1 text-xs font-black text-[#13294B]">{place}</span></div><p className="mt-2 text-sm font-semibold text-slate-900">{weight} lbs · {hometown} · {record}</p><p className="mt-2 text-sm leading-6 text-slate-700">{detail}</p></article>)}</div></section>

      <section><h2>Depth beyond the podium</h2><p>Khiry Reese finished 5–2 at 107, Waylan Collins went 4–2 at 120, Zainab Hijawi posted a 4–1 record at 107 and Emma Yopp finished 3–2 at 165. Avery Daley added a major upset at 235 by pinning the No. 2 seed.</p></section>

      <section><h2>Ten wins over seeded opponents</h2><div className="not-prose grid gap-2 sm:grid-cols-2">{seededWins.map((win) => <div key={win} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">{win}</div>)}</div></section>

      <section><h2>A breakthrough year</h2><p>North Carolina rose from 14th nationally in 2024 to fourth in 2025, behind only Florida, California and Georgia. The state tied California, Florida and Virginia for the most individual champions, despite entering fewer wrestlers than many larger states.</p><div className="not-prose grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">2</div><div className="text-xs uppercase tracking-wider">Champions</div></div><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">7</div><div className="text-xs uppercase tracking-wider">All-Americans</div></div><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">#4</div><div className="text-xs uppercase tracking-wider">Nationally</div></div></div><p>Placers spanning 100 through 235 pounds demonstrated growing depth across the state and marked a turning point for North Carolina women&apos;s wrestling.</p></section>
    </div>
  )
}
