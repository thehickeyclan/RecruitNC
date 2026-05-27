import { cn } from "@/lib/utils"
import {
  type AauScholasticRosterRow,
  phoneDigitsForTel,
} from "@/lib/aau-scholastic-duals-2026-roster"

function Cell({ text }: { text: string }) {
  if (!text.trim()) {
    return <span className="text-gray-400">TBD</span>
  }
  const tel = phoneDigitsForTel(text)
  if (!tel) {
    return <span className="text-gray-800">{text}</span>
  }
  return (
    <a href={`tel:${tel}`} className="text-[#003366] font-medium hover:underline">
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
      className={cn("overflow-x-auto touch-pan-x", className)}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full text-sm min-w-[480px] border-collapse">
        <thead>
          <tr className="bg-[#003366] text-white">
            <th className="text-left py-3 px-3 font-semibold">Weight</th>
            <th className="text-left py-3 px-3 font-semibold">Wrestler</th>
            <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">DOB</th>
            <th className="text-left py-3 px-3 font-semibold">Cell #</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.weightLabel} className={cn("border-t border-gray-100", i % 2 === 1 && "bg-gray-50/80")}>
              <td className="py-2.5 px-3 font-semibold text-[#002147] tabular-nums whitespace-nowrap">
                {row.weightLabel}
              </td>
              <td className="py-2.5 px-3 font-medium text-[#002147]">
                {row.wrestler.trim() ? row.wrestler : <span className="text-gray-400 font-normal">TBD</span>}
              </td>
              <td className="py-2.5 px-3 text-gray-700 tabular-nums whitespace-nowrap">
                {row.dob.trim() ? row.dob : <span className="text-gray-400">—</span>}
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
