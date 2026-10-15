"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { COLLEGE_LIST_STATUSES, COLLEGE_LIST_STATUS_LABEL, type CollegeListStatus } from "@/lib/college-programs/list"

/** Where a college sits on the family's list, changed in place. Saved on change; read-only in a family preview. */
export function StageSelect({ schoolId, status, readOnly = false }: { schoolId: string; status: CollegeListStatus; readOnly?: boolean }) {
  const [value, setValue] = useState(status)
  const [busy, setBusy] = useState(false)
  const change = async (next: CollegeListStatus) => {
    const before = value
    setValue(next)
    setBusy(true)
    const res = await fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId, status: next }) }).catch(() => null)
    if (!res?.ok) setValue(before)
    setBusy(false)
  }
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">Stage</span>
      <select
        value={value}
        disabled={busy || readOnly}
        onChange={(e) => change(e.target.value as CollegeListStatus)}
        className="h-9 w-full appearance-none rounded-lg border border-white/15 bg-[#0A1628] pl-3 pr-8 text-sm font-semibold text-white focus:border-[#D3B574] focus:outline-none disabled:opacity-70"
      >
        {COLLEGE_LIST_STATUSES.map((s) => (
          <option key={s} value={s}>
            {COLLEGE_LIST_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden />
    </label>
  )
}
