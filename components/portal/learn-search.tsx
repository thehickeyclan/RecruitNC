"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { searchLearn, type SearchEntry } from "@/lib/recruiting/learn/search-index"

const SUGGESTIONS = ["Who pays for a visit", "When can a coach call", "NIL", "Full ride", "Women's dates", "Fargo"]

/** Instant search across the whole Learn library; every result opens the section it came from. */
export function LearnSearch({ entries }: { entries: SearchEntry[] }) {
  const [q, setQ] = useState("")
  const results = useMemo(() => searchLearn(entries, q), [entries, q])
  return (
    <div className="relative">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the rules, the money, visits, tournaments…"
          aria-label="Search Learn"
          className="h-14 w-full rounded-xl border border-white/15 bg-[#0f1c2e] pl-12 pr-4 text-base text-white placeholder:text-white/40 focus:border-[#D3B574] focus:outline-none"
        />
      </label>
      {q.trim().length > 1 ? (
        <ul className="mt-2 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#0f1c2e]">
          {results.length ? (
            results.map((r) => (
              <li key={r.href + r.title}>
                <a href={r.href} className="flex min-w-0 flex-col px-4 py-3 hover:bg-white/[0.04]">
                  <span className="block text-sm font-bold text-white">{r.title}</span>
                  <span className="block text-xs text-[#D3B574]">{r.where}</span>
                  <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-white/55">{r.text}</span>
                </a>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-white/60">Nothing in the library matches that yet. Try fewer words.</li>
          )}
        </ul>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setQ(s)} className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/65 hover:border-[#D3B574] hover:text-white">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
