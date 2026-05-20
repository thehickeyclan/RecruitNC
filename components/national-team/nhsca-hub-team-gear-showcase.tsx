import Image from "next/image"
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
  { label: "Competition singlet", price: formatDollars(NHSCA_SINGLET_EACH_CENTS), note: `2 for ${formatDollars(NHSCA_SINGLET_TWO_CENTS)} in package` },
  { label: "Shorts", price: formatDollars(NHSCA_SHORTS_CENTS) },
  { label: "Short sleeve tee", price: formatDollars(NHSCA_SHORT_SLEEVE_CENTS) },
  { label: "Long sleeve tee", price: formatDollars(NHSCA_LONG_SLEEVE_CENTS) },
] as const

/** NC United NHSCA Duals 2026 singlet + apparel mockups for hub checkout and Event Info. */
export function NhscaHubTeamGearShowcase({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#CBAF5D]/35 bg-gradient-to-br from-[#0a2040] to-[#002147]/90 overflow-hidden",
        className
      )}
      aria-label="2026 team gear"
    >
      <div className={cn("p-4 sm:p-5", compact && "p-3 sm:p-4")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#CBAF5D]/90">2026 team gear</p>
            <h4 className={cn("font-bold text-white", compact ? "text-sm" : "text-base")}>
              NC United singlet &amp; apparel
            </h4>
          </div>
          {!compact ? (
            <p className="text-xs text-white/50 text-right max-w-[11rem] leading-snug">
              Full package {formatDollars(NHSCA_TEAM_PACKAGE_CENTS)} — registration + everything below
            </p>
          ) : null}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <figure className="rounded-lg bg-white p-2 sm:p-3 ring-1 ring-white/10">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/nhsca-duals-2026-singlet.png"
                alt="NC United competition singlet — North Carolina script front, custom name on back"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </div>
            <figcaption className="mt-2 text-center text-[11px] font-semibold text-[#002147]/80">Competition singlet</figcaption>
          </figure>
          <figure className="rounded-lg bg-white p-2 sm:p-3 ring-1 ring-white/10">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/nhsca-duals-2026-apparel.png"
                alt="NC United team apparel — long sleeve, shorts, and short sleeve tee"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </div>
            <figcaption className="mt-2 text-center text-[11px] font-semibold text-[#002147]/80">Shorts &amp; team tees</figcaption>
          </figure>
        </div>

        <ul className={cn("mt-3 grid gap-1.5", compact ? "grid-cols-1 sm:grid-cols-2" : "sm:grid-cols-2")}>
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

        <p className="mt-3 text-[11px] text-white/45 leading-relaxed">
          Athlete name on singlet back. Required at weigh-ins — wear your NC United singlet.
        </p>
      </div>
    </section>
  )
}
