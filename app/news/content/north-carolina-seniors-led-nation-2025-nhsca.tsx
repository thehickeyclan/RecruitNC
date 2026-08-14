const allAmericans = [
  ["3rd", "Cooper Foster", "113", "Avery County · Dogtown", "5–1", "Appalachian State", "The No. 5 seed defeated the No. 3, No. 4 and No. 8 seeds; his only loss was a 10–9 match against top-seeded Oumar Tounkara."],
  ["3rd", "Colt Campbell", "170", "Hickory Ridge · Combat", "6–1", "Appalachian State", "The No. 7 seed defeated the No. 2, No. 4 and No. 17 seeds before his only loss to eventual runner-up Elliott Humphries."],
  ["3rd", "Everest Ouellette", "285", "First Flight · OBX Wrestling Factory", "7–1", "Gardner-Webb", "Unseeded, Ouellette defeated the No. 2, No. 5, No. 6 and No. 7 seeds—the most seeded wins by any North Carolina senior."],
  ["4th", "Liam Hickey", "126", "Cardinal Gibbons · Raleigh Area Wrestling", "6–2", "UNC", "Hickey improved from eighth as a junior, defeated the No. 6 and No. 7 seeds and dropped a 1–0 third-place match."],
  ["4th", "Hayden Haynes", "220", "McDowell · Combat", "6–2", "Appalachian State", "After a round-of-16 disqualification, Haynes wrestled back through the consolation bracket and defeated the No. 8 seed."],
  ["5th", "Nathan McCartney", "160", "Northern Guilford", "5–2", "Uncommitted", "The No. 16 seed exceeded expectations with victories over the No. 7 and No. 9 seeds."],
  ["6th", "Jose Flores", "220", "Hough · Darkhorse", "4–3", "—", "Unseeded, Flores upset No. 5 Myron Mendez in the round of 16 and advanced to the semifinals."],
  ["6th", "Damien Couture", "285", "Hickory Ridge · Darkhorse", "3–1", "Ohio University", "The No. 6 seed reached the semifinals before medically forfeiting his final two placement matches."],
  ["8th", "Michael Vazquez", "285", "Seventy-First", "6–2", "—", "Unseeded, Vazquez highlighted his run by defeating No. 4 Sebastian Rivera."],
] as const

export function NorthCarolinaSeniorsLedNation2025NhscaContent() {
  return (
    <div className="space-y-10">
      <section><p>North Carolina produced nine Senior All-Americans at the 2025 NHSCA Nationals, leading every state and tripling its total of three from 2024. Three wrestlers finished third, and the podium stretched from 113 to 285 pounds.</p><p>The nine placers edged Pennsylvania&apos;s eight and the seven earned by both Virginia and Utah, demonstrating depth across the entire lineup.</p></section>

      <section><h2>Nine Senior All-Americans</h2><div className="not-prose grid gap-4 md:grid-cols-2">{allAmericans.map(([place, name, weight, affiliation, record, college, detail]) => <article key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#13294B]">{name}</h3><span className="rounded-full bg-[#C20017] px-3 py-1 text-xs font-black text-white">{place}</span></div><p className="mt-2 text-sm font-semibold text-slate-900">{weight} lbs · {affiliation} · {record}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">College: {college}</p><p className="mt-2 text-sm leading-6 text-slate-700">{detail}</p></article>)}</div></section>

      <section><h2>More seniors made deep runs</h2><ul><li><strong>Kyle Simpson, 126:</strong> The unseeded Belmont Abbey commit finished 3–2 with wins over the No. 8 and No. 13 seeds.</li><li><strong>Jackson Rowling, 145:</strong> The Roanoke College commit went 3–2 and defeated the No. 9 and No. 13 seeds.</li><li><strong>Brock Sullivan, 182:</strong> The No. 8 seed and returning All-American finished 3–2, defeated No. 7 Nate Wade and was committed to Roanoke College.</li></ul></section>

      <section><h2>A strengthening college pipeline</h2><p>Three All-Americans were committed to Appalachian State, while Liam Hickey was headed to UNC, Everest Ouellette to Gardner-Webb and Damien Couture to Ohio University. Four of the nine placers chose in-state Division I programs.</p><div className="not-prose grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#13294B] p-5 text-center text-white"><div className="text-3xl font-black">9</div><div className="text-xs uppercase tracking-wider">Senior All-Americans</div></div><div className="rounded-xl bg-[#13294B] p-5 text-center text-white"><div className="text-3xl font-black">#1</div><div className="text-xs uppercase tracking-wider">State nationally</div></div><div className="rounded-xl bg-[#13294B] p-5 text-center text-white"><div className="text-3xl font-black">3</div><div className="text-xs uppercase tracking-wider">Third-place finishes</div></div></div></section>

      <section><h2>A historic year</h2><p>The nine All-Americans ranked second among North Carolina senior classes since 2005, behind only the 10 produced in 2023. The 2025 group, however, had three third-place finishers compared with one in 2023.</p><p>Across the freshman, sophomore, junior and senior divisions, North Carolina finished with 24 All-Americans—the highest combined total in state history at the time.</p></section>
    </div>
  )
}
