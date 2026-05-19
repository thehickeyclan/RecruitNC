import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import { getTrainingFundPublicSnapshot } from "@/lib/fundraising/training-fund-public-stats"
import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import { FundraisingTrainingFundCheckout } from "./fundraising-training-fund-checkout"

/** Hash target for Donate CTA; must match `fundraising-training-fund-checkout.tsx`. */
const CHECKOUT_ANCHOR = "spartan-checkout"

export const metadata: Metadata = {
  title: "NC United Training Fund | Fundraising",
  description:
    "Support the NC United Wrestling Training Fund — broad program funding for wrestlers training and competing year-round. Gifts to NC United (501(c)(3)); ask your advisor about deductions.",
}

export default async function FundraisingTrainingFundPage({
  searchParams,
}: {
  searchParams?: Promise<{ cancelled?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const cancelled = sp.cancelled === "1"
  const { stats, gifts } = await getTrainingFundPublicSnapshot(250)
  const giveHref = `/fundraising/training-fund#${CHECKOUT_ANCHOR}`

  return (
    <div
      className="min-h-screen bg-[#061224] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white sm:px-6 sm:py-12"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-lg sm:max-w-2xl">
        <HardLink
          href="/fundraising"
          className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
        >
          ← Fundraising hub
        </HardLink>

        <p className="font-[family-name:var(--font-fundraising-display)] mt-8 text-[11px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
          NC United
        </p>

        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-4 text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl">
          Training Fund
        </h1>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          The <strong className="text-white/90">NC United Training Fund</strong> supports wrestlers who need resources to train
          and compete <strong className="text-white/90">nationally, year-round</strong>. Gifts are made to NC United Wrestling —
          North Carolina <strong className="text-white/90">501(c)(3)</strong> — for the general training fund, not as a personal
          transfer to one athlete. Consult your tax advisor about deductibility.
        </p>

        {cancelled ? (
          <div className="mt-6 rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
            Checkout was cancelled — nothing was charged. You can give anytime below.
          </div>
        ) : null}

        <div className="mt-8 flex flex-col items-stretch gap-2 sm:items-center">
          <HardLink href={giveHref} className="font-[family-name:var(--font-fundraising-display)] flex min-h-[52px] w-full touch-manipulation items-center justify-center rounded-sm bg-[#CC0000] px-8 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_44px_-10px_rgba(204,0,0,0.55)] hover:bg-[#a80000] sm:inline-flex sm:w-auto sm:min-w-[240px]">
            Give now →
          </HardLink>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Available in pool</p>
            <p className="mt-2 text-lg font-black tabular-nums text-white sm:text-xl">
              {formatUsdWhole(stats.unallocatedBalanceCents)}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-white/45">
              After gifts received minus amounts committed to scholarships.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Gifts received</p>
            <p className="mt-2 text-lg font-black tabular-nums text-white sm:text-xl">
              {formatUsdWhole(stats.donationsReceivedCents)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Committed to scholarships</p>
            <p className="mt-2 text-lg font-black tabular-nums text-white sm:text-xl">
              {formatUsdWhole(stats.allocatedToScholarshipsCents)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Gift count</p>
            <p className="mt-2 text-lg font-black tabular-nums text-white sm:text-xl">{stats.giftCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Avg gift</p>
            <p className="mt-2 text-lg font-black tabular-nums text-white sm:text-xl">
              {stats.avgGiftCents != null ? formatUsdWhole(stats.avgGiftCents) : "—"}
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/45">
          “Gifts received” counts completed training-fund checkouts (no individual NCU athlete code), same basis as NC
          United&apos;s broader{" "}
          <HardLink href="/spartan" className="text-[#C8A94A] underline-offset-4 hover:underline">
            fundraising ledger
          </HardLink>
          . “Committed to scholarships” is the total of board allocations from this pool into named scholarship funds.
        </p>

        {gifts.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-white">
              Gift activity
            </h2>
            <p className="mt-1 text-xs text-white/45">Public names only · recent training-fund gifts.</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/20">
              <div className="hidden grid-cols-[5.25rem_minmax(0,10.5rem)_minmax(0,1fr)_auto] gap-x-3 border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white/40 sm:grid">
                <span>Date</span>
                <span>Campaign</span>
                <span>Supporter</span>
                <span className="text-right">Amount</span>
              </div>
              <ul className="divide-y divide-white/10">
                {gifts.map((r, i) => (
                  <li
                    key={`${r.created_at}-${i}`}
                    className="grid grid-cols-1 gap-y-1 px-3 py-3 text-sm sm:grid-cols-[5.25rem_minmax(0,10.5rem)_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3 sm:gap-y-0 sm:py-2.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 sm:contents">
                      <span className="text-xs tabular-nums text-white/40">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-semibold text-[#C8A94A] tabular-nums sm:hidden">{formatUsdWhole(r.amountCents)}</span>
                    </div>
                    <span className="text-xs leading-snug text-white/55 sm:min-w-0">{r.campaignLabel}</span>
                    <span className="min-w-0 text-white/85">{r.donorLabel}</span>
                    <span className="hidden font-semibold text-[#C8A94A] tabular-nums sm:block sm:text-right">
                      {formatUsdWhole(r.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div id={CHECKOUT_ANCHOR} className="mt-12 scroll-mt-28">
          <FundraisingTrainingFundCheckout />
        </div>

        <p className="mt-12 border-t border-white/10 pt-8 text-center text-xs text-white/45">
          Your gift supports NC United Wrestling, a North Carolina 501(c)(3) nonprofit.
        </p>
      </div>
    </div>
  )
}
