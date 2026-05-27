import {
  AAU_SCHOLASTIC_ALL_CHECKOUT_LINES,
  AAU_SCHOLASTIC_CHECKOUT_LINES,
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS,
  AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS,
  AAU_SCHOLASTIC_PRICING_CONTEXT,
  AAU_SCHOLASTIC_TRAVEL_LINES,
  AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS,
  formatAauScholasticDollars,
  type AauScholasticPriceLine,
} from "@/lib/aau-scholastic-duals-2026-content"
import { scholasticInsetClass } from "@/components/national-team/scholastic-duals-section"
import { aauPriceClass } from "@/components/national-team/aau-scholastic-theme"
import { cn } from "@/lib/utils"

function PriceRows({ lines }: { lines: AauScholasticPriceLine[] }) {
  return (
    <ul className="divide-y divide-[#B31B1B]/15 rounded-lg border border-[#B31B1B]/25 overflow-hidden bg-[#0a2040]/60">
      {lines.map((line) => (
        <li key={line.id} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-white/85">{line.label}</span>
          <span className={aauPriceClass}>{formatAauScholasticDollars(line.dollars)}</span>
        </li>
      ))}
    </ul>
  )
}

export function AauScholasticPricingTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <p className="text-sm text-white/75 leading-relaxed">{AAU_SCHOLASTIC_PRICING_CONTEXT}</p>
      <div>
        <p className="font-semibold text-white mb-2">Registration &amp; apparel</p>
        <PriceRows lines={AAU_SCHOLASTIC_CHECKOUT_LINES} />
        <p className={cn("mt-2 text-sm font-semibold text-right tabular-nums text-white/80")}>
          Subtotal: {formatAauScholasticDollars(AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS)}
        </p>
      </div>
      <div>
        <p className="font-semibold text-white mb-1">Travel</p>
        {!compact ? (
          <p className="text-sm text-white/60 mb-2">
            Select hotel/van and flight at registration checkout with registration and apparel.
          </p>
        ) : null}
        <PriceRows lines={AAU_SCHOLASTIC_TRAVEL_LINES} />
        <p className="mt-2 text-sm font-semibold text-white/80 text-right tabular-nums">
          Travel subtotal: {formatAauScholasticDollars(AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS)}
        </p>
      </div>
      <div>
        <p className="font-semibold text-white mb-2">Full bundle (most families)</p>
        <PriceRows lines={AAU_SCHOLASTIC_ALL_CHECKOUT_LINES} />
        <p className={cn("mt-2 text-sm font-bold text-right tabular-nums", aauPriceClass)}>
          All-in checkout: {formatAauScholasticDollars(AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS)}
        </p>
      </div>
      <p className={scholasticInsetClass}>
        <strong className="text-white">Meals and local ground transport</strong> are not in checkout. Plan on about{" "}
        {formatAauScholasticDollars(AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS)} per athlete for the NC United bundle
        before those extras.
      </p>
    </div>
  )
}
