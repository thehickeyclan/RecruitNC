const allAmericans = [
  { place: "4th", name: "Aaron Ellison", weight: "138", record: "5–2", detail: "Unseeded, Ellison defeated two seeded wrestlers, including a 9–0 quarterfinal major over No. 5 Timmy Boda, and reached the semifinals." },
  { place: "5th", name: "Aaron Ruiz-Angel", weight: "220", record: "4–2", detail: "The No. 5 seed twice major-decisioned nationally ranked Cody Alessi and opened his tournament with a 23-second pin." },
  { place: "6th", name: "Ryan Thompson", weight: "170", record: "4–3", detail: "Thompson opened with consecutive pins, reached the semifinals and closed with a 21–19 battle in the fifth-place bout." },
  { place: "7th", name: "Connor Reece", weight: "132", record: "5–2", detail: "The No. 9 seed recorded a technical fall, upset No. 7 Adrian Day and won the seventh-place bout by fall." },
  { place: "8th", name: "Mitchell Rowland", weight: "132", record: "5–3", detail: "Rowland produced consecutive technical falls and a 14–3 major, joining Reece as a second North Carolina placer at 132." },
  { place: "8th", name: "Jacob Perry", weight: "152", record: "6–3", detail: "Unseeded, Perry led the North Carolina freshmen in wins and recorded four technical falls, including consecutive 18–0 shutouts." },
  { place: "8th", name: "Coy Greer", weight: "160", record: "4–3", detail: "The No. 13 seed reeled off three consecutive consolation bonus-point wins: two technical falls and a 46-second pin." },
] as const

export function NorthCarolinaFreshmenHistoricImpact2025NhscaContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>North Carolina&apos;s freshman class delivered a historic performance at the 2025 NHSCA Nationals, producing a record-tying seven All-Americans across six weight classes.</p>
        <p>The total tied North Carolina for fifth nationally with Florida, behind Pennsylvania, Ohio, New York and New Jersey. It also nearly doubled the state&apos;s 20-year freshman average of 3.6 All-Americans.</p>
      </section>

      <section>
        <h2>Seven freshman All-Americans</h2>
        <div className="not-prose grid gap-4 md:grid-cols-2">
          {allAmericans.map((athlete) => (
            <article key={athlete.name} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#13294B]">{athlete.name}</h3><span className="rounded-full bg-[#D3B574] px-3 py-1 text-xs font-black text-[#13294B]">{athlete.place}</span></div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{athlete.weight} lbs · {athlete.record}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{athlete.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Bonus-point dominance</h2>
        <p>Across 33 victories, North Carolina freshmen combined for seven pins, nine technical falls and eight major decisions. Seventy-three percent of their wins earned bonus points—a reflection of pace, offense and a willingness to pursue dominant results.</p>
        <div className="not-prose grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">7</div><div className="text-xs uppercase tracking-wider">Pins</div></div><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">9</div><div className="text-xs uppercase tracking-wider">Tech falls</div></div><div className="rounded-xl bg-[#13294B] p-5 text-white"><div className="text-3xl font-black">8</div><div className="text-xs uppercase tracking-wider">Major decisions</div></div></div>
      </section>

      <section>
        <h2>Historic context and outlook</h2>
        <p>The seven placers tied North Carolina&apos;s single-year freshman record. Their distribution from 132 through 220 pounds showed depth across the lineup, while their work through consolation brackets demonstrated resilience after setbacks.</p>
        <p>Combined with six sophomore All-Americans, North Carolina produced 13 placers across the two underclass divisions—matching the state&apos;s best NHSCA performance from 2013. With the Class of 2028 only beginning its high school career, the results signaled a strong development pipeline for the years ahead.</p>
      </section>
    </div>
  )
}
