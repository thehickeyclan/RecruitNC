"use client"

import { useEffect, useState } from "react"
import { BlueAlumniTable } from "./blue-alumni-table"
import type { BlueAlumnus } from "@/lib/blue-alumni"

/**
 * Fetches Blue Alumni from the API so divisions are always from college_division_mappings
 * and not from cached server-rendered HTML.
 */
export function BlueAlumniFetcher() {
  const [alumni, setAlumni] = useState<BlueAlumnus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const minLoading = new Promise((r) => setTimeout(r, 600))
    const fetchData = fetch(`/api/debug/blue-alumni-divisions?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.alumni)) {
          setAlumni(data.alumni as BlueAlumnus[])
        }
      })
    Promise.all([fetchData, minLoading]).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border-2 border-[#D3B574]/40 bg-white/50 p-8 text-center">
        <p className="text-[#03154C]/80">Loading alumni…</p>
      </div>
    )
  }

  return <BlueAlumniTable alumni={alumni} />
}
