"use client"

import { useMemo, useState } from "react"
import { Check, Plus, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { searchColleges, suggestColleges, type CollegeLike } from "@/lib/college-match"

const DIVISIONS = ["NCAA Division I", "NCAA Division II", "NCAA Division III", "NAIA", "NJCAA", "Other"]

/**
 * Assigning a coach to a college.
 *
 * This was a plain dropdown of every college on file: no search, no hint, and no way to add one,
 * so a coach from a school we had never listed (Washington & Jefferson, the first coach through
 * the new sign-up) could not be assigned at all. Now it suggests from what the coach typed and
 * their email domain, searches, and adds a missing college in place.
 */
export function CollegePicker({
  colleges,
  value,
  onChange,
  onCollegeAdded,
  hint,
}: {
  colleges: CollegeLike[]
  /** The selected college id, or "" for none. */
  value: string
  onChange: (id: string) => void
  onCollegeAdded: (college: CollegeLike) => void
  hint: { institution?: string | null; email?: string | null }
}) {
  const [query, setQuery] = useState("")
  const [division, setDivision] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = colleges.find((c) => c.id === value) ?? null
  const suggestions = useMemo(() => suggestColleges(colleges, hint).slice(0, 3), [colleges, hint])
  const results = useMemo(() => (query.trim() ? searchColleges(colleges, query).slice(0, 8) : []), [colleges, query])
  const exact = colleges.some((c) => c.name.trim().toLowerCase() === query.trim().toLowerCase())
  // What to offer to add: what they searched, else what the coach typed when nothing matched.
  const addName = query.trim() || (!suggestions.length ? String(hint.institution ?? "").trim() : "")

  const label = (c: CollegeLike) => `${c.name}${c.division ? ` — ${c.division}` : ""}`

  const add = async () => {
    if (!addName) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/colleges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: addName, division }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.college) throw new Error(data?.error || "Could not add that college.")
      onCollegeAdded(data.college)
      onChange(data.college.id)
      setQuery("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that college.")
    } finally {
      setAdding(false)
    }
  }

  const row = (c: CollegeLike) => (
    <button
      key={c.id}
      type="button"
      onClick={() => onChange(c.id)}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-100"
    >
      <span>{label(c)}</span>
      {c.id === value ? <Check className="h-4 w-4 text-green-600" aria-hidden /> : null}
    </button>
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm">
        <span className={selected ? "font-medium" : "italic text-gray-500"}>{selected ? label(selected) : "Not assigned"}</span>
        {selected ? (
          <button type="button" onClick={() => onChange("")} className="text-xs text-gray-500 hover:underline">
            Clear
          </button>
        ) : null}
      </div>

      {hint.institution ? (
        <p className="text-xs text-gray-500">
          They entered: <span className="font-medium text-gray-700">{hint.institution}</span>
        </p>
      ) : null}

      {suggestions.length && !query.trim() ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-1">
          <p className="flex items-center gap-1 px-2 pt-1 text-xs font-semibold text-amber-800">
            <Sparkles className="h-3 w-3" aria-hidden /> Suggested
          </p>
          {suggestions.map(row)}
        </div>
      ) : null}

      <Input placeholder="Search colleges…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {results.length ? <div className="max-h-48 overflow-y-auto rounded-md border p-1">{results.map(row)}</div> : null}
      {query.trim() && !results.length ? <p className="px-1 text-xs text-gray-500">No college on file matches.</p> : null}

      {addName && !exact ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2">
          <span className="text-sm">
            Add <span className="font-medium">&ldquo;{addName}&rdquo;</span>
          </span>
          <Select value={division} onValueChange={setDivision}>
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              {DIVISIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" onClick={() => void add()} disabled={adding}>
            <Plus className="mr-1 h-3 w-3" aria-hidden />
            {adding ? "Adding…" : "Add & assign"}
          </Button>
          <p className="w-full text-xs text-gray-500">Edit the search box first to use a shorter name, e.g. &ldquo;Washington &amp; Jefferson&rdquo;.</p>
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
