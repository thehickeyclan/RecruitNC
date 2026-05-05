function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

const STEPS = [
  {
    n: "01",
    title: "Give securely",
    body: "Complete checkout on Stripe. When your gift qualifies, documentation arrives by email.",
  },
  {
    n: "02",
    title: "Choose who to support",
    body: "Pick a wrestler by name or give to the NC United Training Fund—your choice at checkout.",
  },
  {
    n: "03",
    title: "Support shows up for athletes",
    body: "Credited gifts count toward approved training and competition costs through NC United’s reimbursement process.",
  },
] as const

export function HowItWorks() {
  return (
    <section
      id="fundraising-how-it-works"
      className="border-b border-white/[0.06] bg-[#061224] px-4 py-12 text-white sm:py-16"
      aria-labelledby="fundraising-how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            New here
          </p>
          <h2
            id="fundraising-how-it-works-heading"
            className={`${displayFont("text-[clamp(1.35rem,3.5vw,1.85rem)] font-black uppercase tracking-tight text-white")}`}
          >
            How giving works
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-white/70 sm:mx-0">
            Three steps from checkout to the athlete or program you intended—before you scroll campaigns and leaderboards.
          </p>
        </div>

        <ol className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="flex gap-4 rounded-xl border border-white/10 bg-[#0B2545]/45 px-4 py-5 sm:flex-col sm:gap-3 sm:px-5 sm:py-6"
            >
              <span
                className={`${displayFont("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#C8A94A]/35 bg-[#CC0000]/12 text-sm font-black tabular-nums text-[#C8A94A]")}`}
                aria-hidden
              >
                {s.n}
              </span>
              <div className="min-w-0">
                <h3 className={`${displayFont("text-sm font-extrabold uppercase tracking-wide text-white sm:text-base")}`}>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
