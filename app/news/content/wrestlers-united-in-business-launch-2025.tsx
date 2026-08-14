const placements = [
  ["Securiti.ai", "Isaias Estrada", "Colorado", "Business Development Representative · Full time"],
  ["Securiti.ai", "Joe Roberts", "Illinois", "Business Development Representative · Full time"],
  ["Securiti.ai", "Ethan Oakley", "North Carolina", "Go-to-Market Intern · Strategy and market positioning"],
  ["Securiti.ai", "Jayden Scott", "New York", "Go-to-Market Intern · Strategy and market positioning"],
  ["MaxIQ.ai", "Sabino Portella", "New Jersey", "Revenue Operations Intern · Analytics, customer insights and product testing"],
  ["MaxIQ.ai", "Cullen Kane", "Georgia", "Revenue Operations Intern · Analytics, customer insights and product testing"],
  ["MaxIQ.ai", "Nolan Neeves", "Ohio", "Revenue Operations Intern · Analytics, customer insights and product testing"],
] as const

export function WrestlersUnitedInBusinessLaunch2025Content() {
  return (
    <div className="space-y-10">
      <section><p>NC Wrestling United launched Wrestlers United in Business, a statewide initiative designed to bridge college wrestling and professional careers through internships, mentorship and full-time roles in North Carolina&apos;s business and technology sectors.</p><p>The initiative expanded athlete development beyond competition, recognizing that wrestling builds disciplined, resilient people prepared to lead and contribute in a demanding economy.</p></section>

      <section><h2>Wrestling developed business-ready talent</h2><p>Wrestlers learn to perform under pressure, remain disciplined through adversity and pursue constant improvement. Wrestlers United in Business gave athletes a way to apply that same competitive mindset to solving problems, creating value and driving outcomes for growing companies.</p></section>

      <section><h2>A bridge between athletics and industry</h2><ul><li>Internships and early-career positions at high-growth companies</li><li>Mentorship and coaching from experienced business leaders</li><li>Long-term career pathways rooted in North Carolina</li></ul><p>Although participating athletes came from several states, the program aimed to help them launch careers, build roots and reinvest in the North Carolina communities that supported their college experience.</p></section>

      <section><h2>Summer 2025 athlete placements</h2><div className="not-prose grid gap-4 md:grid-cols-2">{placements.map(([company, name, home, role]) => <article key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><div className="text-xs font-black uppercase tracking-[0.16em] text-[#C20017]">{company}</div><h3 className="mt-2 font-bold text-[#13294B]">{name}</h3><p className="mt-1 text-sm text-slate-500">{home}</p><p className="mt-2 text-sm leading-6 text-slate-700">{role}</p></article>)}</div><p><strong>Securiti.ai</strong> developed AI-driven data security and governance technology for privacy, compliance and multi-cloud risk management. <strong>MaxIQ.ai</strong>, based in North Carolina and backed by Dell Technologies Capital and Intel Capital, built revenue-intelligence tools for go-to-market teams.</p></section>

      <section><h2>Shared value across North Carolina</h2><ul><li><strong>College programs</strong> gained another resource for holistic athlete development.</li><li><strong>Employers</strong> gained access to coachable, driven and high-performing talent.</li><li><strong>North Carolina</strong> developed future leaders grounded in discipline, loyalty and community.</li></ul></section>

      <section><h2>From competition to contribution</h2><p>The long-term vision was an ecosystem in which wrestlers succeeded in college, built meaningful careers and returned as mentors for the next generation.</p><p>NC Wrestling United invited business leaders, coaches, alumni and supporters to mentor, hire or sponsor wrestlers and help expand the pathway across the state.</p></section>
    </div>
  )
}
