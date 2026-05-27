import {
  AAU_SCHOLASTIC_CHECKOUT_LINES,
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS,
  AAU_SCHOLASTIC_FLEXIBILITY_NOTES,
  AAU_SCHOLASTIC_MEALS_NOT_INCLUDED,
  AAU_SCHOLASTIC_PRICING_CONTEXT,
  AAU_SCHOLASTIC_TRAVEL_LINES,
  AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS,
  formatAauScholasticDollars,
  type AauScholasticPriceLine,
} from "@/lib/aau-scholastic-duals-2026-content"
import { scholasticInsetClass } from "@/components/national-team/scholastic-duals-section"
import { cn } from "@/lib/utils"

function PriceRows({ lines }: { lines: AauScholasticPriceLine[] }) {
  return (
    <ul className="divide-y divide-[#B31B1B]/15 rounded-lg border border-[#B31B1B]/25 overflow-hidden bg-[#0a2040]/60">
      {lines.map((line) => (
        <li key={line.id} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-white/85">{line.label}</span>
          <span className="font-semibold tabular-nums text-[#FF7070]">{formatAauScholasticDollars(line.dollars)}</span>
        </li>
      ))}
    </ul>
  )
}

export function AauScholasticPricingTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <p className="text-sm text-white/75 leading-relaxed">{AAU_SCHOLASTIC_PRICING_CONTEXT}</p>
      <div className="space-y-3">
        {AAU_SCHOLASTIC_FLEXIBILITY_NOTES.map((note) => (
          <p key={note} className={scholasticInsetClass + " text-sm leading-relaxed"}>
            {note}
          </p>
        ))}
      </div>
      <div>
        <p className="font-semibold text-white mb-2">Registration &amp; apparel (à la carte)</p>
        <PriceRows lines={AAU_SCHOLASTIC_CHECKOUT_LINES} />
        <p className={cn("mt-2 text-sm text-right tabular-nums text-white/55")}>
          Example if you selected every apparel + registration line:{" "}
          {formatAauScholasticDollars(AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS)}
        </p>
      </div>
      <div>
        <p className="font-semibold text-white mb-1">Travel (à la carte)</p>
        {!compact ? (
          <p className="text-sm text-white/60 mb-2">
            Hotel &amp; team van includes lodging and NC United van transportation. Add flight only if your athlete
            needs a seat from the team block.
          </p>
        ) : null}
        <PriceRows lines={AAU_SCHOLASTIC_TRAVEL_LINES} />
        <p className="mt-2 text-sm text-right tabular-nums text-white/55">
          Example if you selected both travel lines: {formatAauScholasticDollars(AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS)}
        </p>
      </div>
      <p className={scholasticInsetClass}>{AAU_SCHOLASTIC_MEALS_NOT_INCLUDED}</p>
    </div>
  )
}
