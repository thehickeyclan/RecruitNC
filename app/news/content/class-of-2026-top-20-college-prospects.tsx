import Link from "next/link"

const topFive = [
  {
    rank: 1,
    name: "Bentley Sly",
    weight: "144",
    school: "Stuart Cramer",
    club: "Darkhorse",
    commitment: "Undecided",
    accomplishments:
      "2–2 against NCAA Division I opponents, ranked No. 20 nationally, multiple wins against nationally ranked opponents, 5–2 at Super 32, 6–2 at Fargo, NHSCA All-American, first at Southeast Regionals and two-time state champion.",
  },
  {
    rank: 2,
    name: "Lorenzo Alston",
    weight: "157",
    school: "Uwharrie Charter",
    club: "K-Vegas",
    commitment: "NC State",
    accomplishments:
      "5–4 against NCAA Division I opponents, two-time NHSCA All-American, previously nationally ranked, multiple wins over nationally ranked wrestlers and two-time state champion.",
  },
  {
    rank: 3,
    name: "Eli Horton",
    weight: "138",
    school: "Morehead",
    club: "Combat",
    commitment: "Undecided",
    accomplishments:
      "4–2 at Super 32, a win against a seeded Super 32 opponent, state champion and two-time state finalist.",
  },
  {
    rank: 4,
    name: "Cael Dunn",
    weight: "190",
    school: "Avery County",
    club: "Dogtown",
    commitment: "Undecided",
    accomplishments: "3–2 at NHSCA and Super 32 and two-time state champion.",
  },
  {
    rank: 5,
    name: "Andrew Meadows",
    weight: "175",
    school: "Mount Airy",
    club: "K-Vegas",
    commitment: "Undecided",
    accomplishments: "4–2 at NHSCA, state champion and two-time state placer.",
  },
]

const prospects = [
  [1, "Bentley Sly", "Stuart Cramer", "Darkhorse", "144", "—"],
  [2, "Lorenzo Alston", "Uwharrie Charter", "K-Vegas", "157", "NC State"],
  [3, "Eli Horton", "Morehead", "Combat", "138", "—"],
  [4, "Cael Dunn", "Avery County", "Dogtown", "190", "—"],
  [5, "Andrew Meadows", "Mount Airy", "K-Vegas", "175", "—"],
  [6, "Dominic Blue", "Union Pines", "Wrestling Factory", "175", "—"],
  [7, "Gabe Rogers", "Seaforth", "TWA", "120", "—"],
  [8, "Avery Rhymer", "St. Stephens", "Combat", "215", "—"],
  [9, "Jace Barrier", "Mooresville", "Darkhorse", "126", "—"],
  [10, "Landon Pope", "Pisgah", "Haywood Elite", "215", "—"],
  [11, "Sammuel Gantt", "Pine Forest", "RAW", "144", "—"],
  [12, "Will Varner", "Kings Mountain", "Darkhorse", "150", "—"],
  [13, "Dominic Hittepole", "Wheatmore", "Combat", "175", "—"],
  [14, "Trevelian Hall", "Lumberton", "NC Pride", "106", "—"],
  [15, "Tiaj Thao", "Davie", "Combat", "132", "—"],
  [16, "Andrew Davis", "Davie", "Combat", "144", "—"],
  [17, "Sam Harper", "South Iredell", "C2X", "190", "—"],
  [18, "Cameron Gue", "Mount Pleasant", "Darkhorse", "132", "—"],
  [19, "Jack Gibson", "Northwest Guilford", "—", "150", "—"],
  [20, "Jordan Miller", "Seaforth", "TWC", "113", "—"],
] as const

export function ClassOf2026Top20CollegeProspectsContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>
          Wrestling fans, athletes and coaches: NC United&apos;s Class of 2026 College Prospect Rankings recognized 20 of
          North Carolina&apos;s leading high school wrestlers for their skills, achievements and collegiate potential. The
          list reflected the dedication of wrestlers across the state and the strength of North Carolina&apos;s high school
          and club programs.
        </p>
      </section>

      <section>
        <h2>Significance of the United Prospect List</h2>
        <p>The NC United College Prospect Rankings were designed to identify athletes who demonstrated:</p>
        <ul>
          <li>Exceptional skills on the mat</li>
          <li>Significant achievements in local, regional and national competition</li>
          <li>The potential for collegiate wrestling success</li>
        </ul>
        <p>
          The rankings gave college coaches a resource for identifying North Carolina prospects and considered college
          open performances, wins against nationally ranked opponents, Super 32 and NHSCA results, state tournament
          performance and significant in-season wins.
        </p>
      </section>

      <section>
        <h2>Top Five Profiles</h2>
        <div className="not-prose grid gap-4">
          {topFive.map((athlete) => (
            <article key={athlete.rank} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-bold text-[#13294B]">
                  {athlete.rank}. {athlete.name} · {athlete.weight} lbs
                </h3>
                <span className="rounded-full bg-[#13294B] px-3 py-1 text-xs font-semibold text-white">
                  {athlete.commitment}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {athlete.school} · {athlete.club}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{athlete.accomplishments}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Top 20 Class of 2026 College Wrestling Prospects</h2>
        <div className="not-prose overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[820px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#13294B] text-white">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Wrestler</th>
                <th className="px-4 py-3">High School</th>
                <th className="px-4 py-3">Club</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Commitment</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map(([rank, name, school, club, weight, commitment]) => (
                <tr key={rank} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-[#13294B]">{rank}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{name}</td>
                  <td className="px-4 py-3 text-slate-700">{school}</td>
                  <td className="px-4 py-3 text-slate-700">{club}</td>
                  <td className="px-4 py-3 text-slate-700">{weight}</td>
                  <td className="px-4 py-3 text-slate-700">{commitment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>What&apos;s Next?</h2>
        <p>
          NC United planned to continue breaking down the top prospects from each graduating class, highlighting their
          accomplishments and potential for success.
        </p>
        <p>
          Read the previous archive: <Link href="/news/class-of-2025-top-25-college-prospects">Top 25 College Prospects — Class of 2025</Link>.
        </p>
      </section>
    </div>
  )
}
