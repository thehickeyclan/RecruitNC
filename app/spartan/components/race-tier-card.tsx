import { HardLink } from "@/components/hard-link"
import type { SpartanRaceTier } from "../types"

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

type RaceTierCardProps = {
  tier: SpartanRaceTier
  /**
   * "reference" = bottom-of-page teaser: de-emphasize the dollar amount (also in checkout) and
   * lead with a join/donate CTA. "default" = full card with large suggested gift.
   */
  variant?: "default" | "reference"
}

export function RaceTierCard({ tier, variant = "default" }: RaceTierCardProps) {
  const featured = tier.featured === true
  const isReference = variant === "reference"
  const showFeaturedChrome = featured && !isReference
  const gift = formatUsd(tier.suggestedGiftCents)

  return (
    <article
      className={`group relative flex h-full flex-col bg-[#1A1A1A] p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_16px_40px_rgba(0,0,0,0.45)] ${
        showFeaturedChrome
          ? "border-2 border-[#CC0000]"
          : "border border-[#2A2A2A] border-l-[4px] border-l-[#CC0000]"
      } `}
    >
      {showFeaturedChrome && (
        <span className="absolute right-2 top-2 inline-block bg-[#CC0000] px-2 py-1 font-[family-name:var(--font-barlow-spartan)] text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          Default pick
        </span>
      )}
      <p className="pr-16 font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#CC0000]">
        {tier.badge}
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-barlow-spartan)] text-[22px] font-extrabold uppercase leading-tight tracking-tight text-white md:text-[26px]">
        {tier.name}
      </h3>
      <p className="mt-2 text-sm leading-snug text-[#9a9a9a]">{tier.detail}</p>
      <p className="mt-1 font-[family-name:var(--font-barlow-spartan)] text-[11px] uppercase tracking-[0.12em] text-[#666]">
        {tier.dates}
      </p>

      {!isReference && <div className="my-5 h-px w-full bg-[#333]" aria-hidden />}

      {!isReference && (
        <>
          <p className="font-[family-name:var(--font-barlow-spartan)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#888]">
            Suggested
          </p>
          <p className="mt-1 font-[family-name:var(--font-barlow-spartan)] text-[clamp(2rem,5vw,2.25rem)] font-black tabular-nums leading-none text-[#CC0000]">
            {gift}
          </p>
          <p className="mt-2 text-xs leading-snug text-[#888]">
            Suggested charitable gift toward NC United (Training Fund notation at checkout as applicable) · IRC-aligned acknowledgement emailed after checkout · Spartan registration steps separately
          </p>
        </>
      )}

      <HardLink
        href={`/spartan?tier=${encodeURIComponent(tier.id)}#spartan-checkout`}
        className={`inline-flex min-h-[52px] w-full items-center justify-center border border-[#3a3a3a] bg-[#252525] px-2 font-[family-name:var(--font-barlow-spartan)] text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#CC0000] hover:bg-[#2f2f2f] active:opacity-90 ${isReference ? "mt-8" : "mt-5"}`}
      >
        {isReference ? "Join us & donate now" : "Pay & run"}
      </HardLink>
      <a
        href={tier.registerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block text-center text-[11px] text-[#555] underline-offset-2 hover:text-[#777] hover:underline"
      >
        Spartan.com — event info
      </a>
    </article>
  )
}
