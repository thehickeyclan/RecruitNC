"use client"

import { useMemo } from "react"
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { ClubSlice } from "@/lib/toc/field-club-breakdown"
import { NO_CLUB_LABEL } from "@/lib/toc/field-club-breakdown"

/**
 * Club mix of the confirmed field.
 *
 * Sits on a dark admin surface, so every colour here is chosen against #0B1D3A rather than
 * taken from a default palette — recharts' defaults are tuned for white and several of them
 * disappear on navy.
 */

/** Distinguishable on navy, and colour-blind safe enough to survive a projector. */
const SLICE_COLORS = [
  "#D7B95A", // gold — the house colour leads
  "#4EA8DE", "#7ED957", "#F4845F", "#B79CED",
  "#4ECDC4", "#FF8FA3", "#FFD166", "#8AC926", "#5390D9",
]
const NO_CLUB_COLOR = "#4A5568"

export function TocFieldClubChart({ slices, total }: { slices: ClubSlice[]; total: number }) {
  // Long tails make an unreadable pie and an unreadable legend. Everything below two
  // athletes collapses into one slice, which is still honest because the legend names it.
  const { data, tail } = useMemo(() => {
    const named = slices.filter((s) => s.club !== NO_CLUB_LABEL)
    const noClub = slices.find((s) => s.club === NO_CLUB_LABEL)
    const major = named.filter((s) => s.count >= 2)
    const minor = named.filter((s) => s.count < 2)

    const rows: ClubSlice[] = [...major]
    if (minor.length > 0) {
      const count = minor.reduce((sum, s) => sum + s.count, 0)
      rows.push({
        club: `${minor.length} club${minor.length === 1 ? "" : "s"} with one wrestler`,
        count,
        percentage: Math.round((count / total) * 1000) / 10,
      })
    }
    if (noClub) rows.push(noClub)
    return { data: rows, tail: minor }
  }, [slices, total])

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-white/60">No confirmed athletes yet.</p>
  }

  const colorFor = (row: ClubSlice, index: number) =>
    row.club === NO_CLUB_LABEL ? NO_CLUB_COLOR : SLICE_COLORS[index % SLICE_COLORS.length]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="h-[280px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* isAnimationActive={false}: inside a CSS grid the surface measures 0x0 on first
                paint, and the mount animation captured that — every slice froze as a 2px
                sliver. A dashboard does not need the sweep. */}
            <Pie
              data={data}
              dataKey="count"
              nameKey="club"
              innerRadius={55}
              outerRadius={100}
              paddingAngle={1.5}
              stroke="#0B1D3A"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((row, i) => (
                <Cell key={row.club} fill={colorFor(row, i)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#060f1f", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff" }}
              // recharts 3 types the formatter with five params it does not always pass;
              // annotating the two we use keeps it honest without fighting the generic.
              formatter={((value: unknown, name: unknown) => [
                `${Number(value)} · ${((Number(value) / total) * 100).toFixed(1)}%`,
                String(name),
              ]) as never}
            />
            <Legend wrapperStyle={{ display: "none" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* The legend is a table, not chart furniture: the numbers are the point, and a pie
          alone cannot tell you 9 from 11. */}
      <div className="min-w-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wide text-white/60">
              <th className="pb-1.5 font-semibold">Club</th>
              <th className="pb-1.5 text-right font-semibold">Wrestlers</th>
              <th className="pb-1.5 text-right font-semibold">Share</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.club} className="border-b border-white/5 last:border-0">
                <td className="py-1.5 pr-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorFor(row, i) }} aria-hidden />
                    <span className="truncate text-white/90">{row.club}</span>
                  </span>
                </td>
                <td className="py-1.5 text-right font-semibold tabular-nums text-white">{row.count}</td>
                <td className="py-1.5 text-right tabular-nums text-white/70">{row.percentage}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/15">
              <td className="pt-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">Confirmed field</td>
              <td className="pt-1.5 text-right font-black tabular-nums text-white">{total}</td>
              <td className="pt-1.5 text-right text-xs tabular-nums text-white/70">100%</td>
            </tr>
          </tfoot>
        </table>

        {tail.length > 0 ? (
          <p className="mt-2 text-[11px] leading-relaxed text-white/60">
            Single-wrestler clubs: {tail.map((s) => s.club).join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  )
}
