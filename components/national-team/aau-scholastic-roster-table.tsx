import { cn } from "@/lib/utils"
import {
  type AauScholasticRosterRow,
  phoneDigitsForTel,
} from "@/lib/aau-scholastic-duals-2026-roster"
import { aauLinkClass, aauPriceClass } from "@/components/national-team/aau-scholastic-theme"

function Cell({ text }: { text: string }) {
  if (!text.trim()) {
    return <span className="text-white/35">TBD</span>
  }
  const tel = phoneDigitsForTel(text)
  if (!tel) {
    return <span className="text-white/90">{text}</span>
  }
  return (
    <a href={`tel:${tel}`} className={aauLinkClass}>
      {text}
    </a>
  )
}

export function AauScholasticRosterTable({
  rows,
  className,
}: {
  rows: AauScholasticRosterRow[]
  className?: string
}) {
  return (
    <div
      className={cn("overflow-x-auto touch-pan-x rounded-lg border border-[#B31B1B]/25", className)}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full text-sm min-w-[480px] border-collapse">
        <thead>
          <tr className="bg-[#B31B1B]/25 text-white">
            <th className="text-left py-3 px-3 font-semibold">Weight</th>
            <th className="text-left py-3 px-3 font-semibold">Wrestler</th>
            <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">DOB</th>
            <th className="text-left py-3 px-3 font-semibold">Cell #</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.weightLabel} className={cn("border-t border-white/10", i % 2 === 1 && "bg-white/[0.03]")}>
              <td className={cn("py-2.5 px-3 font-semibold tabular-nums whitespace-nowrap", aauPriceClass)}>
                {row.weightLabel}
              </td>
              <td className="py-2.5 px-3 font-medium text-white">
                {row.wrestler.trim() ? row.wrestler : <span className="text-white/35 font-normal">TBD</span>}
              </td>
              <td className="py-2.5 px-3 text-white/75 tabular-nums whitespace-nowrap">
                {row.dob.trim() ? row.dob : <span className="text-white/35">—</span>}
              </td>
              <td className="py-2.5 px-3">
                <Cell text={row.cell} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
