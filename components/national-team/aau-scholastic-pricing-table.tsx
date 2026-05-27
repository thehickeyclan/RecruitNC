import {
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
        <p className="font-semibold text-white mb-2">Select at registration (Stripe checkout)</p>
        <PriceRows lines={AAU_SCHOLASTIC_CHECKOUT_LINES} />
        <p className={cn("mt-2 text-sm font-bold text-right tabular-nums", aauPriceClass)}>
          Checkout total: {formatAauScholasticDollars(AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS)}
        </p>
      </div>
      <div>
        <p className="font-semibold text-white mb-1">Travel (separate — not in registration checkout)</p>
        {!compact ? (
          <p className="text-sm text-white/60 mb-2">
            Estimated per athlete. NC United will share hotel, van, and flight guidance in the Team Hub.
          </p>
        ) : null}
        <PriceRows lines={AAU_SCHOLASTIC_TRAVEL_LINES} />
        <p className="mt-2 text-sm font-semibold text-white/80 text-right tabular-nums">
          Travel subtotal: {formatAauScholasticDollars(AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS)}
        </p>
      </div>
      <p className={scholasticInsetClass}>
        <strong className="text-white">Estimated all-in per athlete:</strong>{" "}
        {formatAauScholasticDollars(AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS)} (registration + apparel + hotel and
        van + flight). Meals and ground transport are extra.
      </p>
    </div>
  )
}
