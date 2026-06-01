import {
  AAU_SCHOLASTIC_CHECKOUT_LINES,
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS,
  AAU_SCHOLASTIC_PRICING_INTRO,
  AAU_SCHOLASTIC_PRICING_NOTES,
  AAU_SCHOLASTIC_TRAVEL_LINES,
  AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS,
  formatAauScholasticDollars,
  type AauScholasticPriceLine,
} from "@/lib/aau-scholastic-duals-2026-content"
import { aauScholasticSkuForLineId } from "@/lib/national-team-product-catalog"
import { cn } from "@/lib/utils"

function PriceRows({ lines }: { lines: AauScholasticPriceLine[] }) {
  return (
    <ul className="divide-y divide-[#B31B1B]/15 rounded-lg border border-[#B31B1B]/25 overflow-hidden bg-[#0a2040]/60">
      {lines.map((line) => (
        <li key={line.id} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-white/85">
            {line.label}
            <span className="ml-2 font-mono text-[10px] text-white/40">{aauScholasticSkuForLineId(line.id)}</span>
          </span>
          <span className="font-semibold tabular-nums text-[#FF7070]">{formatAauScholasticDollars(line.dollars)}</span>
        </li>
      ))}
    </ul>
  )
}

export function AauScholasticPricingTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <p className="text-sm text-white/75 leading-relaxed">{AAU_SCHOLASTIC_PRICING_INTRO}</p>
      <ul className="list-disc pl-5 space-y-1.5 text-sm text-white/65 leading-relaxed">
        {AAU_SCHOLASTIC_PRICING_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <div>
        <p className="font-semibold text-white mb-2">Registration &amp; apparel</p>
        <PriceRows lines={AAU_SCHOLASTIC_CHECKOUT_LINES} />
        <p className={cn("mt-2 text-sm text-right tabular-nums text-white/55")}>
          All registration &amp; apparel lines: {formatAauScholasticDollars(AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS)}
        </p>
      </div>
      <div>
        <p className="font-semibold text-white mb-2">Travel</p>
        <PriceRows lines={AAU_SCHOLASTIC_TRAVEL_LINES} />
        <p className="mt-2 text-sm text-right tabular-nums text-white/55">
          Both travel lines: {formatAauScholasticDollars(AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS)}
        </p>
      </div>
    </div>
  )
}
