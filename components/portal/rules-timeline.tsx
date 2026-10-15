"use client"

import { useState } from "react"

import type { D1Track } from "@/lib/recruiting/learn/content"

export type TimelineCell = { level: string; what: string; when: string; href: string }
export type TrackTimeline = { anyAge: TimelineCell[]; byGrade: Record<"10" | "11" | "12", TimelineCell[]> }

const LEVEL_COLOR: Record<string, string> = {
  "Division I": "#EF4444",
  "Division II": "#3B82F6",
  "Division III": "#22C55E",
  "Junior college": "#A78BFA",
}
const COLUMNS: Array<{ key: "10" | "11" | "12"; label: string; sub: string }> = [
  { key: "10", label: "Sophomore year", sub: "and the summer after" },
  { key: "11", label: "Junior year", sub: "the recruiting year" },
  { key: "12", label: "Senior year", sub: "offers and signing" },
]

/**
 * When each level of college coach may first call, meet and host a wrestler, laid out across high
 * school, with "you are here" on the family's own wrestler. Every cell is a verified rule from the
 * library (lib/recruiting/learn/timeline.ts places each in its year); nothing here is written twice.
 */
export function RulesTimeline({
  tracks,
  labels,
  initial,
  grade,
  name,
}: {
  tracks: Record<D1Track, TrackTimeline>
  labels: Record<D1Track, string>
  initial: D1Track
  grade: number | null
  name: string | null
}) {
  const [track, setTrack] = useState<D1Track>(initial)
  const t = tracks[track]
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Which wrestler">
        {(Object.keys(labels) as D1Track[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === track}
            onClick={() => setTrack(k)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${k === track ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/60 hover:text-white"}`}
          >
            {labels[k]}
            {k === initial && name ? <span className="font-normal text-[#D3B574]"> · {name}</span> : null}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold text-white/55">
        Open at any age:{" "}
        {t.anyAge.map((c, i) => (
          <span key={c.level + c.what} className="text-white/80">
            {i ? " · " : ""}
            {c.level} {c.what.toLowerCase()}
          </span>
        ))}
        . NAIA and junior college coaches may call and write at any age.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const here = grade === Number(col.key)
          return (
            <section key={col.key} className={`relative rounded-xl border p-4 ${here ? "border-[#D3B574] bg-[#D3B574]/[0.07]" : "border-white/10 bg-[#0f1c2e]"}`}>
              {here ? (
                <span className="absolute -top-2.5 left-4 rounded-full bg-[#D3B574] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A1628]">
                  {name ? `${name} is here` : "You are here"}
                </span>
              ) : null}
              <h3 className="text-base font-black">{col.label}</h3>
              <p className="text-xs text-white/45">{col.sub}</p>
              <ul className="mt-3 space-y-2.5">
                {t.byGrade[col.key].length ? (
                  t.byGrade[col.key].map((c) => (
                    <li key={c.level + c.what}>
                      <a href={c.href} className="block rounded-lg border border-white/10 p-2.5 hover:border-white/30">
                        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: LEVEL_COLOR[c.level] ?? "#D3B574" }}>
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: LEVEL_COLOR[c.level] ?? "#D3B574" }} aria-hidden />
                          {c.level}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold text-white">{c.what}</span>
                        <span className="block text-xs text-white/60">{c.when}</span>
                      </a>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-white/40">No new contact or visit date this year.</li>
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
