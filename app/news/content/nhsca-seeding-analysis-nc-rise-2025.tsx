const seededByDivision = [
  ["Senior Boys", 8, 8, "0"],
  ["Junior Boys", 2, 3, "+1"],
  ["Sophomore Boys", 6, 6, "0"],
  ["Freshman Boys", 0, 4, "+4"],
  ["Girls", 2, 8, "+6"],
  ["Total high school", 18, 29, "+11"],
] as const

const topFiveByDivision = [
  ["Senior Boys", 3, 4, "+1"],
  ["Junior Boys", 0, 2, "+2"],
  ["Sophomore Boys", 3, 2, "−1"],
  ["Freshman Boys", 0, 3, "+3"],
  ["Girls", 1, 4, "+3"],
  ["Total high school", 7, 15, "+8"],
] as const

const progressions = [
  ["Cooper Foster", "2024 Junior: No. 8 at 106", "2025 Senior: No. 4 at 113"],
  ["Bentley Sly", "2024 Sophomore: No. 13 at 132", "2025 Junior: No. 5 at 138"],
  ["Lorenzo Alston", "2024 Sophomore: No. 2 at 145", "2025 Junior: No. 3 at 145"],
  ["Faith Bane", "2024 Girls: No. 7 at 145", "2025 Girls: No. 2 at 145"],
  ["Carson Raper", "2024 Middle School: No. 7 at 80", "2025 Middle School: No. 3 at 100"],
  ["Mason Brown", "2024 Middle School: No. 6 at 90", "2025 Middle School: No. 3 at 105"],
] as const

function ComparisonTable({ rows }: { rows: readonly (readonly [string, number, number, string])[] }) {
  return (
    <div className="not-prose overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead className="bg-[#13294B] text-white"><tr><th className="px-4 py-3">Division</th><th className="px-4 py-3">2024</th><th className="px-4 py-3">2025</th><th className="px-4 py-3">Change</th></tr></thead>
        <tbody>{rows.map(([division, prior, current, change]) => <tr key={division} className="border-t border-slate-200 even:bg-slate-50"><td className="px-4 py-3 font-semibold text-[#13294B]">{division}</td><td className="px-4 py-3">{prior}</td><td className="px-4 py-3">{current}</td><td className="px-4 py-3 font-bold">{change}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

export function NhscaSeedingAnalysisNcRise2025Content() {
  return (
    <div className="space-y-10">
      <section>
        <p>Released seeds for the 2025 NHSCA Nationals offered measurable evidence that North Carolina wrestling was gaining national ground. The state increased both the number of seeded high school wrestlers and the number positioned among the top five.</p>
        <p>Coming after similar progress at Super 32, the results suggested a broader pattern of development rather than a single-tournament spike.</p>
      </section>

      <section><h2>The numbers tell the story</h2><p>North Carolina grew from 18 seeded high school wrestlers in 2024 to 29 in 2025—a 61% increase.</p><ComparisonTable rows={seededByDivision} /></section>
      <section><h2>More wrestlers positioned to contend</h2><p>The number of top-five seeds more than doubled, from seven to 15. That measure provided an even stronger signal of elite development because it placed more North Carolina wrestlers in favorable position to pursue All-America honors.</p><ComparisonTable rows={topFiveByDivision} /></section>

      <section>
        <h2>Returning All-Americans</h2>
        <p>Lorenzo Alston returned after placing third and entered as the No. 3 Junior seed at 145. Jack Harty, fourth in 2024, drew the No. 4 Sophomore seed at 182. Faith Bane rose from the No. 7 seed and a fifth-place finish to No. 2 at 145 in the Girls division.</p>
        <p>Liam Hickey, Cooper Foster, Keyshon Morrison and Bentley Sly also returned with podium experience, giving North Carolina proven national competitors across multiple divisions.</p>
      </section>

      <section>
        <h2>Girls wrestling led the growth</h2>
        <p>North Carolina increased from two seeded girls in 2024 to eight in 2025, while its number of top-five seeds rose from one to four. Along with Bane, Moriah Antis, Stephanie Diaz Mendoza and Daniella Jenkins entered with top-five seeds and legitimate podium opportunities.</p>
      </section>

      <section>
        <h2>A stronger pipeline</h2>
        <p>Ten middle school wrestlers received seeds, including six in the top five. Bowen Lefler held North Carolina&apos;s highest overall seed at No. 1 at 80 pounds. Four freshman boys were seeded after none were seeded in 2024, led by Ryan Thompson, Easten Binckley and Mitchell Rowland.</p>
        <p>The Senior division also showed depth. Liam Hickey, Cooper Foster, Hayden Haynes and Damien Couture each earned a top-five seed, while Brock Sullivan and Sebastian Rivera entered at No. 6.</p>
      </section>

      <section>
        <h2>Year-over-year progress</h2>
        <div className="not-prose grid gap-3 md:grid-cols-2">{progressions.map(([name, prior, current]) => <article key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-bold text-[#13294B]">{name}</h3><p className="mt-2 text-sm text-slate-600">{prior}</p><p className="text-sm font-semibold text-slate-900">{current}</p></article>)}</div>
        <p>Brady Donovan, Kane Bryson, Brock Sullivan, Hayden Haynes, Damien Couture, Sebastian Rivera and Gabe Rogers also moved from unseeded in 2024 to seeded in 2025, demonstrating greater depth across the state.</p>
      </section>

      <section>
        <h2>From seeds to results</h2>
        <p>North Carolina produced 17 NHSCA All-Americans in 2024. With 29 seeded high school wrestlers in 2025—including 15 in the top five—the state entered Virginia Beach with an opportunity to improve on that total.</p>
        <p>Seeds represented opportunity, not achievement. The next test came March 28–30, when 39 seeded North Carolina wrestlers took the mat and attempted to turn national recognition into podium finishes.</p>
      </section>
    </div>
  )
}
