import { useMemo, useState } from "react"
import Link from "next/link"
import type { BlueAlumnus } from "@/lib/blue-alumni"
import { BlueCollegeCell } from "./blue-college-cell"

const GOLD = "#D3B574"

type Props = {
  alumni: BlueAlumnus[]
}

/**
 * One tab per graduating class, newest first.
 *
 * A single table sorted by class buried 2026 under 2025 and left the reader scanning a column
 * to answer "where did this year's group go". The years come from the data rather than a list
 * here, so next year's class appears on its own without anybody remembering to add it.
 *
 * The tabs live on the table rather than on a wrapper: /blue renders this component directly,
 * and a previous attempt put them in a wrapper nothing imports.
 */
export function BlueAlumniTable({ alumni }: Props) {
  const years = useMemo(
    () =>
      [...new Set(alumni.map((a) => Number(a.graduationyear)).filter(Number.isFinite))].sort(
        (a, b) => b - a,
      ),
    [alumni],
  )
  const [active, setActive] = useState<number | null>(null)
  const selected = active != null && years.includes(active) ? active : years[0] ?? null
  const shown = useMemo(
    () => (selected == null ? alumni : alumni.filter((a) => Number(a.graduationyear) === selected)),
    [alumni, selected],
  )

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
    <div>
      {years.length > 1 && (
        <div role="tablist" aria-label="Blue alumni by class" className="mb-4 flex flex-wrap gap-2">
          {years.map((year) => {
            const isActive = year === selected
            return (
              <button
                key={year}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActive(year)}
                className={
                  isActive
                    ? "rounded-lg border-2 border-[#D3B574] bg-[#03154C] px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border-2 border-[#D3B574]/40 bg-white px-4 py-2 text-sm font-semibold text-[#03154C] hover:border-[#D3B574]"
                }
              >
                Class of {year}
              </button>
            )
          })}
        </div>
      )}
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
            {shown.map((row) => (
              <tr key={row.id} className="hover:bg-[#03154C]/5 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/view-profile?id=${encodeURIComponent(row.id)}`}
                    className="font-medium text-[#03154C] hover:text-[#D3B574] hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#03154C]/90">{row.graduationyear}</td>
                <td className="px-4 py-3 text-[#03154C]/90">{row.highschool || "—"}</td>
                <td className="px-4 py-3 text-[#03154C]/90">
                  <BlueCollegeCell collegeName={row.college ?? ""} />
                </td>
                <td className="px-4 py-3 text-[#03154C]/90">{row.division || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
