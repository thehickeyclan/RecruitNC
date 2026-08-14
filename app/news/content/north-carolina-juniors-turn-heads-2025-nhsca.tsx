const performances = [
  {
    place: "2nd",
    name: "Lorenzo Alston",
    weight: "145",
    affiliation: "Asheboro · K-Vegas",
    record: "7–1",
    detail: "The No. 2 seed pinned nationally ranked Jackson Butler in the quarterfinals and Gus Cardinal in the semifinals before a narrow 6–4 loss to Michael Turi in the championship match. Alston recorded three pins and two technical falls, improving from fourth in 2024 to second in 2025.",
  },
  {
    place: "3rd",
    name: "Bentley Sly",
    weight: "138",
    affiliation: "Stuart Cramer · Darkhorse",
    record: "7–1",
    detail: "The No. 6 seed defeated top-seeded and nationally ranked Joseph Toscano, 8–2, in the consolation semifinals. Sly then pinned No. 10 Ames Michael Hoevker in 1:40 for bronze, improving on his sixth-place finish from 2024.",
  },
] as const

export function NorthCarolinaJuniorsTurnHeads2025NhscaContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>North Carolina&apos;s junior class produced a finalist and two returning All-Americans at the 2025 NHSCA Nationals. Lorenzo Alston&apos;s silver medal and Bentley Sly&apos;s bronze highlighted a group that proved capable of beating nationally ranked and highly seeded competition.</p>
      </section>

      <section>
        <h2>Two returning All-Americans climbed the podium</h2>
        <div className="not-prose grid gap-4 md:grid-cols-2">
          {performances.map((athlete) => (
            <article key={athlete.name} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#13294B]">{athlete.name}</h3><span className="rounded-full bg-[#D3B574] px-3 py-1 text-xs font-black text-[#13294B]">{athlete.place}</span></div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{athlete.weight} lbs · {athlete.affiliation} · {athlete.record}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{athlete.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Gabe Rogers came within one match of the podium</h2>
        <p>Gabe Rogers, the No. 7 seed at 120 pounds, opened with four consecutive victories and reached the quarterfinals. He dropped a 2–0 decision to No. 6 Samuel Comes and then a 1–0 blood-round match to No. 10 Preston White, finishing 4–2 in a deep field.</p>
      </section>

      <section>
        <h2>National results built on prior success</h2>
        <p>Alston and Sly each defeated multiple seeded or nationally ranked opponents and improved upon their 2024 placements. Their performances reinforced North Carolina&apos;s growing ability to develop wrestlers who can make deep runs in elite national brackets.</p>
        <div className="not-prose grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">7–1</div><div className="mt-1 text-sm">Lorenzo Alston · National runner-up</div></div><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">7–1</div><div className="mt-1 text-sm">Bentley Sly · Third place</div></div></div>
      </section>

      <section>
        <h2>Looking ahead</h2>
        <p>As the group moved toward its senior season, Alston&apos;s commitment to NC State provided another sign that North Carolina could retain elite talent within its college programs. With a national finalist, a third-place finisher and another wrestler one victory from the podium, the class entered 2025–26 with significant momentum.</p>
      </section>
    </div>
  )
}
