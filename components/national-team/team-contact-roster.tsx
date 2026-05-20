import { cn } from "@/lib/utils"
import {
  type NhscaDualsContactRosterRow,
  phoneDigitsForTel,
} from "@/lib/nhsca-duals-2026-hub-contact-roster"

function ContactCell({ text, dark }: { text: string; dark?: boolean }) {
  if (!text.trim()) {
    return <span className={dark ? "text-white/35" : "text-gray-400"}>—</span>
  }
  const tel = phoneDigitsForTel(text)
  if (!tel) {
    return <span className={dark ? "text-white/90" : "text-gray-800"}>{text}</span>
  }
  return (
    <a
      href={`tel:${tel}`}
      className={
        dark
          ? "text-[#D3B574] font-medium hover:text-white hover:underline"
          : "text-[#003366] font-medium hover:underline"
      }
    >
      {text}
    </a>
  )
}

/** NHSCA Duals hub roster — wrestler, weight, athlete phone, parent contact. */
export function TeamContactRoster({
  rows,
  className,
  variant = "light",
}: {
  rows: NhscaDualsContactRosterRow[]
  className?: string
  variant?: "light" | "dark"
}) {
  const dark = variant === "dark"
  return (
    <div
      className={cn("overflow-x-auto touch-pan-x px-5 pb-5 md:px-6 md:pb-6", className)}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full text-sm min-w-[520px] border-collapse">
        <thead>
          <tr className={dark ? "bg-[#003366]/90 text-white" : "bg-[#003366] text-white"}>
            <th className="text-left py-3 px-3 font-semibold">Wrestler</th>
            <th className="text-center py-3 px-2 font-semibold w-20">Weight</th>
            <th className="text-left py-3 px-3 font-semibold">Phone</th>
            <th className="text-left py-3 px-3 font-semibold">Parent #</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.wrestler}-${row.weightClass}`}
              className={cn(
                "border-t",
                dark
                  ? cn("border-white/10", i % 2 === 1 && "bg-white/[0.04]")
                  : cn("border-gray-100", i % 2 === 1 && "bg-gray-50/80")
              )}
            >
              <td className={cn("py-2.5 px-3 font-medium", dark ? "text-white" : "text-[#002147]")}>{row.wrestler}</td>
              <td
                className={cn(
                  "py-2.5 px-2 text-center font-semibold tabular-nums",
                  dark ? "text-white/90" : "text-gray-800"
                )}
              >
                {row.weightClass}
              </td>
              <td className="py-2.5 px-3">
                <ContactCell text={row.phone} dark={dark} />
              </td>
              <td className="py-2.5 px-3 text-sm leading-snug">
                <ContactCell text={row.parentContact} dark={dark} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
