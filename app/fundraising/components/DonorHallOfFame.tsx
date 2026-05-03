function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export function DonorHallOfFame({
  individuals,
  organizations,
}: {
  individuals: string[]
  organizations: string[]
}) {
  const showIntro = individuals.length === 0 && organizations.length === 0

  return (
    <section
      id="fundraising-donor-hall-of-fame"
      className="scroll-mt-28 border-b border-white/[0.07] bg-[#061224] px-4 py-16 sm:py-20"
      aria-labelledby="donor-hof-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            Honor roll
          </p>
          <h2
            id="donor-hof-heading"
            className={`${displayFont("mt-2 text-[clamp(1.5rem,4vw,2.25rem)] font-black uppercase tracking-tight text-white")}`}
          >
            Donor hall of fame
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/58">
            Supporters who chose <strong className="text-white/75">“show my name”</strong> at checkout. Names come from paid
            Stripe gifts only — no amounts listed here. Companies appear when the receipt is marked as an organization at
            checkout.
          </p>
        </div>

        {showIntro ? (
          <div className="mx-auto mt-12 max-w-lg rounded-xl border border-white/10 bg-[#0B2545]/50 px-6 py-8 text-center text-sm text-white/60">
            <p>
              When donors select <strong className="text-white/80">show my name</strong> on the public list, they&apos;ll
              appear here automatically. Organization names show up when the payer checks{" "}
              <strong className="text-white/80">company / organization</strong> on the receipt step.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h3 className={`${displayFont("text-xs font-extrabold uppercase tracking-[0.2em] text-[#CC0000]")}`}>
                Individuals
              </h3>
              {individuals.length === 0 ? (
                <p className="mt-3 text-sm text-white/45">No individual names on file yet for this list.</p>
              ) : (
                <ul className="mt-4 columns-1 gap-x-8 text-sm sm:columns-2">
                  {individuals.map((name) => (
                    <li key={name} className="mb-2 break-inside-avoid text-white/85">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className={`${displayFont("text-xs font-extrabold uppercase tracking-[0.2em] text-[#CC0000]")}`}>
                Companies &amp; organizations
              </h3>
              {organizations.length === 0 ? (
                <p className="mt-3 text-sm text-white/45">
                  Organization receipts will list here when payers mark the receipt as a company at checkout.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {organizations.map((name) => (
                    <li key={name} className="text-white/85">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
