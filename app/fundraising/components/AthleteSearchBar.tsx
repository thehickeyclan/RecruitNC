"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { searchFundraisingAthletesAction } from "@/app/actions/fundraising/search-athletes"
import { HardLink } from "@/components/hard-link"
import { formatUsdWhole } from "./FundraisingHero"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export function AthleteSearchBar() {
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchFundraisingAthletesAction>>>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const runSearch = useCallback((term: string) => {
    clearTimeout(debounceRef.current)
    const t = term.trim()
    if (t.length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => {
      void searchFundraisingAthletesAction(t)
        .then(setHits)
        .finally(() => setLoading(false))
    }, 220)
  }, [])

  useEffect(() => {
    runSearch(q)
  }, [q, runSearch])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const showPanel = open && (q.trim().length >= 2 || loading)

  return (
    <div ref={wrapRef} className="relative mt-10 max-w-xl">
      <label
        htmlFor="fundraising-hub-athlete-search"
        className={`${displayFont("mb-2 block text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}
      >
        Find an athlete
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
          aria-hidden
        />
        <input
          id="fundraising-hub-athlete-search"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search for an athlete by name..."
          className="min-h-14 w-full rounded-lg border border-white/15 bg-black/35 py-3.5 pl-11 pr-4 text-base text-white shadow-inner placeholder:text-white/40 focus:border-[#C8A94A]/55 focus:outline-none focus:ring-2 focus:ring-[#C8A94A]/30"
        />
      </div>
      {showPanel ? (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl border border-white/12 bg-[#0B2545] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]"
          role="listbox"
          aria-label="Athlete search results"
        >
          {loading && hits.length === 0 ? (
            <p className="px-4 py-6 text-sm text-white/55">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-6 text-sm text-white/55">No athlete matches that search.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] py-1">
              {hits.map((h) => (
                <li key={h.slug} role="option">
                  <HardLink
                    href={`/fundraising/athletes/${h.slug}`}
                    className="flex items-center gap-3 px-3 py-3 transition hover:bg-white/[0.04]"
                    onNavigate={() => setOpen(false)}
                  >
                    {h.photoUrl ? (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={h.photoUrl} alt="" className="h-full w-full object-cover object-top" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/40 text-[10px] font-bold text-white/40">
                        NCU
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`${displayFont("truncate font-bold text-white")}`}>{h.name}</p>
                      <p className="truncate text-sm text-white/55">{h.school}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`${displayFont("text-sm font-extrabold tabular-nums text-[#C8A94A]")}`}>
                        {h.totalRaisedCents != null && h.totalRaisedCents > 0
                          ? formatUsdWhole(h.totalRaisedCents)
                          : "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-white/35">raised</p>
                    </div>
                  </HardLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
