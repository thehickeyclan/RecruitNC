"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Check, Loader2, MapPin, Search, ShieldCheck, X } from "lucide-react"

export type PickedClub = { id: string; name: string; city: string | null }

type ClubOption = {
  id: string
  name: string
  city: string | null
  state: string
  logoUrl: string | null
  verified: boolean
  aliases: string[]
}

/**
 * Choose a club from the canonical list instead of typing one.
 *
 * Free text is what produced "Dark Horse" alongside "Darkhorse" and "Slyfox" alongside
 * "Sly Fox" — variants nobody notices until a club's athletes are split across two records.
 * Searching matches aliases too, so someone who knows the club as "RAW" still lands on
 * Raleigh Area Wolfpack.
 */
export function ClubPicker({
  value,
  onChange,
  label = "Wrestling club",
  helpText,
  allowClear = true,
}: {
  value: PickedClub | null
  onChange: (club: PickedClub | null) => void
  label?: string
  helpText?: string
  allowClear?: boolean
}) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<ClubOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [addingOpen, setAddingOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newCity, setNewCity] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  /**
   * Send the club for review without leaving the form. Name and town only — an athlete
   * naming their room should not have to go and find its street address, and a town is
   * enough to place a pin.
   */
  const submitNewClub = useCallback(async () => {
    const clubName = query.trim()
    const city = newCity.trim()
    if (clubName.length < 2) {
      setAddError("Enter the club's name.")
      return
    }
    if (!city) {
      setAddError("Which town do they train in?")
      return
    }

    setAdding(true)
    setAddError(null)
    try {
      const response = await fetch("/api/clubs/submissions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubName,
          city,
          state: "NC",
          notes: "Added from an athlete profile — needs an address and programs.",
        }),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        setAddError(body.error ?? "Couldn't send that just now.")
        setAdding(false)
        return
      }
      // Keep the typed name on the profile so it is not blank while the club is reviewed.
      onChange({ id: "", name: clubName, city })
      setSent(clubName)
      setAddingOpen(false)
    } catch {
      setAddError("Couldn't send that just now.")
    }
    setAdding(false)
  }, [query, newCity, onChange])

  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/clubs/search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
      const body = (await response.json()) as { clubs?: ClubOption[] }
      setOptions(body.clubs ?? [])
    } catch {
      setOptions([])
    }
    setLoading(false)
  }, [])

  // Debounced so a typed name is one request, not one per keystroke.
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => void search(query), 180)
    return () => clearTimeout(timer)
  }, [open, query, search])

  // Close when focus leaves the control entirely.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  const noMatches = useMemo(() => open && !loading && query.trim().length > 1 && !options.length, [open, loading, query, options])

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">{label}</label>

      {value ? (
        <div className="mt-1 flex items-center justify-between gap-3 rounded-sm border border-[#D7B968]/35 bg-[#D7B968]/10 px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-[#D7B968]" />
            <span className="truncate font-semibold text-white">{value.name}</span>
            {value.city ? <span className="shrink-0 text-sm text-white/50">{value.city}</span> : null}
          </span>
          {allowClear ? (
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setQuery("")
              }}
              aria-label="Clear selected club"
              className="shrink-0 rounded-sm p-1 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Start typing your club…"
            className="min-h-11 rounded-sm border-white/15 bg-[#020b18] pl-9 text-white placeholder:text-white/30"
          />
          {loading ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" /> : null}
        </div>
      )}

      {helpText ? <p className="mt-1 text-xs text-white/40">{helpText}</p> : null}

      {open && !value ? (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-sm border border-white/15 bg-[#071427] shadow-2xl">
          {options.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => {
                onChange({ id: club.id, name: club.name, city: club.city })
                setOpen(false)
                setQuery("")
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/10"
            >
              {club.logoUrl ? (
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-sm bg-white/10">
                  <Image src={club.logoUrl} alt="" fill className="object-contain p-0.5" sizes="32px" />
                </span>
              ) : (
                <MapPin className="h-4 w-4 shrink-0 text-white/30" />
              )}
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-medium text-white">{club.name}</span>
                  {club.verified ? <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-300" /> : null}
                </span>
                <span className="block truncate text-xs text-white/40">
                  {[club.city, club.state].filter(Boolean).join(", ")}
                  {/* Surfacing aliases explains why "RAW" matched "Raleigh Area Wolfpack". */}
                  {club.aliases.length ? ` · also ${club.aliases.slice(0, 2).join(", ")}` : ""}
                </span>
              </span>
            </button>
          ))}

          {/*
            Adding a missing club happens here rather than on another page. Sending someone
            to /clubs/submit mid-edit means abandoning the profile they were filling in, so
            most would simply give up and leave the club blank.
          */}
          {noMatches || (open && query.trim().length > 1 && options.length) ? (
            <div className="border-t border-white/10 px-3 py-3 text-sm">
              {sent ? (
                <p className="text-emerald-200">
                  Thanks — we&apos;ll review “{sent}” and add it to the map. Your profile is saved with that name
                  in the meantime.
                </p>
              ) : addingOpen ? (
                <div className="space-y-2">
                  <p className="font-medium text-white">Add “{query.trim()}”</p>
                  <Input
                    value={newCity}
                    onChange={(event) => setNewCity(event.target.value)}
                    placeholder="What town do they train in?"
                    className="min-h-10 rounded-sm border-white/15 bg-[#020b18] text-white placeholder:text-white/30"
                  />
                  {addError ? <p className="text-xs text-red-300">{addError}</p> : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void submitNewClub()}
                      disabled={adding}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-[#CC0000] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#a80000] disabled:opacity-60"
                    >
                      {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Send for review
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingOpen(false)}
                      className="rounded-sm px-3 py-1.5 text-sm text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingOpen(true)
                    setAddError(null)
                  }}
                  className="text-left text-white/60 hover:text-white"
                >
                  {options.length ? "Not seeing your club? " : `No club called “${query.trim()}”. `}
                  <span className="font-bold text-[#D7B968]">Add it here</span> — takes a second, no address needed.
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
