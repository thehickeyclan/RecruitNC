import Image from "next/image"

const veterans = ["Bentley Sly", "Carson Raper", "Eli Taylor", "Tobin McNair", "Jack Harty", "Mac Johnson"]
const newcomers = ["Gavin Lopez", "Jacob Perry", "Sam Harper", "Aiden White", "Jekai Sedgwick", "Jaxon Thomas", "Aaron Ellison", "Braylon Butts", "Blayden Thompson"]

export function NcUnitedCompetitiveIdentityUcd2025Content() {
  return (
    <div className="space-y-10">
      <section>
        <p><strong>SEPTEMBER 25, 2025 —</strong> NC United completed its 2025 Ultimate Club Duals campaign with a 7–2 record, establishing itself among the nation&apos;s competitive youth wrestling programs.</p>
        <p>The team defeated Roundtree, Michigan Premier Red, Virginia Predators, DoughBoy, Gold Medal, M2 and Outsiders. Its only losses were a 30–30 criteria decision to eventual champion Michigan Premier Blue and a narrow defeat to 4M.</p>
      </section>

      <section>
        <h2>Building on the foundation</h2>
        <p>The move from a pools-and-bracket format in 2024 to a full round-robin in 2025 required consistent performance against every opponent. NC United responded by raising its dual win rate from 71 percent to 78 percent and its individual win rate from 58.1 percent to 69.6 percent.</p>
        <figure className="not-prose mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white"><Image src="/images/news/legacy/nc-united-ucd-2025/2024-2025-comparison.png" alt="Comparison of NC United's 2024 and 2025 Ultimate Club Duals results" width={1536} height={553} className="h-auto w-full" /></figure>
        <figure className="not-prose mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white"><Image src="/images/news/legacy/nc-united-ucd-2025/2025-performance-summary.png" alt="NC United 2025 performance summary showing team and individual win rates" width={1646} height={314} className="h-auto w-full" /></figure>
      </section>

      <section>
        <h2>Veterans lead the charge</h2>
        <p>Six athletes returned from the 2024 roster, bringing experience and composure to critical matches. Bentley Sly and Jack Harty finished undefeated, while Mac Johnson delivered timely bonus points. Tobin McNair, Carson Raper and Eli Taylor added strong winning records throughout the lineup.</p>
        <div className="not-prose flex flex-wrap gap-2">{veterans.map((name) => <span key={name} className="rounded-full bg-[#13294B] px-3 py-1.5 text-sm font-bold text-white">{name}</span>)}</div>
      </section>

      <section>
        <h2>Newcomers step up</h2>
        <p>First-year team members added immediate production and important depth. Gavin Lopez and Jacob Perry emerged as dependable scorers. Sam Harper, Aiden White and Jekai Sedgwick brought prior NHSCA Duals experience, while Jaxon Thomas, Aaron Ellison, Braylon Butts and Blayden Thompson gained valuable national-level exposure.</p>
        <div className="not-prose flex flex-wrap gap-2">{newcomers.map((name) => <span key={name} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">{name}</span>)}</div>
      </section>

      <section>
        <h2>Building beyond the wins</h2>
        <p>National duals served as both proving grounds and development platforms. Close battles exposed the fine margins at the top of the sport, while victories over respected programs strengthened confidence and North Carolina&apos;s national reputation.</p>
        <p>The combination of veteran leadership and productive newcomers showed that the program was building sustainable depth rather than relying on a handful of stars.</p>
      </section>

      <section className="not-prose rounded-2xl bg-[#17106d] p-6 text-white md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">The trajectory</p>
        <p className="mt-3 text-xl font-semibold leading-8">NC United was building sustainable success—grounded in results, strengthened by culture and driven by a vision for the future of North Carolina wrestling.</p>
      </section>
    </div>
  )
}
