import Link from "next/link"

const historicalPerformance = [
  ["2024", "All divisions", "295", "17"],
  ["2024", "Freshman", "51", "4"],
  ["2024", "Sophomore", "74", "3"],
  ["2024", "Junior", "85", "5"],
  ["2024", "Senior", "48", "3"],
  ["2024", "Girls", "19", "3"],
  ["2023", "All divisions", "337", "24"],
  ["2023", "Freshman", "56", "5"],
  ["2023", "Sophomore", "82", "1"],
  ["2023", "Junior", "89", "3"],
  ["2023", "Senior", "59", "10"],
  ["2023", "Girls", "27", "5"],
  ["2022", "All divisions", "251", "18"],
  ["2022", "Freshman", "40", "1"],
  ["2022", "Sophomore", "49", "2"],
  ["2022", "Junior", "83", "5"],
  ["2022", "Senior", "42", "7"],
  ["2022", "Girls", "19", "3"],
] as const

const watchLists = [
  {
    division: "Seniors",
    wrestlers:
      "Liam Hickey, Colt Campbell, Brock Sullivan, Cooper Foster, Xavier Wilson, Kevin O’Brien, Kyser Kostoff, Jackson Rowling, Boedi Kirkland, Kayne Bryson, Kenneth Pritz, Trevquan Gary, Nathan McCartney and Everest Ouellette",
  },
  {
    division: "Juniors",
    wrestlers:
      "Bentley Sly, Lorenzo Alston, Eli Horton, Cael Dunn, Gabe Rogers, Trevelian Hall, Austin Green, Andrew Meadows, Dominic Blue, Will Varner and Landon Pope",
  },
  {
    division: "Sophomores",
    wrestlers:
      "Jack Harty, Tye Johnson, Mac Johnson, Carson Worrick, Aiden White, Holt Quincy, Tobin McNair, Ayden Sumners, Tyton Kostoff and Jacob McCord",
  },
  {
    division: "Freshmen",
    wrestlers:
      "Aaron Ellison, Connor Reece, Jackson D’ettore, Jake Amiott, Jacob Perry, Luke Richards, Ammon Scott, Drew Teeter, Ryan Thompson and Hayden Smith",
  },
  {
    division: "Girls",
    wrestlers:
      "Sumaiya Aamound, Anna Ockerman, Brianna DeLeon, Faith Bane, Khiry Reese, Addison Gore, Anabel Rodriguez, Isabella Hernandez, Iyanna Crawford, Kennedie Snow, Leah Edwards, Skyla Simpson, Zainab Hijawi, Stephanie Diaz Mendoza, Kaylah Evans, Sophia Ozanich, Rylynn Keziah, Zaria Robinson and Addison Vindigni",
  },
]

export function NorthCarolinaReady2025NhscaNationalsContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>
          NHSCA High School Nationals took place March 28–30, 2025, in Virginia Beach, Virginia. North Carolina&apos;s
          leading wrestlers prepared for one of high school wrestling&apos;s biggest stages and an opportunity to earn
          All-America honors while competing in front of NCAA coaches from every division.
        </p>
        <p>
          NHSCA&apos;s grade-aligned structure placed freshmen against freshmen, sophomores against sophomores and so on,
          giving each athlete an opportunity to measure themselves against their age group and future recruiting class.
          With returning placers and rising talent, North Carolina aimed for another strong national performance.
        </p>
      </section>

      <section>
        <h2>Why High School Nationals Matter</h2>
        <ul>
          <li>
            <strong>Elite national competition:</strong> North Carolina athletes could test themselves against leading
            wrestlers from across the country.
          </li>
          <li>
            <strong>Recruiting exposure:</strong> NCAA coaches from every division scouted the tournament, creating a
            major opportunity for prospective college wrestlers.
          </li>
          <li>
            <strong>All-America recognition:</strong> NHSCA placement added a nationally recognized credential for
            recruiting, seeding and athlete visibility.
          </li>
          <li>
            <strong>A path to national rankings:</strong> Deep fields created opportunities to defeat nationally ranked
            opponents and earn greater recognition.
          </li>
          <li>
            <strong>Development and toughness:</strong> Consecutive high-level matches prepared athletes for Super 32,
            Fargo, college opens and future national competition.
          </li>
        </ul>
      </section>

      <section>
        <h2>North Carolina&apos;s NHSCA Performance: 2022–2024</h2>
        <div className="not-prose overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[620px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#13294B] text-white">
              <tr>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Division</th>
                <th className="px-4 py-3">Participants</th>
                <th className="px-4 py-3">All-Americans</th>
              </tr>
            </thead>
            <tbody>
              {historicalPerformance.map(([year, division, participants, allAmericans]) => (
                <tr key={`${year}-${division}`} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-[#13294B]">{year}</td>
                  <td className="px-4 py-3 text-slate-900">{division}</td>
                  <td className="px-4 py-3 text-slate-700">{participants}</td>
                  <td className="px-4 py-3 text-slate-700">{allAmericans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul>
          <li>Seniors were the state&apos;s most consistent placers over the previous three tournaments.</li>
          <li>Improving freshman results showed that younger North Carolina wrestlers were becoming more competitive nationally.</li>
          <li>Girls wrestling continued building momentum through consistent podium finishes.</li>
        </ul>
      </section>

      <section>
        <h2>North Carolina Wrestlers to Watch</h2>
        <p>
          The preview identified podium contenders using national rankings, college-open performance, results at events
          such as Super 32, Fargo, Ultimate Club Duals, Journeymen and NHSCA Duals, plus state titles and significant
          in-state victories.
        </p>
        <div className="not-prose grid gap-4 md:grid-cols-2">
          {watchLists.map((group) => (
            <article key={group.division} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-[#13294B]">{group.division}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{group.wrestlers}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>North Carolina&apos;s Rising Success</h2>
        <p>
          With returning All-Americans, state champions and rising talent, North Carolina entered NHSCA Nationals with
          the potential for a standout performance. The tournament offered athletes a chance to showcase their skills,
          gain national recognition and take another step toward college wrestling.
        </p>
        <p>Best of luck to every North Carolina wrestler competing in Virginia Beach.</p>
        <p>
          <Link href="https://nhsca-events.com/high-school-nationals/">36th Annual NHSCA High School Nationals</Link>
        </p>
      </section>
    </div>
  )
}
