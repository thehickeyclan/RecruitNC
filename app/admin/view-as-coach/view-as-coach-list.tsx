"use client"

import { useMemo, useState } from "react"

export type ProgramRow = { program: string; coaches: Array<{ userId: string; name: string; email: string | null; status: string | null; test: boolean }> }

export function ViewAsCoachList({ programs }: { programs: ProgramRow[] }) {
  const [q, setQ] = useState("")
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return programs
    return programs.filter((p) => p.program.toLowerCase().includes(t) || p.coaches.some((c) => `${c.name} ${c.email ?? ""}`.toLowerCase().includes(t)))
  }, [programs, q])
  return (
    <div className="mt-6">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a program or coach"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
        autoFocus
      />
      <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
        {shown.map((p) => (
          <li key={p.program} className="p-4">
            <p className="font-bold">{p.program}</p>
            <ul className="mt-2 space-y-1.5">
              {p.coaches.map((c) => (
                <li key={c.userId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 text-white/80">
                    {c.name}
                    {c.email ? <span className="text-white/45"> · {c.email}</span> : null}
                    {c.status && c.status !== "approved" ? <span className="ml-2 rounded bg-white/10 px-1.5 text-[11px] text-white/60">{c.status}</span> : null}
                    {c.test ? <span className="ml-2 rounded bg-white/10 px-1.5 text-[11px] text-white/60">test account</span> : null}
                  </span>
                  <span className="flex shrink-0 gap-3">
                    <a href={`/my-recruits?as=${encodeURIComponent(c.userId)}&view=coach`} className="font-semibold text-[#A3E635] underline">
                      My Recruits
                    </a>
                    <a href={`/coach-reports?as=${encodeURIComponent(c.userId)}`} className="text-white/70 underline hover:text-white">
                      Reports
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
        {!shown.length ? <li className="p-4 text-sm text-white/50">No program or coach matches.</li> : null}
      </ul>
    </div>
  )
}
