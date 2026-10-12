"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { matchColleges, type College } from "@/lib/college-picker-match"


/**
 * The coach's college: pick it from the national program list the college map uses, or type one
 * that is not on it.
 *
 * It was a bare text box, and a school was spelt however each coach spelt it - three Virginia
 * coaches typed "The University of Virginia", "University of Virginia Wrestling" and "Virginia",
 * which named one program three ways on a family's profile and found its logo under none of them.
 * Choosing from the list writes the name we hold, exactly. Typing stays possible because a list is never complete,
 * and a coach must never be stopped at the door for that.
 */
export function CollegeField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [colleges, setColleges] = useState<College[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/college-map/names")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { colleges?: College[] } | null) => {
        if (!cancelled && Array.isArray(d?.colleges)) setColleges(d.colleges.filter((c) => c?.name))
      })
      // Without the list this is the text box it always was.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const matches = useMemo(() => matchColleges(colleges, value), [colleges, value])
  const chosen = colleges.some((c) => (c.value ?? c.name) === value.trim())
  const showList = open && !chosen && value.trim().length >= 2

  return (
    <div className="relative space-y-2">
      <Label htmlFor="college">College</Label>
      <Input
        id="college"
        autoComplete="off"
        placeholder="Start typing, e.g. NC State"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // Late enough for a tap on a suggestion to land first.
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        required
        disabled={disabled}
        role="combobox"
        aria-expanded={showList}
        aria-controls="college-suggestions"
        aria-autocomplete="list"
      />
      {showList ? (
        <ul id="college-suggestions" role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-md border bg-white py-1 text-left shadow-lg">
          {matches.map((c) => (
            <li key={c.id} role="option" aria-selected={false}>
              <button
                type="button"
                // mousedown, not click: the input's blur would close the list before a click registered.
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(c.value ?? c.name)
                  setOpen(false)
                }}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{c.name}</span>
                  {c.place ? <span className="block text-xs text-slate-500">{c.place}</span> : null}
                </span>
                {c.division ? <span className="shrink-0 text-xs text-slate-500">{c.division.replace("NCAA Division ", "D")}</span> : null}
              </button>
            </li>
          ))}
          <li className="px-3 py-2 text-xs text-slate-500">
            {matches.length ? "Not listed? Keep typing your college's full name." : "Not on our list yet. Type your college's full name and continue."}
          </li>
        </ul>
      ) : null}
    </div>
  )
}
