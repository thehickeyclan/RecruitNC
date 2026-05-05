import type { FundraisingHubHeroStats } from "@/lib/fundraising/hub-data"
import { HardLink } from "@/components/hard-link"
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
            Giving through NC United means tax documentation when your gift qualifies, clear credit to an athlete or the
            training fund, and one nonprofit ledger our team can stand behind—without treating your gift like a casual app
            transfer or a generic crowdfunding page.
          </p>
          <p className="mt-4 text-base leading-relaxed text-white">
            NC United is a registered 501(c)(3) public charity (EIN 99-3757238). That status is what opens the door to
            deductible gifts for many donors, plus matching, corporate, and foundation giving—in a way that works very
            differently from typical person-to-person apps or personal fundraising sites.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0B2545]/50">
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
                <td className="px-3 py-2.5">Tax-deductible (when eligible)</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/95">Yes</td>
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
                <td className="px-3 py-2.5">Athlete / program credit in our ledger</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/95">Yes</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Varies</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/60">Manual</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Platform fees (illustrative)</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/90">None added</td>
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
        </div>
      </div>

      {illustrativeFeesCents > 0 ? (
        <div className="mx-auto mt-10 max-w-6xl rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-xs leading-relaxed text-white/90 sm:px-6">
          At a rough 3% platform-fee illustration (not NC United’s pricing), the {formatUsdWhole(hero.totalRaisedCents)} raised
          through NC United in this hub window might have meant on the order of ~{formatUsdWhole(illustrativeFeesCents)} in
          third-party fees in a consumer fundraising flow. Illustration only—talk with your CPA about what applies to you.
        </div>
      ) : null}

      <div className="mx-auto mt-8 max-w-6xl text-center sm:text-left">
        <HardLink
          href="/fundraising/playbook/guide"
          className={`${displayFont("text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline")}`}
        >
          Read the full fundraising guide →
        </HardLink>
      </div>
    </section>
  )
}
