function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

const STEPS = [
  {
    n: "01",
    title: "Give securely",
    body: "Stripe checkout — instant 501(c)(3) receipt emailed automatically.",
  },
  {
    n: "02",
    title: "Credit an athlete",
    body: "Search by name at checkout. The gift goes to their training fund.",
  },
  {
    n: "03",
    title: "Athlete earns",
    body: "Funds apply to approved training and competition expenses via the reimbursement system.",
  },
]

export function HowItWorks() {
  return (
    <section className="border-t border-white/[0.06] bg-[#0B2545] px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            For first-time donors
          </p>
          <h2 className={`${displayFont("mt-3 text-[clamp(1.65rem,4vw,2.35rem)] font-black uppercase tracking-tight text-white")}`}>
            How it works
          </h2>
        </div>
        <ul className="mt-12 grid gap-6 md:grid-cols-3 md:gap-5">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="relative rounded-xl border border-white/10 bg-black/25 px-6 pb-8 pt-14 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <span
                className={`${displayFont("absolute left-5 top-5 text-[3.25rem] font-black leading-none text-[#CC0000]/28")}`}
              >
                {s.n}
              </span>
              <h3 className={`${displayFont("text-base font-extrabold uppercase tracking-wide text-[#C8A94A] sm:text-lg")}`}>
                {s.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/75 sm:text-base">{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
