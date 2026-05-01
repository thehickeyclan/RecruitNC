function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

const STEPS = [
  {
    n: "01",
    title: "Give securely",
    body: "Stripe checkout — instant 501(c)(3) receipt emailed.",
  },
  {
    n: "02",
    title: "Credit an athlete",
    body: "Search by name at checkout; the gift goes to their training fund.",
  },
  {
    n: "03",
    title: "Athlete earns",
    body: "Funds apply to approved training and competition expenses via the reimbursement system.",
  },
]

export function HowItWorks() {
  return (
    <section className="border-t border-white/[0.06] bg-[#0B2545] px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={`${displayFont("text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            Playbook
          </p>
          <h2
            className={`${displayFont("mt-3 text-[clamp(1.85rem,4.5vw,2.65rem)] font-black uppercase tracking-tight text-white")}`}
          >
            How it works
          </h2>
        </div>
        <ul className="mt-16 grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="relative rounded-xl border border-white/10 bg-black/25 px-6 pb-8 pt-14 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <span
                className={`${displayFont("absolute left-5 top-5 text-[3.5rem] font-black leading-none text-[#CC0000]/30")}`}
              >
                {s.n}
              </span>
              <h3 className={`${displayFont("text-lg font-extrabold uppercase tracking-wide text-[#C8A94A]")}`}>
                {s.title}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-white/75">{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
