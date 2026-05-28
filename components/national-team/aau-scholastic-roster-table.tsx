import { cn } from "@/lib/utils"
import { Hotel, Plane, Shirt } from "lucide-react"
import {
  type AauScholasticRosterRow,
  phoneDigitsForTel,
} from "@/lib/aau-scholastic-duals-2026-roster"
import {
  rosterRegistrationStatusForWrestler,
  type AauScholasticRosterRegistrationStatus,
} from "@/lib/aau-scholastic-roster-registration-status"
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

function RegistrationStatusIcons({ status }: { status: AauScholasticRosterRegistrationStatus | null }) {
  if (!status?.registered) return <span className="text-white/25">—</span>
  return (
    <div className="flex items-center gap-1.5" aria-label="Registration status">
      <span
        title="Registered & paid"
        className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-green-600 px-0.5 text-[10px] font-bold leading-none text-white"
      >
        R
      </span>
      {status.flight ? (
        <span title="Flight">
          <Plane className="h-4 w-4 shrink-0 text-sky-300" aria-hidden />
        </span>
      ) : null}
      {status.hotel ? (
        <span title="Hotel & team van">
          <Hotel className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
        </span>
      ) : null}
      {status.apparel ? (
        <span title="Apparel ordered">
          <Shirt className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
        </span>
      ) : null}
    </div>
  )
}

export function AauScholasticRosterTable({
  rows,
  registrationByWrestler,
  className,
}: {
  rows: AauScholasticRosterRow[]
  registrationByWrestler?: Record<string, AauScholasticRosterRegistrationStatus>
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
            <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const open = row.openSlot || !row.wrestler.trim()
            const regStatus = registrationByWrestler
              ? rosterRegistrationStatusForWrestler(row.wrestler, registrationByWrestler)
              : null
            return (
            <tr
              key={row.weightLabel}
              className={cn(
                "border-t border-white/10",
                i % 2 === 1 && "bg-white/[0.03]",
                open && "bg-[#B31B1B]/5",
              )}
            >
              <td className={cn("py-2.5 px-3 font-semibold tabular-nums whitespace-nowrap", aauPriceClass)}>
                {row.weightLabel}
              </td>
              <td className="py-2.5 px-3 font-medium text-white">
                {row.wrestler.trim() ? (
                  row.wrestler
                ) : (
                  <span className="text-[#FF7070]/90 font-normal italic">Open — TBD</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-white/75 tabular-nums whitespace-nowrap">
                {row.dob.trim() ? row.dob : <span className="text-white/35">—</span>}
              </td>
              <td className="py-2.5 px-3">
                <Cell text={row.cell} />
              </td>
              <td className="py-2.5 px-3">
                <RegistrationStatusIcons status={regStatus} />
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
