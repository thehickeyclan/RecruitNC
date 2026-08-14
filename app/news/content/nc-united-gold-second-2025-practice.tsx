const technicalFocus = [
  "Executing lifts and throws from comfortable positions",
  "Breaking down the quad-pod defensive base",
  "Transitioning into gut wrenches from par terre",
  "Using momentum and position to convert pressure into points",
] as const

export function NcUnitedGoldSecond2025PracticeContent() {
  return (
    <div className="space-y-10">
      <section><p>NC State University hosted NC United Gold&apos;s second official 2025 training session on Saturday, May 10, bringing new athletes and established college mentors together for high-level women&apos;s freestyle work.</p><p>The practice continued building the program&apos;s role as a statewide development hub centered on instruction, intensity and community.</p></section>

      <section><h2>Training that elevated the standard</h2><p>Coaches focused on freestyle scoring criteria and the mechanics athletes needed to succeed at national events.</p><ul>{technicalFocus.map((focus) => <li key={focus}>{focus}</li>)}</ul><p>The session concluded with a live par-terre wheel, rotating wrestlers through high-pressure ground-position matches and testing their technique under fatigue.</p></section>

      <section><h2>Six new athletes raised the level</h2><p>Six newcomers—including multiple North Carolina high school champions and finalists—participated in NC United Gold for the first time.</p><p>Among them was Tonya Flournory, a 2023 USMC Women&apos;s Nationals All-American and UNC Pembroke wrestler. Flournory also brought experience as an Academic All-American, certified North Carolina referee and Hoke County coach.</p></section>

      <section><h2>College leaders returned</h2><div className="not-prose grid gap-4 md:grid-cols-2"><article className="rounded-xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-bold text-[#13294B]">Kyra Tomlinson</h3><p className="mt-2 text-sm leading-6 text-slate-700">The NCAA qualifier, Academic All-American and active referee shared both technical knowledge and a deeper understanding of freestyle rules.</p></article><article className="rounded-xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-bold text-[#13294B]">Genesis Chinchilla</h3><p className="mt-2 text-sm leading-6 text-slate-700">The two-year collegiate starter brought toughness, tactical awareness and urgency to every drill.</p></article></div><p>Together, the returning leaders embodied NC United&apos;s core philosophy: iron sharpens iron.</p></section>

      <section><h2>Building a stronger wrestling ecosystem</h2><ul><li><strong>Participation:</strong> New middle and high school athletes deepened the statewide talent pool.</li><li><strong>Development:</strong> The practice provided national-level freestyle training that had previously been difficult to access.</li><li><strong>Mentorship:</strong> College wrestlers and certified officials reinvested their experience in younger athletes.</li><li><strong>College connections:</strong> Training at NC State exposed athletes to the next level and connected universities with homegrown talent.</li></ul></section>

      <section><h2>Momentum built</h2><p>State champions, collegiate role models and structured freestyle instruction reinforced that NC United Gold was becoming more than a training group. It was creating a sustainable pathway for North Carolina women wrestlers.</p><p>Consistent high-intensity sessions gave athletes clearer goals, helped coaches refine instruction, provided colleges with better-prepared recruits and showed families a supported route from youth competition to national and collegiate opportunities.</p></section>
    </div>
  )
}
