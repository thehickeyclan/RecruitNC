import type { FundraisingHubHeroStats } from "@/lib/fundraising/hub-data"
import { HardLink } from "@/components/hard-link"
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
    title: "501(c)(3), not a personal tip jar",
    body: "NC United Wrestling is a North Carolina public charity (EIN 99-3757238). Gifts can be tax-deductible for donors who itemize, and the nonprofit path unlocks matching gifts, corporate giving, and institutional support in ways typical P2P apps and most personal crowdfunding pages do not.",
  },
  {
    title: "Credit goes to the athlete or the training fund",
    body: "At checkout you choose who benefits — a specific wrestler (NCU code) or the NC United Training Fund. Your gift amount is what we record toward that credit in our nonprofit systems; funds apply to approved training and competition costs through our reimbursement workflow.",
  },
  {
    title: "Nonprofit checkout — built for wrestling",
    body: "You pay through our nonprofit-owned Stripe checkout—email receipt, supporter visibility choices, and metadata that ties every gift to the right athlete code. Many consumer platforms add a visible platform fee on top of what donors intended; here your gift is structured as a tax-documented nonprofit gift when eligible, without that extra consumer-fundraiser layer.",
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
          Nonprofit advantage
        </p>
        <h2
          id="fundraising-why-nc-united-heading"
          className={`${displayFont("mt-3 max-w-3xl text-[clamp(1.5rem,4vw,2.25rem)] font-black uppercase leading-tight tracking-tight text-white")}`}
        >
          Why give through NC United
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/75 sm:text-lg">
          You get <strong className="text-white/90">tax documentation</strong>,{" "}
          <strong className="text-white/90">athlete or program credit</strong>, and a{" "}
          <strong className="text-white/90">single nonprofit ledger</strong> — instead of routing gifts through apps built
          for casual transfers or generic crowdfunding.
        </p>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <li
              key={c.title}
              className="rounded-xl border border-white/10 bg-[#0B2545]/50 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <h3 className={`${displayFont("text-sm font-extrabold uppercase tracking-wide text-[#C8A94A]")}`}>
                {c.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/78">{c.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/40 px-5 py-5 sm:px-6">
          <h3 className={`${displayFont("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]")}`}>
            Compared to typical consumer tools
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-white/78">
            <strong className="text-white/90">GoFundMe-style pages</strong> usually charge platform fees (often several
            percent) on donations and are rarely structured as deductible gifts to your organization.{" "}
            <strong className="text-white/90">Venmo, Cash App, Zelle</strong> are peer-to-peer transfers — convenient, but
            they don&apos;t produce a 501(c)(3) receipt or tie cleanly to NCU athlete credits for staff and families.
          </p>
          {illustrativeFeesCents > 0 ? (
            <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/55">
              <strong className="text-white/70">Illustrative only:</strong> at roughly a{" "}
              {Math.round(ILLUSTRATIVE_PLATFORM_FEE_RATE * 1000) / 10}% platform-style fee assumption (not NC United&apos;s
              actual pricing), the {formatUsdWhole(hero.totalRaisedCents)} raised on the hub window below could represent on
              the order of <strong className="tabular-nums text-white/75">{formatUsdWhole(illustrativeFeesCents)}</strong> that
              might otherwise go to third-party platform fees in a consumer fundraising model — not a promise or accounting
              figure; ask your CPA about deductibility.
            </p>
          ) : null}
        </div>

        <p className="mt-8 text-sm text-white/55">
          Deeper playbook (mindset, donors, matching):{" "}
          <HardLink href="/fundraising/playbook/guide" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            Fundraising guide
          </HardLink>
          .
        </p>
      </div>
    </section>
  )
}
