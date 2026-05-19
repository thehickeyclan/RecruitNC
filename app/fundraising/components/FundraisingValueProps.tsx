import type { FundraisingHubHeroStats } from "@/lib/fundraising/hub-data"
import { formatUsdWhole } from "./FundraisingHero"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

/**
 * Illustrative only — mid-range estimate often cited for consumer donation / crowdfunding
 * platform + processing bundles. Not NC United’s actual fee structure or a guarantee.
 */
const ILLUSTRATIVE_PLATFORM_FEE_RATE = 0.032

type Card = { title: string; body: string }

const CARDS: Card[] = [
  {
    title: "501(c)(3) nonprofit structure",
    body: "NC United Wrestling is a North Carolina public charity (EIN 99-3757238). Deduction eligibility is donor-specific; the nonprofit pathway still unlocks matching gifts, corporate giving, and institutional support in ways typical P2P apps and most personal crowdfunding pages do not.",
  },
  {
    title: "Donor preference for a wrestler or the training fund",
    body: "At checkout you indicate support for NC United — a specific wrestler (NCU code) or the NC United Training Fund. Donor preference drives what we display in nonprofit reporting; funds flow under NC United policy, including approved reimbursement workflows for eligible costs.",
  },
  {
    title: "Nonprofit checkout — built for wrestling",
    body: "You pay through our nonprofit-owned Stripe checkout—email receipt, supporter visibility choices, and metadata that ties every gift to the right athlete code. Some consumer platforms add separate platform fees on top of donations; our flow is built so eligible gifts can be documented as nonprofit support without that extra layer.",
  },
  {
    title: "Major supporters — recognition & thanks",
    body: "Qualifying donors can appear on our public supporter honor roll (when they choose “show my name”) and may be eligible for tiered thank-you benefits—gear, seasonal recognition, or event-style thanks—depending on the campaign year and thresholds NC United sets. Benefits stay proportional; we communicate what applies so expectations stay clear.",
  },
]

export function FundraisingValueProps({ hero }: { hero: FundraisingHubHeroStats }) {
  const illustrativeFeesCents =
    hero.totalRaisedCents > 0 ? Math.round(hero.totalRaisedCents * ILLUSTRATIVE_PLATFORM_FEE_RATE) : 0

  return (
    <section
      id="fundraising-why-nc-united"
      className="border-b border-white/[0.08] bg-[#061224] px-4 py-16 text-white sm:py-20"
      aria-labelledby="fundraising-why-nc-united-heading"
    >
      <div className="mx-auto max-w-6xl">
        <p className={`${displayFont("text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
          Through the nonprofit
        </p>
        <h2
          id="fundraising-why-nc-united-heading"
          className={`${displayFont("mt-3 max-w-3xl text-[clamp(1.5rem,4vw,2.25rem)] font-black uppercase leading-tight tracking-tight text-white")}`}
        >
          Why give through NC United
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white sm:text-lg">
          You get <strong className="text-white">tax documentation</strong>,{" "}
          <strong className="text-white">donor preference for a wrestler or the training fund</strong>, and a{" "}
          <strong className="text-white">single nonprofit ledger</strong>—so donors and families see one clear story. That
          differs from routing gifts only through apps built for casual transfers or generic crowdfunding, where receipts
          and attribution can be harder to line up.{" "}
          <strong className="text-white">Major supporters</strong> can also receive NC United{" "}
          <strong className="text-white">recognition and thank-you benefits</strong> (tiered)—when we run those programs
          for a campaign season, details are shared with qualifying donors.
        </p>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {CARDS.map((c) => (
            <li
              key={c.title}
              className="rounded-xl border border-white/10 bg-[#0B2545]/50 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <h3 className={`${displayFont("text-sm font-extrabold uppercase tracking-wide text-[#C8A94A]")}`}>
                {c.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white">{c.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/40 px-5 py-5 sm:px-6">
          <h3 className={`${displayFont("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}`}>
            Compared to typical consumer tools
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-white">
            Crowdfunding pages often include platform fees and may not be set up as deductible gifts to a 501(c)(3). P2P
            apps like Venmo, Cash App, or Zelle are great for everyday transfers, but they don&apos;t automatically produce a
            charity receipt or tie cleanly to NCU donor-preference tagging in our systems.
          </p>
          {illustrativeFeesCents > 0 ? (
            <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/85">
              <strong className="text-white">Illustrative only:</strong> at roughly a{" "}
              {Math.round(ILLUSTRATIVE_PLATFORM_FEE_RATE * 1000) / 10}% platform-style fee assumption (not NC United&apos;s
              actual pricing), the {formatUsdWhole(hero.totalRaisedCents)} raised on the hub window below could represent on
              the order of <strong className="tabular-nums text-white">{formatUsdWhole(illustrativeFeesCents)}</strong> that
              might otherwise go to third-party platform fees in a consumer fundraising model — not a promise or accounting
              figure; ask your CPA about deductibility.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
