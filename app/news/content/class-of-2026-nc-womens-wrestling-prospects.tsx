import Link from "next/link"

const prospects = [
  ["Alicia Reyes", "107", "Hendersonville"],
  ["Alijah Christansen", "235", "Ashley"],
  ["Bailey Nimer", "120", "Mount Pleasant"],
  ["Clear Wesley", "185", "A.L. Brown"],
  ["Destiny Fidel", "132", "East Rutherford"],
  ["Faith Bane", "145", "New Bern"],
  ["Hannah Carty", "120", "Willow Spring"],
  ["Isabella Hernandez", "126", "Jack Britt"],
  ["Iyanna Crawford", "132", "Purnell Swett"],
  ["Jada Lebron", "138", "Hoke County"],
  ["Jenecy Olalde", "100", "Mount Airy"],
  ["Jiselle Riley", "126", "Panther Creek"],
  ["Kaylah Evans", "152", "Bandys"],
  ["Keira Rosenmarkle", "165", "Seaforth"],
  ["Kimberly Talton", "235", "Madison"],
  ["Latia Williams", "152", "Scotland County"],
  ["Leslie Barden", "235", "Laney"],
  ["Lilyann Blair", "126", "Union Pines"],
  ["Madelyn Korvink", "132", "Parkwood"],
  ["Stephanie Diaz Mendoza", "152", "Riverside"],
  ["Zainab Hijawi", "107", "South Central"],
] as const

export function ClassOf2026NcWomensWrestlingProspectsContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>
          NC United&apos;s Women&apos;s College Prospect Rankings highlighted North Carolina&apos;s leading Class of 2026 high
          school wrestlers. The list identified the state&apos;s top juniors and reflected the continued growth of women&apos;s
          wrestling through North Carolina&apos;s high school and club programs.
        </p>
      </section>

      <section>
        <h2>Understanding the United Prospect List</h2>
        <p>The athletes were evaluated through:</p>
        <ul>
          <li>
            <strong>College open participation:</strong> Age-appropriate participation and success demonstrated an
            ability to compete with more experienced wrestlers.
          </li>
          <li>
            <strong>National competition:</strong> Results from NHSCA Nationals, Super 32, Fargo, Journeymen and Ultimate
            Club Duals provided evidence against elite fields.
          </li>
          <li>
            <strong>Wins over nationally ranked opponents:</strong> Quality victories helped identify wrestlers ready
            for the next competitive step.
          </li>
          <li>
            <strong>High school performance:</strong> Strong in-season wins against difficult competition remained an
            important measure of future potential.
          </li>
        </ul>
        <p>
          The rankings served as a resource for college coaches by highlighting North Carolina&apos;s women&apos;s wrestling
          prospects and offering insight into future recruiting opportunities.
        </p>
      </section>

      <section>
        <h2>Class of 2026 Standout Athletes</h2>
        <h3>Faith Bane · New Bern · 145 lbs</h3>
        <p>
          Bane established herself as one of the country&apos;s leading high school wrestlers, earning a No. 17 national
          ranking from USA Wrestling. She won the 2024 state championship and finished as a 2024 NHSCA national
          finalist. She also placed third at the 2023 Women&apos;s Trojan Open against collegiate-level competition and
          earned NHSCA All-America honors in 2023.
        </p>

        <h3>Iyanna Crawford · Purnell Swett · 132 lbs</h3>
        <p>
          Crawford demonstrated her ability against nationally ranked opponents. She finished second at the Women&apos;s
          Trojan Open and defeated the nation&apos;s No. 13-ranked college wrestler, adding another victory over the No.
          29-ranked competitor.
        </p>

        <h3>Zainab Hijawi · South Central · 107 lbs</h3>
        <p>
          Hijawi delivered strong performances at USA Girls Midwest Nationals, placing fifth in the 16U division and
          finishing second in the Junior division. She also earned multiple victories at the Women&apos;s Trojan Open,
          showing an ability to compete successfully against more experienced wrestlers.
        </p>
      </section>

      <section>
        <h2>Class of 2026 Women&apos;s Wrestling Prospect List</h2>
        <p>The historical list was published alphabetically by athlete name.</p>
        <div className="not-prose overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[580px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#13294B] text-white">
              <tr>
                <th className="px-4 py-3">Wrestler</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">High School</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map(([name, weight, school]) => (
                <tr key={name} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{name}</td>
                  <td className="px-4 py-3 text-slate-700">{weight}</td>
                  <td className="px-4 py-3 text-slate-700">{school}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>The Path to College Wrestling</h2>
        <p>
          Competing at the collegiate level requires more than high school success. Athletes must embrace freestyle
          wrestling and test themselves against national competition. Events such as{" "}
          <Link href="https://usawrestlingevents.com/event/2500095902">Fargo Nationals</Link>,{" "}
          <Link href="https://www.super32.com/">Super 32</Link>,{" "}
          <Link href="https://usawrestlingevents.com/event/2500013802">Women&apos;s National Championships and World Team Trials</Link>,{" "}
          <Link href="https://www.journeymenwrestling.com/tournaments">Journeymen</Link>,{" "}
          <Link href="https://usawrestlingevents.com/event/2500011402">Southeast Regionals</Link>, National Duals and
          Ultimate Duals provide experience and recruiting exposure.
        </p>
        <p>
          The athletes on this list helped drive the growth of women&apos;s wrestling in North Carolina. Their success at
          state, regional and national levels reflected the state&apos;s depth of talent and expanding collegiate
          opportunities.
        </p>
      </section>
    </div>
  )
}
