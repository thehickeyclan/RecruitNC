import Link from "next/link"
import type { BlueAlumnus } from "@/lib/blue-alumni"

const GOLD = "#D3B574"

type Props = {
  alumni: BlueAlumnus[]
}

function formatDivision(division: string): string {
  if (!division || division.trim() === "") return "—"
  const d = division.toLowerCase()
  if (d.includes("d1") || d.includes("division i")) return "NCAA DI"
  if (d.includes("d2") || d.includes("division ii")) return "NCAA DII"
  if (d.includes("d3") || d.includes("division iii")) return "NCAA DIII"
  if (d.includes("naia")) return "NAIA"
  if (d.includes("juco") || d.includes("njcaa")) return "NJCAA"
  return division
}

export function BlueAlumniTable({ alumni }: Props) {
  if (alumni.length === 0) {
    return (
      <div className="rounded-xl border-2 border-[#D3B574]/40 bg-white/50 p-8 text-center">
        <p className="text-[#03154C]/80">
          No Blue alumni on record yet. Alumni are set in Admin → Athletes (NC United Team = Blue) with graduation year in the past.
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
              <th className="px-4 py-3 font-semibold text-[#03154C]">Class</th>
              <th className="px-4 py-3 font-semibold text-[#03154C]">High School</th>
              <th className="px-4 py-3 font-semibold text-[#03154C]">College</th>
              <th className="px-4 py-3 font-semibold text-[#03154C]">Division</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D3B574]/20">
            {alumni.map((row) => (
              <tr key={row.id} className="hover:bg-[#03154C]/5 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/unified-profile/${row.id}`}
                    className="font-medium text-[#03154C] hover:text-[#D3B574] hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#03154C]/90">{row.graduationyear}</td>
                <td className="px-4 py-3 text-[#03154C]/90">{row.highschool || "—"}</td>
                <td className="px-4 py-3 text-[#03154C]/90">{row.college || "—"}</td>
                <td className="px-4 py-3 text-[#03154C]/90">{formatDivision(row.division)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
