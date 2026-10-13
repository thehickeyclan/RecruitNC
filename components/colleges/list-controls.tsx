"use client"

import { Mail, Star } from "lucide-react"

import {
  COLLEGE_LIST_STATUSES,
  COLLEGE_LIST_STATUS_LABEL,
  type CollegeListItem,
  type CollegeListStatus,
} from "@/lib/college-programs/list"

/**
 * Save a school, then say where things stand. Saving is one tap; the status is a plain dropdown
 * because the steps are a sequence a parent already knows, not something to learn.
 */
export function ListControls({
  item,
  busy,
  onSave,
  onRemove,
  onEmail,
}: {
  item: CollegeListItem | undefined
  busy: boolean
  onSave: (status?: CollegeListStatus) => void
  onRemove: () => void
  onEmail: () => void
}) {
  if (!item) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => onSave()}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[#D7B968] px-3 py-2 text-sm font-bold text-[#F5D985] hover:bg-[#D7B968]/15 disabled:opacity-50"
      >
        <Star className="h-4 w-4" /> Save to My List
      </button>
    )
  }
  return (
    <div className="mt-3 rounded-sm border border-[#D7B968]/40 bg-[#D7B968]/10 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F5D985]">
          <Star className="h-3.5 w-3.5 fill-[#F5D985]" /> On My List
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={onRemove}
          className="text-xs text-white/60 hover:text-white hover:underline"
        >
          Remove
        </button>
      </div>
      <select
        value={item.status}
        disabled={busy}
        onChange={(e) => onSave(e.target.value as CollegeListStatus)}
        aria-label="Where things stand with this school"
        className="mt-2 h-9 w-full rounded-sm border border-white/15 bg-[#0B1D3A] px-2 text-sm text-white"
      >
        {COLLEGE_LIST_STATUSES.map((status) => (
          <option key={status} value={status}>
            {COLLEGE_LIST_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onEmail}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#CC0000] px-3 py-2 text-sm font-bold text-white hover:bg-[#a80000]"
      >
        <Mail className="h-4 w-4" /> Email the coach
      </button>
    </div>
  )
}
