import { NhscaDuals2026ApparelPreview } from "@/components/national-team/nhsca-duals-2026-apparel-preview"
import { NhscaDuals2026GearCarousel } from "@/components/national-team/nhsca-duals-2026-gear-carousel"
import { NhscaDuals2026SingletPreview } from "@/components/national-team/nhsca-duals-2026-singlet-preview"
import {
  NHSCA_LONG_SLEEVE_CENTS,
  NHSCA_SHORT_SLEEVE_CENTS,
  NHSCA_SHORTS_CENTS,
  NHSCA_SINGLET_EACH_CENTS,
  NHSCA_SINGLET_TWO_CENTS,
  NHSCA_TEAM_PACKAGE_CENTS,
} from "@/lib/nhsca-hub-checkout-pricing"
import { cn } from "@/lib/utils"

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

const GEAR_ITEMS = [
  {
    label: "Singlet — blue or white",
    price: `${formatDollars(NHSCA_SINGLET_EACH_CENTS)} each`,
    note: `Both ${formatDollars(NHSCA_SINGLET_TWO_CENTS)}`,
  },
  { label: "Shorts", price: formatDollars(NHSCA_SHORTS_CENTS) },
  { label: "Short sleeve tee", price: formatDollars(NHSCA_SHORT_SLEEVE_CENTS) },
  { label: "Long sleeve tee", price: formatDollars(NHSCA_LONG_SLEEVE_CENTS) },
] as const

const CAROUSEL_PRICES: Record<string, string> = {
  "blue-front": `${formatDollars(NHSCA_SINGLET_EACH_CENTS)} each`,
  "blue-back": `${formatDollars(NHSCA_SINGLET_EACH_CENTS)} each`,
  "white-front": `${formatDollars(NHSCA_SINGLET_EACH_CENTS)} each`,
  "white-back": `${formatDollars(NHSCA_SINGLET_EACH_CENTS)} each`,
  shorts: formatDollars(NHSCA_SHORTS_CENTS),
  "short-sleeve-tee": formatDollars(NHSCA_SHORT_SLEEVE_CENTS),
  "long-sleeve-front": formatDollars(NHSCA_LONG_SLEEVE_CENTS),
  "long-sleeve-back": formatDollars(NHSCA_LONG_SLEEVE_CENTS),
}

/** NC United NHSCA Duals 2026 singlet + apparel — Payments checkout carousel. */
export function NhscaHubTeamGearShowcase({
  compact = false,
  carousel = false,
  className,
}: {
  compact?: boolean
  /** Compact side-nav carousel — Payments checkout. */
  carousel?: boolean
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#CBAF5D]/35 bg-gradient-to-br from-[#0a2040] to-[#002147]/90 overflow-hidden",
        className
      )}
      aria-label="2026 team gear"
    >
      <div className={cn("p-4 sm:p-5", compact && "p-3 sm:p-4", carousel && "p-3 sm:p-4")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#CBAF5D]/90">2026 team gear</p>
            <h4 className={cn("font-bold text-white", compact || carousel ? "text-sm" : "text-base")}>
              NC United singlet &amp; apparel
            </h4>
          </div>
          {!compact && !carousel ? (
            <p className="text-xs text-white/50 text-right max-w-[11rem] leading-snug">
              Full package {formatDollars(NHSCA_TEAM_PACKAGE_CENTS)} — registration + everything below
            </p>
          ) : carousel ? (
            <p className="text-[10px] text-white/45 text-right leading-snug">
              Package {formatDollars(NHSCA_TEAM_PACKAGE_CENTS)}
            </p>
          ) : null}
        </div>

        {carousel ? (
          <NhscaDuals2026GearCarousel priceByPhotoId={CAROUSEL_PRICES} />
        ) : (
          <>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#CBAF5D]/80 mb-2">
                Singlets — blue or white
              </p>
              <NhscaDuals2026SingletPreview detailed={!compact} className="mx-auto w-full" />
            </div>

            <div className="mt-4 sm:mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#CBAF5D]/80 mb-2">
                Shorts &amp; team tees
              </p>
              <NhscaDuals2026ApparelPreview className="mx-auto w-full" />
            </div>
          </>
        )}

        <ul
          className={cn(
            "mt-3 grid gap-1.5",
            carousel ? "grid-cols-2 gap-x-3 text-[11px]" : compact ? "grid-cols-1 sm:grid-cols-2" : "sm:grid-cols-2"
          )}
        >
          {GEAR_ITEMS.map((item) => (
            <li key={item.label} className="flex items-baseline justify-between gap-2 text-xs text-white/75">
              <span>{item.label}</span>
              <span className="text-[#CBAF5D] font-semibold tabular-nums shrink-0">
                {item.price}
                {"note" in item && item.note ? (
                  <span className="block text-[10px] font-normal text-white/40 text-right">{item.note}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        <p className={cn("mt-3 text-white/45 leading-relaxed", carousel ? "text-[10px]" : "text-[11px]")}>
          Blue or white singlet — pick one ({formatDollars(NHSCA_SINGLET_EACH_CENTS)}) or both (
          {formatDollars(NHSCA_SINGLET_TWO_CENTS)}). Name on back. Required at weigh-ins.
        </p>
      </div>
    </section>
  )
}
