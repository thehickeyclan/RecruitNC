import Link from "next/link"

const commitmentLink = "https://ncwrestlingunited.com/2025/01/11/college-commitments/"

const topFive = [
  {
    rank: 1,
    name: "Nate Askew",
    weight: "141",
    school: "Home School",
    club: "Tarheel Wrestling Club",
    commitment: "UNC",
    accomplishments:
      "World Team member, third at the Cleveland State College Open, Fargo All-American, Super 32 All-American, ranked No. 12 nationally and multiple wins against nationally ranked opponents.",
  },
  {
    rank: 2,
    name: "Liam Hickey",
    weight: "133",
    school: "Cardinal Gibbons",
    club: "RAW",
    commitment: "UNC",
    accomplishments:
      "3–2 against NCAA Division I opponents, fourth at the Patriot College Open, ranked No. 23 nationally, NHSCA All-American, state champion, three-time state placer and second at Southeast Regionals.",
  },
  {
    rank: 3,
    name: "Colt Campbell",
    weight: "174",
    school: "Hickory Ridge",
    club: "Compound",
    commitment: "App State",
    accomplishments:
      "First at the Pembroke College Open, wins against nationally ranked opponents, 5–2 and Round of 12 at NHSCA, state champion, two-time state placer and freestyle state champion.",
  },
  {
    rank: 4,
    name: "Brock Sullivan",
    weight: "184",
    school: "Union Pines",
    club: "The Wrestling Factory",
    commitment: "Roanoke",
    accomplishments:
      "NHSCA All-American, undefeated at Ultimate Club Duals, state champion and two-time state finalist.",
  },
  {
    rank: 5,
    name: "Cooper Foster",
    weight: "125",
    school: "Avery County",
    club: "Dogtown",
    commitment: "App State",
    accomplishments: "NHSCA All-American, two-time state champion and three-time state placer.",
  },
]

const prospects = [
  [1, "Nate Askew", "Home School", "Tarheel Wrestling Club", "141", "UNC"],
  [2, "Liam Hickey", "Cardinal Gibbons", "RAW", "133", "UNC"],
  [3, "Colt Campbell", "Hickory Ridge", "Compound", "174", "App State"],
  [4, "Brock Sullivan", "Union Pines", "The Wrestling Factory", "184", "Roanoke"],
  [5, "Cooper Foster", "Avery County", "Dogtown", "125", "App State"],
  [6, "Xavier Wilson", "Eastern Guilford", "—", "197", "—"],
  [7, "Kevin O’Brien", "West Rowan", "Combat", "141", "Lander"],
  [8, "Kyser Kostoff", "Hough", "Darkhorse", "165", "—"],
  [9, "Luke Osborne", "Ashe County", "Combat", "157", "—"],
  [10, "Jackson Rowling", "Hough", "Darkhorse", "149", "Roanoke"],
  [11, "Boedi Kirkland", "Newton-Conover", "Darkhorse", "141", "—"],
  [12, "Kenneth Pritz", "Avery County", "Dogtown", "157", "—"],
  [13, "Ryan Mann", "North East Carolina Prep", "Capital City", "141", "Presbyterian"],
  [14, "Kayne Bryson", "Pisgah", "Haywood Elite", "125", "Newberry"],
  [15, "Caleb Cox", "Rutherfordton-Spindale", "Darkhorse", "157", "—"],
  [16, "Sebastian Rivera", "Panther Creek", "RAW", "HWT", "—"],
  [17, "Nathan McCartney", "Central Davidson", "—", "165", "—"],
  [18, "Trevquan Gary", "Person", "—", "HWT", "—"],
  [19, "Everest Ouellette", "First Flight", "OBX Wrestling Factory", "HWT", "Gardner-Webb"],
  [20, "Grant McCord", "Grimsley", "School of Hard Knocks", "125", "—"],
  [21, "Hayden Haynes", "McDowell", "Combat", "197", "App State"],
  [22, "Finn McCafferty", "Union Pines", "The Wrestling Factory", "157", "—"],
  [23, "Tyler Watt", "Wake Forest", "Capital City", "133", "—"],
  [24, "Donovan Edwards", "Southwest Guilford", "School of Hard Knocks", "141", "—"],
  [25, "Jaylen Bethea", "Hoke County", "Forge", "141", "—"],
] as const

export function ClassOf2025Top25CollegeProspectsContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>
          Wrestling fans, athletes and coaches: NC United&apos;s inaugural College Prospect Rankings showcased North
          Carolina&apos;s top 25 high school wrestlers in the Class of 2025. The list recognized their skills,
          achievements and collegiate potential while celebrating the strength of the state&apos;s high school and club
          wrestling programs.
        </p>
      </section>

      <section>
        <h2>Understanding the United Prospect List</h2>
        <p>The rankings were designed to showcase athletes who demonstrated:</p>
        <ul>
          <li>Exceptional skills on the mat</li>
          <li>Significant achievements in local, regional and national competition</li>
          <li>The potential for collegiate success in wrestling</li>
        </ul>
        <p>
          The rankings aimed to give college coaches a streamlined resource for identifying North Carolina&apos;s leading
          prospects while increasing visibility and recruiting opportunities for the athletes.
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
        <h2>Top 25 North Carolina Wrestling Prospects</h2>
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
        <h2>Key Highlights</h2>
        <p>
          <strong>Common attributes:</strong> The leading wrestlers consistently sought the highest levels of
          competition, including Super 32, Fargo and Journeymen. They also competed in college opens, trained year-round,
          invested in their clubs and earned wins against nationally ranked opponents.
        </p>
        <p>
          <strong>College commitments:</strong> At publication, 44% of the Top 25 were committed to collegiate programs,
          with representation across NCAA divisions. View the archived{" "}
          <Link href={commitmentLink}>college commitment coverage</Link>.
        </p>
        <p>
          <strong>App State:</strong> The Mountaineers had commitments from Colt Campbell at No. 3, Cooper Foster at No.
          5 and Hayden Haynes at No. 21.
        </p>
        <p>
          <strong>UNC:</strong> The Tar Heels had commitments from the top two prospects, Nate Askew and Liam Hickey.
        </p>
        <p>
          <strong>Roanoke:</strong> Roanoke College continued its focus on North Carolina talent with Brock Sullivan at
          No. 4 and Jackson Rowling at No. 10.
        </p>
        <p>
          <strong>Diverse representation:</strong> Athletes represented schools, clubs and weight classes from across
          North Carolina.
        </p>
      </section>

      <section>
        <h2>What&apos;s Next?</h2>
        <p>
          NC United planned to release rankings by graduating class on a rolling basis, continuing to highlight each
          athlete&apos;s accomplishments and potential for collegiate success.
        </p>
      </section>
    </div>
  )
}
