import Link from "next/link"

const events = [
  ["Tar Heel State Classic", "April 12, 2025", "Chapel Hill High School", "Winner"],
  ["NC State Championships", "May 3–4, 2025", "Mooresville High School", "Top two"],
  ["Southeast Regionals", "May 17–18, 2025", "Duluth, Georgia", "Top four"],
] as const

export function RoadToFargo2025NorthCarolinaGuideContent() {
  return (
    <div className="space-y-10">
      <div className="not-prose rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Archive note:</strong> This guide was published April 10, 2025. Dates, costs and qualification requirements below reflect the 2025 season.</div>

      <section><p>Freestyle and Greco-Roman wrestling are more than offseason activities. The Olympic styles sharpen hand fighting, positioning, mat awareness and explosiveness that transfer directly to folkstyle.</p><p>For serious North Carolina wrestlers, the year moved from NHSCA Nationals in late March into the spring freestyle and Greco season, then toward Fargo Nationals in July—the country&apos;s toughest high school summer tournament.</p></section>

      <section><h2>Building an Olympic-styles season</h2><ul><li><strong>April–May:</strong> Transition into freestyle and Greco technique, then compete at the Tar Heel State Classic and NC State Championships.</li><li><strong>May–June:</strong> Test progress at Southeast Regionals, find elite training partners and attend national camps.</li><li><strong>June–July:</strong> Complete specialized Fargo camps and prepare for competition in Fargo.</li></ul><p>Athletes were encouraged to choose clubs that actively supported both Olympic styles and to use Regional Training Centers when eligible.</p></section>

      <section><h2>Was Fargo the right next step?</h2><p>Fargo offered immense development value, but the 2024 freestyle results illustrated its difficulty: 14% of North Carolina entrants earned winning records, while 28% finished 0–2.</p><p>Successful athletes typically trained and competed in freestyle and Greco throughout spring and summer, had prior national competition experience, trained with elite partners and completed specialized preparation camps.</p><div className="not-prose rounded-xl bg-[#13294B] p-6 text-white"><div className="text-4xl font-black text-[#D3B574]">Nearly 3×</div><p className="mt-2 text-sm leading-6">Wrestlers who placed at Southeast Regionals performed nearly three times better at Fargo than those who did not place. The regional podium was the strongest readiness benchmark identified in the analysis.</p></div></section>

      <section><h2>2025 qualification pathway</h2><div className="not-prose overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead className="bg-[#13294B] text-white"><tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Qualification</th></tr></thead><tbody>{events.map(([event, date, location, standard]) => <tr key={event} className="border-t border-slate-200 even:bg-slate-50"><td className="px-4 py-3 font-semibold text-[#13294B]">{event}</td><td className="px-4 py-3">{date}</td><td className="px-4 py-3">{location}</td><td className="px-4 py-3 font-semibold">{standard}</td></tr>)}</tbody></table></div><p>All wrestlers were encouraged to enter all three events for competitive experience, regardless of whether they ultimately planned to attend Fargo.</p></section>

      <section><h2>Required training for North Carolina qualifiers</h2><p>Qualifiers were required to attend a two-day pre-Fargo camp immediately before departure plus either a dual-team camp and one regional day camp, or two regional day camps. Regional sessions were planned for Asheville, Charlotte, Raleigh and Jacksonville.</p></section>

      <section><h2>North Carolina success stories</h2><ul><li>Cameron Stinson Jr. — fifth, 2022 Cadet freestyle</li><li>Savoy New — eighth, 2023 Junior freestyle</li><li>Richard Treanor — second and eighth, 2018–19 Greco-Roman</li><li>Christian Decatur-Luker — sixth, 2019 Junior Greco-Roman</li><li>Bentley Sly (6–2), Jack Harty (5–2) and Mac Johnson (5–2) — leading 2024 performances</li></ul></section>

      <section><h2>2025 investment</h2><p>The team-travel package was approximately $1,900 and included airfare, hotel, training camp, coaching, transportation and team gear. A self-travel package was approximately $995, excluding airfare. The first 50 qualified athletes to register and pay a deposit were eligible for a $100 fundraiser-supported discount. Estimated optional parent travel was $1,200–$1,500.</p><p>Competition was scheduled for July 10–19, 2025, at the FargoDome in Fargo, North Dakota.</p></section>

      <section><h2>Questions to ask before committing</h2><ul><li>Have you consistently trained and competed in freestyle and Greco-Roman?</li><li>Have you tested yourself against national-level competition?</li><li>Have you placed at Southeast Regionals?</li></ul><p>For some wrestlers, investing first in Olympic-style training and regional competition could produce more value than attending Fargo prematurely.</p></section>

      <section><h2>The path forward</h2><p>North Carolina had the talent to become a national wrestling power. The pathway required year-round development, national-level experience, elite athletes representing the state and the best wrestlers training together.</p><p>For prepared athletes, Fargo offered an opportunity to develop, gain exposure and measure themselves against the country&apos;s best.</p><p><Link href="https://www.ncwrestling.org/">NC USA Wrestling</Link></p></section>
    </div>
  )
}
