import type { DonorHallOfFameEntry } from "@/lib/fundraising/donor-hall-of-fame"
import { DEFAULT_FUNDRAISING_CAMPAIGN } from "@/lib/fundraising/campaign-registry"
import { HardLink } from "@/components/hard-link"
import { formatUsdWhole } from "./FundraisingHero"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

function previewNames(
  individuals: DonorHallOfFameEntry[],
  organizations: DonorHallOfFameEntry[],
  max: number,
): string[] {
  const merged = [...individuals.map((i) => i.displayName), ...organizations.map((o) => o.displayName)]
  return merged.slice(0, max)
}

export function HonorRollPreview({
  individuals,
  organizations,
  minAmountCents,
}: {
  individuals: DonorHallOfFameEntry[]
  organizations: DonorHallOfFameEntry[]
  minAmountCents: number
}) {
  const names = previewNames(individuals, organizations, 15)
  const minLabel = formatUsdWhole(minAmountCents)

  return (
    <section
      id="fundraising-honor-roll-preview"
      className="scroll-mt-28 border-b border-white/[0.06] bg-[#0B2545] px-4 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
            Public recognition
          </p>
          <h2 className={`${displayFont("mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl")}`}>
            Supporter honor roll
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
            Supporters who chose &ldquo;show my name&rdquo; at checkout and gave {minLabel}+ on a single gift (paid Stripe
            checkouts).
          </p>
        </div>

        {names.length === 0 ? (
          <p className="mx-auto mt-10 max-w-lg text-center text-sm text-white/55">
            Names appear here when supporters meet the threshold and opt in on the receipt step.
          </p>
        ) : (
          <ul className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4">
            {names.map((n) => (
              <li
                key={n}
                className={`${displayFont("rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/90 sm:text-sm")}`}
              >
                {n}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C8A94A]/90">
          {DEFAULT_FUNDRAISING_CAMPAIGN.campaignDisplayName}
        </p>

        <div className="mt-6 text-center">
          <HardLink
            href="/fundraising/honor-roll"
            className={`${displayFont("text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline")}`}
          >
            View full honor roll →
          </HardLink>
        </div>
      </div>
    </section>
  )
}
