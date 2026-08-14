const allAmericans = [
  { place: "6th", name: "Tobin McNair", weight: "152", school: "Raleigh", record: "4–2", detail: "McNair reached the semifinals, shut out No. 12 Paxon Legatt in the quarterfinals and recorded a 20–0 technical fall before medically forfeiting his final placement match with a shoulder injury." },
  { place: "7th", name: "Keyshon Morrison", weight: "220", school: "Lake Norman", record: "6–2", detail: "The returning All-American won six consecutive consolation matches, defeated the No. 7, No. 8 and No. 13 seeds, and finished with three pins and a technical fall." },
  { place: "7th", name: "Jack Harty", weight: "182", school: "Northern Guilford", record: "5–2", detail: "The No. 4 seed opened with two dominant technical falls and secured seventh place with a pin over David Clayton." },
  { place: "7th", name: "Gavin Lopez", weight: "195", school: "Green Hope", record: "4–2", detail: "Unseeded, Lopez returned to the podium for a second year and recorded three falls, including a pin over Aidan Plemons in the placement match." },
  { place: "8th", name: "Aidan Plemons", weight: "195", school: "Blowing Rock", record: "3–3", detail: "Plemons reached the quarterfinals with a major decision and a 9–7 victory before earning All-America honors in a deep 195-pound bracket." },
  { place: "8th", name: "Antonio Escobar", weight: "285", school: "North Carolina", record: "4–3", detail: "Escobar recorded two pins and a pivotal 1–0 consolation victory, showing grit and promise in the heavyweight field." },
] as const

export function NorthCarolinaSophomoresBreakout2025NhscaContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>North Carolina&apos;s Class of 2027 produced six All-Americans at the 2025 NHSCA Nationals—tied for the state&apos;s second-highest sophomore total since records began in 2005. Only the 2013 class, with nine, placed more.</p>
        <p>The group more than doubled North Carolina&apos;s 20-year sophomore average of 2.4 All-Americans and doubled the three earned in 2024.</p>
      </section>

      <section>
        <h2>Six sophomore All-Americans</h2>
        <div className="not-prose grid gap-4 md:grid-cols-2">
          {allAmericans.map((athlete) => (
            <article key={athlete.name} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#13294B]">{athlete.name}</h3><span className="rounded-full bg-[#C20017] px-3 py-1 text-xs font-black text-white">{athlete.place}</span></div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{athlete.weight} lbs · {athlete.school} · {athlete.record}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{athlete.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Another national-level performance</h2>
        <p>Connor Brinkley entered the 220-pound bracket as the No. 12 seed and opened with a 1:02 pin. Although he did not repeat his 2024 seventh-place finish, his performance continued to demonstrate national-level potential.</p>
      </section>

      <section>
        <h2>Returning All-Americans showed growth</h2>
        <div className="not-prose overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[520px] border-collapse text-left text-sm"><thead className="bg-[#13294B] text-white"><tr><th className="px-4 py-3">Athlete</th><th className="px-4 py-3">Freshman result</th><th className="px-4 py-3">Sophomore result</th></tr></thead><tbody>{[["Jack Harty", "3rd", "7th"], ["Keyshon Morrison", "3rd", "7th"], ["Gavin Lopez", "8th", "7th"], ["Connor Brinkley", "7th", "Did not place"]].map(([name, freshman, sophomore]) => <tr key={name} className="border-t border-slate-200 even:bg-slate-50"><td className="px-4 py-3 font-semibold text-[#13294B]">{name}</td><td className="px-4 py-3">{freshman}</td><td className="px-4 py-3">{sophomore}</td></tr>)}</tbody></table></div>
      </section>

      <section>
        <h2>Among the nation&apos;s best</h2>
        <p>North Carolina&apos;s six sophomore All-Americans ranked third nationally behind Pennsylvania&apos;s 13 and California&apos;s seven. The state tied Florida, Ohio, New York and New Jersey while finishing ahead of Virginia, Missouri and Texas.</p>
        <p>Combined with the freshman class&apos;s record-tying seven All-Americans, North Carolina earned 13 underclass All-America finishes—matching the state&apos;s best-ever combined freshman and sophomore performance from 2013.</p>
      </section>
    </div>
  )
}
