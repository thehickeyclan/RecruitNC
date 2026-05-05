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
            Nonprofit advantage
          </p>
          <h2 className={`${displayFont("mt-3 text-[clamp(1.65rem,4vw,2.35rem)] font-black uppercase leading-tight tracking-tight text-white")}`}>
            Why give through NC United
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white">
            When you give through NC United you get tax documentation, direct athlete credit, and a single nonprofit ledger
            — not a platform fee, not a P2P transfer, not a personal tip jar.
          </p>
          <p className="mt-4 text-base leading-relaxed text-white">
            NC United is a registered 501(c)(3) public charity (EIN 99-3757238). That structure unlocks giving that generic
            platforms never can.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0B2545]/50">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className={`${displayFont("border-b border-white/10 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/50")}`}>
                <th className="px-3 py-3 text-left" />
                <th className="px-3 py-3 text-center text-[#C8A94A]">NC United</th>
                <th className="px-3 py-3 text-center text-white/70">GoFundMe</th>
                <th className="px-3 py-3 text-center text-white/70">Venmo / Cash App</th>
              </tr>
            </thead>
            <tbody className="text-white/85">
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Tax-deductible</td>
                <td className="px-3 py-2.5 text-center text-lg text-emerald-400">✓</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Corporate giving</td>
                <td className="px-3 py-2.5 text-center text-lg text-emerald-400">✓</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Employer matching</td>
                <td className="px-3 py-2.5 text-center text-lg text-emerald-400">✓</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Foundation grants</td>
                <td className="px-3 py-2.5 text-center text-lg text-emerald-400">✓</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Instant IRS receipt</td>
                <td className="px-3 py-2.5 text-center text-lg text-emerald-400">✓</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Athlete attribution</td>
                <td className="px-3 py-2.5 text-center text-lg text-emerald-400">✓</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
                <td className="px-3 py-2.5 text-center text-lg text-white/25">✗</td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="px-3 py-2.5">Platform fees</td>
                <td className="px-3 py-2.5 text-center text-sm font-semibold text-emerald-300/90">None</td>
                <td className="px-3 py-2.5 text-center text-sm text-white/65">~3%</td>
                <td className="px-3 py-2.5 text-center text-sm text-white/65">None</td>
              </tr>
              <tr>
                <td className="px-3 py-2.5">Accountability</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/75">IRS-regulated</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/55">Limited</td>
                <td className="px-3 py-2.5 text-center text-xs text-white/55">None</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {illustrativeFeesCents > 0 ? (
        <div className="mx-auto mt-10 max-w-6xl rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-xs leading-relaxed text-white/90 sm:px-6">
          At a 3% platform fee, the {formatUsdWhole(hero.totalRaisedCents)} raised through NC United on this hub window
          could have cost donors ~{formatUsdWhole(illustrativeFeesCents)} in fees through a consumer platform. Not a promise
          — ask your CPA about deductibility.
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
