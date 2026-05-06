import {
  formatUsdFromCents,
  mergeDonorHallOfFameRanked,
  type DonorHallOfFameEntry,
} from "@/lib/fundraising/donor-hall-of-fame"

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
  const ranked = mergeDonorHallOfFameRanked(individuals, organizations)
  const minLabel = formatUsdFromCents(minAmountCents)
  const empty = ranked.length === 0

  return (
    <section
      id="fundraising-donor-hall-of-fame"
      className="scroll-mt-28 border-b border-white/[0.07] bg-[#061224] px-4 py-16 sm:py-20"
      aria-labelledby="donor-hof-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            Thank you
          </p>
          <h2
            id="donor-hof-heading"
            className={`${displayFont("mt-2 text-[clamp(1.5rem,4vw,2.25rem)] font-black uppercase tracking-tight text-white")}`}
          >
            Top donors
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/85">
            Supporters who chose <strong className="font-semibold text-white">&ldquo;show my name&rdquo;</strong> at checkout. Amounts are{" "}
            <strong className="font-semibold text-white">totals</strong> across qualifying paid gifts (matched by email when available). Anyone at{" "}
            <strong className="font-semibold text-white">{minLabel}</strong> or above is listed, ranked highest to lowest. Campaign shows NC United
            drives those gifts ran through. Companies appear when the payer used the organization path at checkout.
          </p>
        </div>

        {empty ? (
          <div className="mx-auto mt-12 max-w-lg rounded-xl border border-white/10 bg-[#0B2545]/50 px-6 py-8 text-center text-sm text-white/85">
            <p>
              When someone selects <strong className="font-semibold text-white">show my name</strong> on the public list and their combined paid gifts
              reach <strong className="font-semibold text-white">{minLabel}</strong>, they&apos;ll appear here. Organization names show when the payer
              marks <strong className="font-semibold text-white">company / organization</strong> on the receipt step.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-12 space-y-3 md:hidden" aria-label="Top donors ranked by total giving">
              {ranked.map((row, idx) => (
                <li
                  key={`${row.payerKind}-${row.aggregateKey}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="tabular-nums text-lg text-white/55">{idx + 1}</span>
                    <span className={`${displayFont("text-lg font-black tabular-nums text-[#C8A94A]")}`}>
                      {formatUsdFromCents(row.totalAmountCents)}
                    </span>
                  </div>
                  <p className={`${displayFont("mt-3 font-bold leading-snug text-white")}`}>{row.displayName}</p>
                  <span
                    className={`${displayFont(
                      "mt-2 inline-flex rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white/75",
                    )}`}
                  >
                    {row.payerKind === "organization" ? "Organization" : "Individual"}
                  </span>
                  <p className="mt-3 text-xs leading-relaxed text-white/65">
                    <span className="font-semibold text-white/50">Campaign: </span>
                    {row.campaigns.length > 0 ? row.campaigns.join(" · ") : "—"}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-12 hidden overflow-x-auto rounded-lg border border-white/10 bg-black/20 md:block">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/15 bg-white/[0.06]">
                  <th
                    scope="col"
                    className={`${displayFont("whitespace-nowrap px-3 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C8A94A] sm:px-4")}`}
                  >
                    Rank
                  </th>
                  <th
                    scope="col"
                    className={`${displayFont("px-3 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C8A94A] sm:px-4")}`}
                  >
                    Donor
                  </th>
                  <th
                    scope="col"
                    className={`${displayFont("whitespace-nowrap px-3 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C8A94A] sm:px-4")}`}
                  >
                    Total
                  </th>
                  <th
                    scope="col"
                    className={`${displayFont("hidden px-3 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C8A94A] md:table-cell sm:px-4")}`}
                  >
                    Campaign
                  </th>
                </tr>
                </thead>
              <tbody>
                {ranked.map((row, idx) => (
                  <tr
                    key={`${row.payerKind}-${row.aggregateKey}`}
                    className="border-b border-white/[0.07] last:border-b-0 hover:bg-white/[0.04]"
                  >
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-white/55 sm:px-4">{idx + 1}</td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className={`${displayFont("font-bold text-white")}`}>{row.displayName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`${displayFont(
                            "rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white/75",
                          )}`}
                        >
                          {row.payerKind === "organization" ? "Organization" : "Individual"}
                        </span>
                        <span className={`${displayFont("md:hidden text-[10px] font-semibold uppercase tracking-wide text-white/45")}`}>
                          {row.campaigns.length > 0 ? row.campaigns.join(" · ") : "—"}
                        </span>
                      </div>
                    </td>
                    <td className={`${displayFont("whitespace-nowrap px-3 py-3 tabular-nums font-black text-[#C8A94A] sm:px-4")}`}>
                      {formatUsdFromCents(row.totalAmountCents)}
                    </td>
                    <td className="hidden px-3 py-3 text-white/75 md:table-cell sm:px-4">
                      {row.campaigns.length > 0 ? row.campaigns.join(" · ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
