import Link from "next/link"
import type { BlueCurrentMember } from "@/lib/blue-current-members"
import { BlueHighSchoolCell } from "./blue-high-school-cell"

const GOLD = "#D3B574"

type Props = {
  members: BlueCurrentMember[]
}

export function BlueRosterTable({ members }: Props) {
  if (members.length === 0) {
    return (
      <div className="rounded-xl border-2 border-[#D3B574]/40 bg-white/50 p-8 text-center">
        <p className="text-[#03154C]/80">
          No current Blue members on record. Set NC United Team = Blue in Admin → Athletes for athletes with graduation year 2026 or later.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-[#D3B574]/40 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-[#D3B574]/50 bg-[#03154C]/5" style={{ borderColor: `${GOLD}80` }}>
              <th className="px-4 py-3 font-semibold text-[#03154C]">Name</th>
              <th className="px-4 py-3 font-semibold text-[#03154C]">High School</th>
              <th className="px-4 py-3 font-semibold text-[#03154C]">Weight</th>
              <th className="px-4 py-3 font-semibold text-[#03154C]">Accolades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D3B574]/20">
            {members.map((row) => (
              <tr key={row.id} className="hover:bg-[#03154C]/5 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/unified-profile/${row.id}`}
                    className="font-medium text-[#03154C] hover:text-[#D3B574] hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#03154C]/90">
                  <BlueHighSchoolCell schoolName={row.highschool} />
                </td>
                <td className="px-4 py-3 text-[#03154C]/90">{row.weight}</td>
                <td className="px-4 py-3 text-[#03154C]/90">
                  {row.accolades.length > 0 ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {row.accolades.map((a) => (
                        <span
                          key={a}
                          className="rounded px-2 py-0.5 text-xs font-medium bg-[#03154C]/10 text-[#03154C]"
                        >
                          {a}
                        </span>
                      ))}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
