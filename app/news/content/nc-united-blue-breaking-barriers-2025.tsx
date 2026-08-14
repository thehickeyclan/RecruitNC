const performance = [
  ["60%", "won a state title"],
  ["80%", "reached the finals"],
  ["100%", "placed on the podium"],
] as const

const resume = ["41 state championships", "106 state placements", "27 state champions", "46 state placers", "7 All-American honors", "1 World Team member", "1 Super 32 All-American honor", "9 college commitments"]

const newMembers = [
  ["Elii Taylor", "100", "Middle School", "—"], ["Sam Boltes", "106", "Washington", "Sophomore"], ["Aiden Burkholder", "106", "Trinity", "Sophomore"], ["Adam Walker", "106", "Middle School", "—"], ["Jaxon Thomas", "106", "Piedmont", "Sophomore"], ["Ayden Summners", "126", "Wheatmore", "Sophomore"], ["Aiden White", "126", "Weddington", "Sophomore"], ["Jake Amiott", "126", "Topsail", "Freshman"], ["David Lambright", "126", "Eastern Randolph", "Junior"], ["Bryce Perry", "132", "Washington", "Sophomore"], ["Austin Green", "138", "Mooresville", "Junior"], ["Mitchell Rowland", "144", "Pinecrest", "Freshman"], ["Aaron Ellisson", "144", "Lumberton", "Freshman"], ["Jacob Perry", "150", "Newbern", "Freshman"], ["Ryan Thompson", "165", "Cardinal Gibbons", "Freshman"],
] as const

export function NcUnitedBlueBreakingBarriers2025Content() {
  return (
    <div className="space-y-10">
      <section><p className="text-xl font-semibold text-[#13294B]">NC United Blue continued uniting North Carolina&apos;s top high school talent around elite training, national competition and a shared commitment to represent the state.</p><p>The program&apos;s mission was to foster excellence, create collegiate opportunities and help elevate North Carolina into the nation&apos;s top tier of wrestling states.</p></section>

      <section><h2>More than a training program</h2><p>United Blue combined a competitive practice environment with national events, strength and conditioning, nutrition and weight-management guidance, mindset development and college recruiting support. Athletes also gained access to national camps and facilities such as the Olympic Training Center, The Compound and KD Wrestling.</p></section>

      <section className="not-prose rounded-2xl bg-[#071b4b] p-6 text-white md:p-8"><p className="text-sm font-black uppercase tracking-[0.2em] text-[#D3B574]">From self to state</p><p className="mt-3 text-2xl font-bold leading-9">First, you represent yourself and your family. Then your team and club. Beyond state lines, you represent our state.</p></section>

      <section><h2>A dominant state-tournament performance</h2><div className="not-prose grid gap-4 sm:grid-cols-3">{performance.map(([value, label]) => <div key={value} className="rounded-xl bg-[#13294B] p-5 text-center text-white"><div className="text-4xl font-black text-[#D3B574]">{value}</div><div className="mt-2 font-bold uppercase tracking-wide">{label}</div></div>)}</div><p>The results reflected the caliber of the established roster and the standard being built within the program.</p></section>

      <section><h2>Building for the future</h2><p>Graduating seniors remained part of the spring and summer training cycle as competitors and mentors while the program welcomed its next group of athletes. The additions brought six state championships and 18 state placements to the room.</p><div className="not-prose overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[#13294B] text-white"><tr><th className="p-3">Athlete</th><th className="p-3">Weight</th><th className="p-3">School</th><th className="p-3">Class</th></tr></thead><tbody>{newMembers.map(([name, weight, school, year]) => <tr key={name} className="border-t border-slate-200 even:bg-slate-50"><td className="p-3 font-semibold">{name}</td><td className="p-3">{weight}</td><td className="p-3">{school}</td><td className="p-3">{year}</td></tr>)}</tbody></table></div></section>

      <section><h2>A roster that spoke to excellence</h2><div className="not-prose grid gap-3 sm:grid-cols-2 md:grid-cols-4">{resume.map((item) => <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center font-bold uppercase tracking-wide text-[#13294B]">{item}</div>)}</div></section>

      <section><h2>Powered by wrestling leaders</h2><p>Ethan Oakley, Josh Wilson, Colton Palmer and Mike Macchiavello joined college wrestlers from across North Carolina in providing mentorship and technical leadership. Through its partnership with UNC Wrestling, United Blue athletes also trained regularly in a collegiate facility and experienced the expectations of the next level.</p><p>The goal remained clear: build North Carolina&apos;s wrestling legacy one champion—and one opportunity—at a time.</p></section>
    </div>
  )
}
