"use client"

import { useState } from "react"
import { DivisionDropdown } from "@/components/division-dropdown"
import { getDivisionDisplayShort } from "@/lib/division-display"
import { useToast } from "@/components/ui/use-toast"
import { normalizeToCanonicalFull } from "@/lib/division-display"

type Props = {
  athleteId: string
  college: string
  division: string
  editable: boolean
}

/**
 * Division cell for Blue Alumni table. When editable (admin), inline dropdown
 * saves on change to athlete + college_division_mappings.
 */
export function BlueAlumniDivisionCell({ athleteId, college, division, editable }: Props) {
  const [displayDivision, setDisplayDivision] = useState(division)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleChange = async (newDivision: string) => {
    if (!editable) return
    const canonical = normalizeToCanonicalFull(newDivision) || newDivision
    if (!canonical.trim()) {
      setError("Pick a division to save")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/athletes/${athleteId}/division`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ division: canonical }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? `Save failed (${res.status})`)
      setDisplayDivision(canonical)
      toast({ title: "Saved", description: `Division set to ${canonical}` })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save"
      setError(msg)
      toast({ title: "Could not save", description: msg, variant: "destructive" })
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
