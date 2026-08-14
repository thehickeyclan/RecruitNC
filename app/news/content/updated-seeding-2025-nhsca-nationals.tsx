const divisions = [
  {
    title: "Senior athletes",
    rows: [["113", "13", "Brady Donovan"], ["120", "7", "Kane Bryson"], ["126", "4", "Liam Hickey"], ["160", "16", "Nathan McCartney"], ["170", "7", "Colt Campbell"], ["182", "8", "Brock Sullivan"], ["220", "4", "Hayden Haynes"], ["285", "4", "Sebastian Rivera"], ["285", "6", "Damien Couture"]],
  },
  {
    title: "Junior athletes",
    rows: [["120", "7", "Gabe Rogers"], ["138", "6", "Bentley Sly"], ["145", "2", "Lorenzo Alston"]],
  },
  {
    title: "Sophomore athletes",
    rows: [["120", "14", "Ayden Sumners"], ["126", "18", "Tye Johnson"], ["138", "11", "Joshua Stonebraker"], ["182", "4", "Jack Harty"], ["220", "6", "Keyshon Morrison"], ["220", "12", "Connor Brinkley"]],
  },
  {
    title: "Freshman athletes",
    rows: [["132", "4", "Mitchell Rowland"], ["170", "4", "Ryan Thompson"], ["170", "5", "Easten Binckley"], ["220", "5", "Aaron Ruiz-Angel"]],
  },
  {
    title: "Girls",
    rows: [["107", "10", "Khiry Reese"], ["114", "12", "Addison Gore"], ["138", "4", "Moriah Antis"], ["145", "2", "Faith Bane"], ["152", "5", "Stephanie Diaz Mendoza"], ["152", "6", "Taylor Williams"], ["152", "8", "Kaylah Evans"], ["235", "4", "Daniella Jenkins"]],
  },
  {
    title: "Middle school athletes",
    rows: [["75", "6", "Benex Velasco"], ["80", "1", "Bowen Lefler"], ["85", "5", "Braylon Butts"], ["95", "3", "Carson Raper"], ["95", "6", "Elias Taylor"], ["100", "2", "Mason Brown"], ["100", "5", "Cade Riddle"], ["100", "12", "Daniel McDermott"], ["105", "7", "Brandon Lefler"], ["135", "8", "Steven Faubion"]],
  },
] as const

export function UpdatedSeeding2025NhscaNationalsContent() {
  return (
    <div className="space-y-10">
      <section>
        <p>The seeds were set. NHSCA Nationals released updated brackets, and several North Carolina athletes secured spots among the top contenders. Below is the updated list of seeded North Carolina wrestlers heading into the tournament.</p>
      </section>

      {divisions.map((division) => (
        <section key={division.title}>
          <h2>{division.title}: {division.rows.length}</h2>
          <div className="not-prose overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[460px] border-collapse text-left text-sm">
              <thead className="bg-[#13294B] text-white"><tr><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Seed</th><th className="px-4 py-3">Athlete</th></tr></thead>
              <tbody>{division.rows.map(([weight, seed, name]) => <tr key={`${weight}-${seed}-${name}`} className="border-t border-slate-200 even:bg-slate-50"><td className="px-4 py-3 font-semibold text-[#13294B]">{weight}</td><td className="px-4 py-3 font-bold">No. {seed}</td><td className="px-4 py-3">{name}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
