"use client"

import { useMemo, useState } from "react"
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

/**
 * Who is actually in a slice.
 *
 * The counts are only trustworthy if the grouping is, and the grouping merges spellings —
 * so being able to read the names is how a wrong merge gets caught.
 */
function SliceCard({ row }: { row: ClubSlice }) {
  return (
    <div className="w-max min-w-[13rem] max-w-[22rem] rounded-lg border border-white/15 bg-[#060f1f] p-3 shadow-xl">
      <p className="text-sm font-bold text-white">{row.club}</p>
      <p className="mt-0.5 text-xs text-white/70">
        {row.count} wrestler{row.count === 1 ? "" : "s"} · {row.percentage}%
      </p>
      {row.athletes.length > 0 ? (
        <ul className="mt-2 max-h-56 space-y-0.5 overflow-y-auto text-xs leading-snug text-white/85">
          {row.athletes.map((name) => (
            <li key={name} className="whitespace-nowrap">{name}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs italic text-white/50">No names on file</p>
      )}
    </div>
  )
}

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
        // Name them as "Athlete (Club)" — for a one-wrestler club the club is the thing
        // you are checking, so the name alone would not tell you whether it grouped right.
        athletes: minor
          .flatMap((m) => m.athletes.map((a) => `${a} (${m.club})`))
          .sort((a, b) => a.localeCompare(b)),
      })
    }
    if (noClub) rows.push(noClub)
    return { data: rows, tail: minor }
  }, [slices, total])

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-white/60">No confirmed athletes yet.</p>
  }

  // Hovering a row is the faster way to audit a long list than aiming at a thin slice.
  const [hovered, setHovered] = useState<string | null>(null)

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
              cursor={false}
              wrapperStyle={{ zIndex: 30 }}
              content={((props: { active?: boolean; payload?: Array<{ payload?: ClubSlice }> }) => {
                const row = props.active ? props.payload?.[0]?.payload : null
                return row ? <SliceCard row={row} /> : null
              }) as never}
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
              <tr
                key={row.club}
                className="relative border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
                onMouseEnter={() => setHovered(row.club)}
                onMouseLeave={() => setHovered((c) => (c === row.club ? null : c))}
              >
                <td className="relative py-1.5 pr-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorFor(row, i) }} aria-hidden />
                    <span className="truncate text-white/90">{row.club}</span>
                  </span>
                  {hovered === row.club ? (
                    <div className="absolute left-0 top-full z-30 mt-1">
                      <SliceCard row={row} />
                    </div>
                  ) : null}
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
