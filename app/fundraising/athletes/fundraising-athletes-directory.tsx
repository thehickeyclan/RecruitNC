"use client"

import { useMemo, useState } from "react"
import type { FundraisingAthleteIndexRow } from "@/lib/fundraising/athlete-fundraising-profiles"
import { HardLink } from "@/components/hard-link"
import { FundraisingAthleteDirectoryAvatar } from "@/app/fundraising/components/fundraising-athlete-directory-avatar"

export function FundraisingAthletesDirectory({ rows }: { rows: FundraisingAthleteIndexRow[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) => {
      const hay = `${r.displayName} ${r.code} ${r.sublabel ?? ""} ${r.hrefSlug}`.toLowerCase()
      return hay.includes(t)
    })
  }, [rows, query])

  return (
    <div className="mt-8">
      <label htmlFor="fundraising-athletes-search" className="sr-only">
        Search athletes by name, school, or code
      </label>
      <input
        id="fundraising-athletes-search"
        name="fundraising-athletes-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, school, or NCU code…"
        autoComplete="off"
        spellCheck={false}
        className="w-full max-w-md min-h-12 rounded-lg border border-white/15 bg-[#0B2545]/90 px-4 py-3 text-base text-white shadow-inner placeholder:text-white/40 focus:border-[#C8A94A]/70 focus:outline-none focus:ring-2 focus:ring-[#C8A94A]/35"
      />
      <p className="mt-2 text-xs text-white/45 tabular-nums">
        {filtered.length === rows.length
          ? `${rows.length} athlete${rows.length === 1 ? "" : "s"}`
          : `${filtered.length} of ${rows.length} shown`}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-white/55">
          No athletes match &ldquo;{query.trim()}&rdquo;. Try another spelling or NCU code.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <li key={r.athleteId}>
              <HardLink
                href={`/fundraising/athletes/${r.hrefSlug}`}
                className="flex min-h-[4.5rem] touch-manipulation flex-row items-center gap-4 rounded-lg border border-white/10 bg-[#0B2545]/80 px-4 py-4 transition hover:border-[#C8A94A]/40"
              >
                <FundraisingAthleteDirectoryAvatar photoUrl={r.photoUrl} />
                <div className="min-w-0 flex-1">
                  <span className="font-[family-name:var(--font-fundraising-display)] text-lg font-bold text-white">
                    {r.displayName}
                  </span>
                  {r.sublabel ? <p className="mt-0.5 text-sm text-white/55">{r.sublabel}</p> : null}
                  <span className="mt-1 block font-mono text-xs text-white/45">{r.code}</span>
                </div>
              </HardLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
