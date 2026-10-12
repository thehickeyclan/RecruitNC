"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"

/**
 * Find any wrestler from any page of the coach portal: type a name or a high school, pick a row,
 * land on his profile. The list is the one Coach Home and New message search (lib/coach-roster.ts,
 * last competed weight), fetched the first time the box is used and filtered here as you type.
 *
 * Results are plain <a href>: app/layout.tsx navigates same-site links on capture.
 */
type Wrestler = { id: string; name: string; highschool: string | null; graduationyear: number | string | null; weightclass: string | null }

export function RecruitingSearch({ className = "" }: { className?: string }) {
  const [all, setAll] = useState<Wrestler[] | null>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  const load = () => {
    if (all) return
    fetch("/api/coach-messages/recipients", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAll(Array.isArray(d?.athletes) ? d.athletes : []))
      .catch(() => setAll([]))
  }

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", away)
    return () => document.removeEventListener("mousedown", away)
  }, [])

  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return (all ?? []).filter((a) => words.every((w) => `${a.name} ${a.highschool ?? ""}`.toLowerCase().includes(w))).slice(0, 8)
  }, [all, query])
  useEffect(() => setActive(0), [query])

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setOpen(false)
    if (!matches.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => (i + 1) % matches.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === "Enter") {
      window.location.href = `/athletes/${matches[active]!.id}`
    }
  }

  const typed = query.trim().length > 0
  return (
    <div ref={box} className={`relative ${className}`}>
      <label className="flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 focus-within:border-[#D3B574]">
        <Search className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            // Typing loads the list too: focus is not always reported (a restored tab, autofill).
            load()
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            load()
            setOpen(true)
          }}
          onKeyDown={onKey}
          placeholder="Search wrestlers or high schools"
          aria-label="Search wrestlers"
          autoComplete="off"
          className="w-full min-w-0 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {typed ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </label>
      {open && typed ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/15 bg-[#0f1c2e] shadow-2xl shadow-black/50">
          {all === null ? (
            <p className="px-3 py-3 text-sm text-white/50">Loading wrestlers…</p>
          ) : matches.length === 0 ? (
            <p className="px-3 py-3 text-sm text-white/50">
              No wrestler in the current classes matches.{" "}
              <a href="/prospects/all" className="font-semibold text-[#D3B574] hover:underline">
                Browse all athletes
              </a>
            </p>
          ) : (
            <ul role="listbox">
              {matches.map((a, i) => (
                <li key={a.id} role="option" aria-selected={i === active}>
                  <a
                    href={`/athletes/${a.id}`}
                    onMouseEnter={() => setActive(i)}
                    className={`flex min-h-[48px] flex-col justify-center px-3 py-2 ${i === active ? "bg-white/10" : ""}`}
                  >
                    <span className="truncate text-sm font-bold text-white">{a.name}</span>
                    <span className="truncate text-xs text-white/50">
                      {[a.graduationyear ? `Class of ${a.graduationyear}` : null, a.weightclass ? `${a.weightclass} lbs` : null, a.highschool].filter(Boolean).join(" · ")}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
