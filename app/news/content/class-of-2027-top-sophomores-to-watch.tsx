const prospects = [
  [1, "Jack Harty", "Northern Guilford", "Spartan Elite", "190"],
  [2, "Mac Johnson", "Cape Fear", "RAW", "120"],
  [3, "Tye Johnson", "Cape Fear", "RAW", "126"],
  [4, "Tobin McNair", "Wakefield", "RAW", "144"],
  [5, "Carson Worrick", "Alleghany", "Combat", "150"],
  [6, "Holt Quincy", "North East Carolina Prep", "RAW", "113"],
  [7, "Aidan Gore", "Garner Magnet", "RAW", "157"],
  [8, "Tyton Kostoff", "Hough", "Darkhorse", "132"],
  [9, "Ayden Sumners", "Wheatmore", "RAW", "126"],
  [10, "Aidan Szewcyk", "Davie", "Combat", "120"],
] as const

export function ClassOf2027TopSophomoresToWatchContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>
          NC United&apos;s Top Sophomores to Watch for the Class of 2027 highlighted North Carolina&apos;s rising wrestling
          talent, recognizing athletes who had already made an impact on the mat. The list served as a resource for
          college coaches and wrestling fans while showcasing the state&apos;s next wave of standout wrestlers.
        </p>
      </section>

      <section>
        <h2>How the Prospects Were Evaluated</h2>
        <p>The NC United Prospect Rankings focused on athletes who showed exceptional promise through:</p>
        <ul>
          <li>
            <strong>College open participation:</strong> Age-appropriate participation and success offered an early
            indication of readiness for college-level competition.
          </li>
          <li>
            <strong>National competition:</strong> Results from NHSCA Nationals, Super 32, Fargo, Journeymen and Ultimate
            Club Duals helped identify wrestlers performing against elite fields.
          </li>
          <li>
            <strong>Wins over nationally ranked opponents:</strong> Quality victories demonstrated an athlete&apos;s ability
            to compete with established national talent.
          </li>
          <li>
            <strong>High school performance:</strong> Strong in-season results against difficult competition remained a
            key measure of future potential.
          </li>
        </ul>
        <p>
          The rankings reflected the dedication and talent of wrestlers across North Carolina and provided college
          coaches with early insight into the state&apos;s young prospects.
        </p>
      </section>

      <section>
        <h2>NC United&apos;s Top Sophomores to Watch — Class of 2027</h2>
        <p>
          These wrestlers stood out through performances at state championships, NHSCA Nationals, Fargo, Super 32 and
          other major tournaments.
        </p>
        <div className="not-prose overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[680px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#13294B] text-white">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Wrestler</th>
                <th className="px-4 py-3">High School</th>
                <th className="px-4 py-3">Club</th>
                <th className="px-4 py-3">Weight</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map(([rank, name, school, club, weight]) => (
                <tr key={rank} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-[#13294B]">{rank}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{name}</td>
                  <td className="px-4 py-3 text-slate-700">{school}</td>
                  <td className="px-4 py-3 text-slate-700">{club}</td>
                  <td className="px-4 py-3 text-slate-700">{weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Stay Connected</h2>
        <p>
          NC United continued following the progress of these wrestlers through rankings, results and recruiting
          coverage as they advanced through their high school careers.
        </p>
      </section>
    </div>
  )
}
