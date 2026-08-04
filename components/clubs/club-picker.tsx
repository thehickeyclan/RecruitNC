"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
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
  const wrapperRef = useRef<HTMLDivElement | null>(null)

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

          {noMatches ? (
            <div className="px-3 py-4 text-sm text-white/60">
              <p className="font-medium text-white">No club called “{query.trim()}”</p>
              <p className="mt-1">
                Check the spelling, or{" "}
                <Link href="/clubs/submit" className="font-bold text-[#D7B968] hover:underline">
                  submit your club
                </Link>{" "}
                and we&apos;ll add it.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
