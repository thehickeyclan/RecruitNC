"use client"

import { useEffect, useState } from "react"
import { BlueAlumniTable } from "./blue-alumni-table"
import type { BlueAlumnus } from "@/lib/blue-alumni"

/**
 * Fetches Blue Alumni from the API on every load so divisions are always
 * from college_division_mappings (no cached page HTML).
 */
export function BlueAlumniClient() {
  const [alumni, setAlumni] = useState<BlueAlumnus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/blue/alumni?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data?.ok && Array.isArray(data.alumni)) {
          setAlumni(data.alumni)
        } else {
          setError(data?.error ?? "Failed to load alumni")
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load alumni")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border-2 border-[#D3B574]/40 bg-white/50 p-8 text-center">
        <p className="text-[#03154C]/80">Loading alumni…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-xl border-2 border-[#D3B574]/40 bg-white/50 p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }
  return <BlueAlumniTabs alumni={alumni} />
}

/**
 * One tab per graduating class, newest first.
 *
 * A single table sorted by class buried 2026 under 2025 and left the reader scanning a column
 * to answer "where did this year's group go". The years come from the data rather than a list
 * here, so next year's class appears on its own without anybody remembering to add it.
 */
function BlueAlumniTabs({ alumni }: { alumni: BlueAlumnus[] }) {
  const years = [...new Set(alumni.map((a) => Number(a.graduationyear)).filter(Number.isFinite))].sort(
    (a, b) => b - a,
  )
  const [active, setActive] = useState<number | null>(null)
  const selected = active != null && years.includes(active) ? active : years[0] ?? null

  if (!years.length) return <BlueAlumniTable alumni={alumni} />

  return (
    <div>
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
      <BlueAlumniTable alumni={alumni.filter((a) => Number(a.graduationyear) === selected)} />
    </div>
  )
}
