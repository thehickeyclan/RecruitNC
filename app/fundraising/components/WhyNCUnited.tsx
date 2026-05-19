import type { FundraisingHubHeroStats } from "@/lib/fundraising/hub-data"
import { formatUsdWhole } from "./FundraisingHero"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

const ILLUSTRATIVE_PLATFORM_FEE_RATE = 0.03

export function WhyNCUnited({ hero }: { hero: FundraisingHubHeroStats }) {
  const illustrativeFeesCents =
    hero.totalRaisedCents > 0 ? Math.round(hero.totalRaisedCents * ILLUSTRATIVE_PLATFORM_FEE_RATE) : 0

  return (
    <section id="fundraising-why-nc-united" className="border-b border-white/[0.07] bg-[#0F2D5A] px-4 py-16 text-white sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
        <div>
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            Through the nonprofit
          </p>
          <h2 className={`${displayFont("mt-3 text-[clamp(1.65rem,4vw,2.35rem)] font-black uppercase leading-tight tracking-tight text-white")}`}>
            Why give through NC United
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white">
            Giving through NC United means acknowledgement materials when checkout completes, donor preference attribution on our
            reconciliation views (toward an athlete&apos;s programming or the broader training fund), and one nonprofit ledger our
            team can defend—without treating your gift like a casual app transfer or a generic crowdfunding page.
          </p>
          <p className="mt-4 text-base leading-relaxed text-white">
            NC United is a registered 501(c)(3) public charity (EIN 99-3757238). Gifts run through exempt-purpose stewardship with acknowledgements aligned to
            IRC charitable-gift standards; deductible treatment depends on each donor&apos;s situation—matching, corporate, and foundation giving still work far
            more effectively here than via informal transfers.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0B2545]/50">
          <p className="px-3 pb-2 pt-3 text-center text-[11px] text-white/55 md:hidden">
            Swipe sideways to compare columns →
          </p>
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className={`${displayFont("border-b border-white/10 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/50")}`}>
                <th className="px-3 py-3 text-left" />
                <th className="px-3 py-3 text-center text-[#C8A94A]">NC United</th>
                <th className="px-3 py-3 text-center text-white/70">Typical crowdfunding</th>
                <th className="px-3 py-3 text-center text-white/70">P2P apps</th>
              </tr>
            </thead>
            <tbody className="text-white/85">
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">May qualify for charitable deduction (eligible donors*)</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/95">Possible*</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Usually no</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Usually no</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Corporate giving</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/95">Yes</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Limited</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Rare</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Employer matching</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/95">Yes</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Uncommon</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Uncommon</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Foundation grants</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/95">Yes</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Uncommon</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Uncommon</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">501(c)(3) gift receipt</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/95">Yes</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Varies</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">No</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Preference / attribution in our reconciliation</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/95">Yes</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Varies</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Manual</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Fundraising platform fee (illustrative)</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/90">
                  None added<sup className="text-[0.65em] text-emerald-200/90">†</sup>
                </td>
                <td className="px-3 py-2.5 text-center text-sm text-white/65">Often ~3%</td>
                <td className="px-3 py-2.5 text-center text-sm text-white/65">Varies</td>
              </tr>
              <tr>
                <td className="px-3 py-2.5">Oversight</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/75">Nonprofit reporting</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Platform policies</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Informal</td>
              </tr>
            </tbody>
          </table>
          <div className="space-y-1.5 px-3 pb-3 pt-2 text-[10px] leading-snug text-white/55">
            <p>
              *Deduction eligibility is donor-specific—confirm whether your gifts qualify under IRC rules with your tax
              advisor or counsel.
            </p>
            <p>
              <span className="text-white/65">†</span> No consumer fundraising-style platform fee is added on these NC
              United checkouts; card networks and processors still charge their normal payment processing fees.
            </p>
          </div>
        </div>
      </div>

      {illustrativeFeesCents > 0 ? (
        <div className="mx-auto mt-10 max-w-6xl rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-xs leading-relaxed text-white/90 sm:px-6">
          At a rough 3% platform-fee illustration (not NC United&apos;s pricing), the{" "}
          {formatUsdWhole(hero.totalRaisedCents)} raised
          through NC United in this hub window might have meant on the order of ~{formatUsdWhole(illustrativeFeesCents)} in
          third-party fees in a consumer fundraising flow. Illustration only—talk with your CPA about what applies to you.
        </div>
      ) : null}
    </section>
  )
}
