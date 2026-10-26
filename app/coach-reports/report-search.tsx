"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"

/**
 * Find a wrestler on the report (Matt, 26 Oct 2026): filters the cards on the page as you type,
 * by name, school, weight or class. Cards carry their own `data-search` text; nothing is fetched.
 */
export function ReportSearch() {
  const [q, setQ] = useState("")
  const [shown, setShown] = useState<number | null>(null)
  useEffect(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    const cards = [...document.querySelectorAll<HTMLElement>("[data-search]")]
    let n = 0
    for (const c of cards) {
      const hit = terms.every((t) => (c.dataset.search ?? "").includes(t))
      c.hidden = !hit
      if (hit) n++
    }
    setShown(terms.length ? n : null)
  }, [q])
  return (
    <div className="relative mt-4 print:hidden">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search wrestler, school or weight"
        aria-label="Search wrestlers in this report"
        className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-24 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#d4af55] focus:outline-none focus:ring-2 focus:ring-[#d4af55]/40"
      />
      {shown !== null && (
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-xs text-gray-500">
          {shown} found
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="rounded p-0.5 hover:bg-gray-100"><X className="h-3.5 w-3.5" /></button>
        </span>
      )}
    </div>
  )
}
