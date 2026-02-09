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
  return <BlueAlumniTable alumni={alumni} />
}
