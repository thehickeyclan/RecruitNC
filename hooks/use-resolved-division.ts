"use client"

import { useState, useEffect } from "react"

const cache: Record<string, string> = {}

async function fetchDivision(college: string): Promise<string> {
  if (!college?.trim()) return ""
  const key = college.trim().toLowerCase()
  if (cache[key]) return cache[key]
  try {
    const res = await fetch(`/api/get-college-division?college=${encodeURIComponent(college)}`)
    const data = await res.json()
    const div = data.division ?? ""
    cache[key] = div
    return div
  } catch {
    return ""
  }
}

/** Resolve division from college_division_mappings (single source). Use for any college division display. */
export function useResolvedDivision(college: string | null | undefined): string {
  const [division, setDivision] = useState("")
  const key = (college ?? "").trim()
  useEffect(() => {
    if (!key) {
      setDivision("")
      return
    }
    fetchDivision(key).then(setDivision)
  }, [key])
  return division
}
