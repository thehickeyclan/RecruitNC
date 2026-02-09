"use client"

import { useState } from "react"
import { DivisionDropdown } from "@/components/division-dropdown"
import { getDivisionDisplayShort } from "@/lib/division-display"

const GOLD = "#D3B574"

type Props = {
  athleteId: string
  college: string
  division: string
  editable: boolean
}

/**
 * Division cell for Blue Alumni table. When editable (admin), inline dropdown
 * that updates the athlete's division and college_division_mappings.
 */
export function BlueAlumniDivisionCell({ athleteId, college, division, editable }: Props) {
  const [displayDivision, setDisplayDivision] = useState(division)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (newDivision: string) => {
    if (!editable) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/athletes/${athleteId}/division`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division: newDivision }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to update")
      setDisplayDivision(newDivision)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  if (!editable) {
    return (
      <td className="px-4 py-3 text-[#03154C]/90">
        {getDivisionDisplayShort(displayDivision)}
      </td>
    )
  }

  return (
    <td className="px-4 py-2 text-[#03154C]/90 align-middle">
      <div className="flex flex-col gap-0.5">
        <DivisionDropdown
          value={displayDivision}
          onValueChange={handleChange}
          placeholder="Select division"
          className="h-8 w-full max-w-[180px] border-[#D3B574]/50 bg-white text-sm"
          disabled={saving}
        />
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </td>
  )
}
