import {
  AAU_SCHOLASTIC_CHECKOUT_LINES,
  AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS,
  AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS,
  AAU_SCHOLASTIC_TRAVEL_LINES,
  AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS,
  formatAauScholasticDollars,
  type AauScholasticPriceLine,
} from "@/lib/aau-scholastic-duals-2026-content"

function PriceRows({ lines }: { lines: AauScholasticPriceLine[] }) {
  return (
    <ul className="divide-y divide-gray-200/80 rounded-lg border border-gray-200 overflow-hidden bg-white">
      {lines.map((line) => (
        <li key={line.id} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-gray-700">{line.label}</span>
          <span className="font-semibold text-[#002147] tabular-nums shrink-0">{formatAauScholasticDollars(line.dollars)}</span>
        </li>
      ))}
    </ul>
  )
}

export function AauScholasticPricingTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div>
        <p className="font-semibold text-[#002147] mb-2">Pay at registration (Stripe checkout)</p>
        <PriceRows lines={AAU_SCHOLASTIC_CHECKOUT_LINES} />
        <p className="mt-2 text-sm font-bold text-[#003366] text-right tabular-nums">
          Checkout total: {formatAauScholasticDollars(AAU_SCHOLASTIC_CHECKOUT_TOTAL_DOLLARS)}
        </p>
      </div>
      <div>
        <p className="font-semibold text-[#002147] mb-1">Travel (separate — not in registration checkout)</p>
        {!compact ? (
          <p className="text-sm text-gray-600 mb-2">
            Estimated per athlete. NC United will share hotel, van, and flight guidance in the Team Hub.
          </p>
        ) : null}
        <PriceRows lines={AAU_SCHOLASTIC_TRAVEL_LINES} />
        <p className="mt-2 text-sm font-semibold text-gray-700 text-right tabular-nums">
          Travel subtotal: {formatAauScholasticDollars(AAU_SCHOLASTIC_TRAVEL_TOTAL_DOLLARS)}
        </p>
      </div>
      {!compact ? (
        <p className="text-sm text-gray-800 bg-white border border-[#D3B574]/40 rounded-lg px-4 py-3">
          <strong>Estimated all-in per athlete:</strong>{" "}
          {formatAauScholasticDollars(AAU_SCHOLASTIC_ESTIMATED_TRIP_TOTAL_DOLLARS)} (registration + apparel + hotel and van +
          flight). Meals and ground transport are extra.
        </p>
      ) : null}
    </div>
  )
}
