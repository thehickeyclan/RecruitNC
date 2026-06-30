"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { formatTocGradYear } from "@/lib/toc/invitations"
import { Loader2 } from "lucide-react"

export type TocAthleteSearchResult = {
  id: string
  name: string
  school: string | null
  graduationYear: number | null
  weightClass: string | number | null
  invitationStatus: string | null
  invitedWeightClass: number | null
}

type Props = {
  onSelect: (athlete: TocAthleteSearchResult) => void
  disabled?: boolean
}

export function AthleteSearchTypeahead({ onSelect, disabled }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TocAthleteSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noMatchHint, setNoMatchHint] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    setNoMatchHint(null)
    try {
      const res = await fetch(`/api/toc/athletes/search?q=${encodeURIComponent(q)}&limit=10`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Search failed")
      if (data.unavailable) {
        throw new Error(data.error || "Confirmations are not live yet. Contact NC United.")
      }
      setResults(data.athletes ?? [])
      if ((data.athletes ?? []).length === 0 && q.length >= 2) {
        if (typeof data.invitedCount === "number" && data.invitedCount === 0) {
          setNoMatchHint(
            "No one has been invited yet. An admin must send an invite first (Admin → TOC → Invitations), then this search will work.",
          )
        } else {
          setNoMatchHint(
            "That name isn’t on the invite list. Only athletes who received an invite appear here — use the link in your invite email, or ask NC United to send the invite.",
          )
        }
      }
      setOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed")
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void search(query.trim())
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor="toc-athlete-search" className="block text-sm font-semibold text-[#0B1D3A] mb-2">
        Find your RecruitNC profile
      </label>
      <div className="relative">
        <Input
          id="toc-athlete-search"
          type="search"
          autoComplete="off"
          placeholder="Start typing your name…"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          className="h-12 text-base border-[#0B1D3A]/20"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#0B1D3A]/40" />
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {open && results.length > 0 ? (
        <ul
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-[#0B1D3A]/15 bg-white shadow-lg"
          role="listbox"
        >
          {results.map((athlete) => (
            <li key={athlete.id}>
              <button
                type="button"
                role="option"
                className="w-full px-4 py-3 text-left hover:bg-[#f8f9fb] border-b border-[#0B1D3A]/5 last:border-0"
                onClick={() => {
                  onSelect(athlete)
                  setQuery(athlete.name)
                  setOpen(false)
                }}
              >
                <p className="font-semibold text-[#0B1D3A]">{athlete.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[athlete.school, formatTocGradYear(athlete.graduationYear), athlete.weightClass ? `${athlete.weightClass} lbs` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && !loading && query.trim().length >= 2 && results.length === 0 ? (
        <p className="absolute z-20 mt-1 w-full rounded-md border border-[#0B1D3A]/10 bg-white px-4 py-3 text-sm text-muted-foreground shadow-lg leading-relaxed">
          {noMatchHint ??
            "No invited athletes matched that name. Check spelling or contact NC United."}
        </p>
      ) : null}
    </div>
  )
}
