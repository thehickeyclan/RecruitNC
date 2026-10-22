"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { BOARD_STAGES, COLLEGE_LIST_STATUS_LABEL, boardStage, type CollegeListStatus } from "@/lib/college-programs/list"

/** Where a college sits on the family's list, changed in place. Saved on change; read-only in a family preview. */
export function StageSelect({ schoolId, status, readOnly = false, onChange }: { schoolId: string; status: CollegeListStatus; readOnly?: boolean; onChange?: (s: CollegeListStatus) => void }) {
  const [value, setValue] = useState<CollegeListStatus>(boardStage(status))
  const [busy, setBusy] = useState(false)
  const change = async (next: CollegeListStatus) => {
    const before = value
    setValue(next)
    setBusy(true)
    const res = await fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId, status: next }) }).catch(() => null)
    if (!res?.ok) setValue(before)
    else onChange?.(next)
    setBusy(false)
  }
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">Stage</span>
      <select
        value={value}
        disabled={busy || readOnly}
        onChange={(e) => change(e.target.value as CollegeListStatus)}
        className="h-8 w-full appearance-none rounded-lg border border-white/15 bg-[#0A1628] pl-2.5 pr-7 text-xs font-semibold text-white focus:border-[#D3B574] focus:outline-none disabled:opacity-70"
      >
        {BOARD_STAGES.map((s) => (
          <option key={s} value={s}>
            {COLLEGE_LIST_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden />
    </label>
  )
}
