import type { DonorHallOfFameEntry } from "@/lib/fundraising/donor-hall-of-fame"
import { formatUsdWhole } from "./FundraisingHero"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export function DonorHallOfFame({
  individuals,
  organizations,
  minAmountCents,
}: {
  individuals: DonorHallOfFameEntry[]
  organizations: DonorHallOfFameEntry[]
  minAmountCents: number
}) {
  const showIntro = individuals.length === 0 && organizations.length === 0
  const minLabel = formatUsdWhole(minAmountCents)

  return (
    <section
      id="fundraising-donor-hall-of-fame"
      className="scroll-mt-28 border-b border-white/[0.07] bg-[#061224] px-4 py-16 sm:py-20"
      aria-labelledby="donor-hof-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            Public recognition
          </p>
          <h2
            id="donor-hof-heading"
            className={`${displayFont("mt-2 text-[clamp(1.5rem,4vw,2.25rem)] font-black uppercase tracking-tight text-white")}`}
          >
            Supporter honor roll
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/85">
            Supporters who chose <strong className="font-semibold text-white">“show my name”</strong> at checkout and
            gave <strong className="font-semibold text-white">at least {minLabel}</strong> on a single gift. Names come
            from paid Stripe checkouts only. We list the NC United campaigns where that qualifying gift ran (not dollar
            totals). Companies appear when the receipt step is marked as an organization.
          </p>
        </div>

        {showIntro ? (
          <div className="mx-auto mt-12 max-w-lg rounded-xl border border-white/10 bg-[#0B2545]/50 px-6 py-8 text-center text-sm text-white/85">
            <p>
              When someone selects <strong className="font-semibold text-white">show my name</strong> on the public list
              and completes a gift of <strong className="font-semibold text-white">{minLabel}</strong> or more,
              they&apos;ll appear here. Organization names show when the payer checks{" "}
              <strong className="font-semibold text-white">company / organization</strong> on the receipt step.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h3 className={`${displayFont("text-xs font-extrabold uppercase tracking-[0.2em] text-[#CC0000]")}`}>
                Individuals
              </h3>
              {individuals.length === 0 ? (
                <p className="mt-3 text-sm text-white/70">No individual names on file yet for this list.</p>
              ) : (
                <ul className="mt-4 columns-1 gap-x-8 text-sm sm:columns-2">
                  {individuals.map((entry) => (
                    <li key={entry.displayName} className="mb-3 break-inside-avoid">
                      <span className="font-medium text-white">{entry.displayName}</span>
                      {entry.campaigns.length > 0 ? (
                        <span className="mt-0.5 block text-xs leading-snug text-white/65">
                          {entry.campaigns.join(" · ")}
                        </span>
                      ) : null}
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
                <p className="mt-3 text-sm text-white/70">
                  Organization receipts will list here when payers mark the receipt as a company at checkout, opt in to
                  show the name publicly, and meet the {minLabel} threshold on a gift.
                </p>
              ) : (
                <ul className="mt-4 space-y-3 text-sm">
                  {organizations.map((entry) => (
                    <li key={entry.displayName}>
                      <span className="font-medium text-white">{entry.displayName}</span>
                      {entry.campaigns.length > 0 ? (
                        <span className="mt-0.5 block text-xs leading-snug text-white/65">
                          {entry.campaigns.join(" · ")}
                        </span>
                      ) : null}
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
