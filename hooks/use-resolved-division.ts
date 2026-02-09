"use client"

import { useState, useEffect } from "react"

async function fetchDivision(college: string): Promise<string> {
  if (!college?.trim()) return ""
  try {
    const res = await fetch(`/api/get-college-division?college=${encodeURIComponent(college)}`, {
      cache: "no-store",
    })
    const data = await res.json()
    return data.division ?? ""
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
