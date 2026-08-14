const accomplishments = ["12 state championships", "46 state placements", "7 All-American honors", "1 World Team member", "1 Super 32 All-American honor", "9 college commitments"]

const roster = [
  "Mason Brown", "Ethan Halstead", "Ayven Chitavong", "Luke Richards", "Jordan Miller", "Brady Donovan", "Trevalian Hall", "Holt Quincy", "Mac Johnson", "Gabe Rogers", "Tye Johnson", "Kyle Simpson", "Layne Armstrong", "Liam Hickey", "Connor Reese", "Tyler Watt", "Kevin O’Brien", "Carson Worrick", "Jackson Rowling", "Ryan Mann", "Bentley Sly", "Tobin McNair", "Finn McCafferty", "Lorenzo Alston", "Nate Askew", "Tripp Sullivan", "Colt Campbell", "Jack Harty", "Harrison Comton", "Dominic Blue", "Brock Sullivan", "Xavier Wilson", "Ethan Kuball", "Avery Rhymer", "Sam Harper", "Carson Raper", "Aidan Gore", "Dominic Hittpole", "Kyser Kostoff", "Tyton Kostoff", "Krimsyn Kostoff", "Andrew Meadows", "Sebastian Rivera", "Dantrell Williams",
]

const schedule = [
  ["North Carolina Open", "January 26", "Chapel Hill, NC", "Folkstyle"],
  ["NHSCA Nationals", "March 28–30", "Virginia Beach, VA", "Folkstyle"],
  ["U.S. Open U15/U17/U20", "April 23–27", "Las Vegas, NV", "Freestyle / Greco"],
  ["NC Freestyle & Greco States", "May 4–5", "Mooresville, NC", "Freestyle / Greco"],
  ["Southeast Regionals", "May 17–18", "Gwinnett, GA", "Freestyle / Greco"],
  ["NHSCA Duals", "May 24–26", "Virginia Beach, VA", "Folkstyle"],
  ["USA Wrestling Junior National Duals", "June 16–21", "Milwaukee, WI", "Freestyle / Greco"],
  ["Junior & 16U Nationals", "July 10–19", "Fargo, ND", "Freestyle / Greco"],
  ["Ultimate Club Duals", "September 13–14", "State College, PA", "Folkstyle"],
  ["Journeymen Classic", "September 27–28", "Manheim, PA", "Folkstyle"],
  ["Super 32 Prep Camp", "October 3–5", "Johnstown, PA", "Folkstyle"],
  ["Super 32", "October 11–12", "Greensboro, NC", "Folkstyle"],
  ["Southeast College Open", "November 1", "Salem, VA", "Folkstyle"],
] as const

export function NcUnitedBlueElevatingNcWrestling2024Content() {
  return (
    <div className="space-y-10">
      <section>
        <p className="text-xl font-semibold text-[#13294B]">Breaking barriers. Building champions. Representing North Carolina.</p>
        <p>NC United Blue launched as an elite program bringing together North Carolina&apos;s top high school wrestlers around a shared vision: excellence on the mat, national success and a new standard for representing the state.</p>
      </section>

      <section>
        <h2>What was NC United Blue?</h2>
        <p>More than a training program, United Blue was designed to unite and elevate accomplished wrestlers through elite training, national competition, strength and conditioning, nutrition guidance, mindset development and college recruiting support.</p>
        <p>Athletes also gained access to national camps and training environments, including the Olympic Training Center, The Compound and KD Wrestling.</p>
      </section>

      <section className="not-prose rounded-2xl bg-[#071b4b] p-6 text-white md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#D3B574]">From self to state</p>
        <p className="mt-3 text-2xl font-bold leading-9">First, you represent yourself and your family. Then your team and club. Beyond state lines, you represent our state.</p>
      </section>

      <section>
        <h2>A roster built on achievement</h2>
        <div className="not-prose grid gap-3 sm:grid-cols-2 md:grid-cols-3">{accomplishments.map((item) => <div key={item} className="rounded-xl bg-[#13294B] px-4 py-5 text-center font-bold uppercase tracking-wide text-white">{item}</div>)}</div>
        <h3>United Blue roster</h3>
        <div className="not-prose grid gap-2 sm:grid-cols-2 md:grid-cols-4">{roster.map((name) => <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{name}</div>)}</div>
      </section>

      <section>
        <h2>United Blue 2025 schedule</h2>
        <div className="not-prose overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#13294B] text-white"><tr><th className="p-3">Event</th><th className="p-3">Date</th><th className="p-3">Location</th><th className="p-3">Style</th></tr></thead><tbody>{schedule.map(([event, date, location, style]) => <tr key={event} className="border-t border-slate-200 even:bg-slate-50"><td className="p-3 font-semibold">{event}</td><td className="p-3">{date}</td><td className="p-3">{location}</td><td className="p-3">{style}</td></tr>)}</tbody></table></div>
      </section>

      <section>
        <h2>Powered by leaders in wrestling</h2>
        <p>The program was supported by North Carolina wrestling leaders including Ethan Oakley, Josh Wilson, Colton Palmer and Mike Macchiavello, along with college wrestlers from across the state. High school and club coaches were invited into the collaborative effort.</p>
        <p>A partnership with UNC Wrestling gave athletes regular access to a collegiate facility and another opportunity to normalize the training standards required for national and college competition.</p>
      </section>
    </div>
  )
}
