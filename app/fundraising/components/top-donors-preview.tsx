import {
  formatUsdFromCents,
  mergeDonorHallOfFameRanked,
  type DonorHallOfFameEntry,
} from "@/lib/fundraising/donor-hall-of-fame"
import { HardLink } from "@/components/hard-link"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

const HUB_PREVIEW_MAX_ROWS = 35

export function TopDonorsPreview({
  individuals,
  organizations,
  minAmountCents,
}: {
  individuals: DonorHallOfFameEntry[]
  organizations: DonorHallOfFameEntry[]
  minAmountCents: number
}) {
  const ranked = mergeDonorHallOfFameRanked(individuals, organizations)
  const previewRows = ranked.slice(0, HUB_PREVIEW_MAX_ROWS)
  const minLabel = formatUsdFromCents(minAmountCents)
  const truncated = ranked.length > HUB_PREVIEW_MAX_ROWS

  return (
    <section
      id="fundraising-top-donors"
      className="scroll-mt-28 border-b border-white/[0.06] bg-[#0B2545] px-4 py-16 text-white sm:py-20"
      aria-labelledby="fundraising-top-donors-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            Thank you
          </p>
          <h2
            id="fundraising-top-donors-heading"
            className={`${displayFont("mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl")}`}
          >
            Top donors
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/85">
            Paid hub gifts where the supporter chose <strong className="font-semibold text-white">&ldquo;show my name&rdquo;</strong> at checkout.
            Totals are summed per supporter (matched by email when Stripe provides it). Listed when lifetime giving on those opt-in checkouts reaches{" "}
            <strong className="font-semibold text-white">{minLabel}</strong> or more — ranked by amount. Campaign shows where those gifts were attributed.
          </p>
        </div>

        {previewRows.length === 0 ? (
          <p className="mx-auto mt-10 max-w-lg text-center text-sm text-white/90">
            Names appear here when supporters meet the threshold and opt in on the receipt step.
          </p>
        ) : (
          <>
            <ul className="mt-10 space-y-3 md:hidden" aria-label="Top donors ranked by total giving">
              {previewRows.map((row, idx) => (
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

            <div className="mt-10 hidden overflow-x-auto rounded-lg border border-white/10 bg-black/20 md:block">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/15 bg-white/[0.06]">
                  <th
                    scope="col"
                    className={`${displayFont("whitespace-nowrap px-3 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C8A94A] sm:px-4")}`}
                  >
                    #
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
                {previewRows.map((row, idx) => (
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

        {truncated ? (
          <p className="mt-4 text-center text-xs text-white/55">
            Showing top {HUB_PREVIEW_MAX_ROWS} by amount — full ranked list on the honor roll page.
          </p>
        ) : null}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/55">
          From paid fundraising hub checkouts only; anonymous or hidden-name gifts are excluded.
        </p>

        <div className="mt-6 text-center">
          <HardLink
            href="/fundraising/honor-roll"
            className={`${displayFont("inline-flex min-h-11 items-center justify-center text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline")}`}
          >
            View full honor roll →
          </HardLink>
        </div>
      </div>
    </section>
  )
}
