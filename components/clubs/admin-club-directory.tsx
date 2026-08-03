"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, Search, ShieldCheck, Loader2, AlertTriangle, Check } from "lucide-react"

type ClubRow = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  website: string | null
  contactPhone: string | null
  contactEmail: string | null
  latitude: number | null
  longitude: number | null
  verified: boolean
  programs: {
    youth: boolean
    middleSchool: boolean
    highSchool: boolean
    boys: boolean
    girls: boolean
    freestyleGreco: boolean
  }
  aliases: string[]
  profileCount: number
  needsLocation: boolean
}

const PROGRAM_FIELDS = [
  ["youth", "Youth"],
  ["middleSchool", "Middle school"],
  ["highSchool", "High school"],
  ["boys", "Boys"],
  ["girls", "Girls"],
  ["freestyleGreco", "Freestyle / Greco"],
] as const

const INPUT = "rounded-sm border-white/15 bg-[#020b18] text-white placeholder:text-white/30"

export function AdminClubDirectory() {
  const [clubs, setClubs] = useState<ClubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [onlyNeedsLocation, setOnlyNeedsLocation] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<ClubRow>>({})
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/admin/clubs", { credentials: "include", cache: "no-store" })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.error ?? "Unable to load clubs.")
      setLoading(false)
      return
    }
    setClubs(data.clubs ?? [])
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return clubs.filter((club) => {
      if (onlyNeedsLocation && !club.needsLocation) return false
      if (!query) return true
      return [club.name, club.city, club.address, ...club.aliases]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [clubs, onlyNeedsLocation, search])

  const summary = useMemo(
    () => ({
      total: clubs.length,
      needLocation: clubs.filter((c) => c.needsLocation).length,
      mapped: clubs.filter((c) => !c.needsLocation).length,
    }),
    [clubs],
  )

  function openEditor(club: ClubRow) {
    setOpenId(club.id)
    setNote(null)
    setDraft({ ...club, programs: { ...club.programs } })
  }

  async function save(club: ClubRow) {
    setSaving(true)
    setNote(null)
    const programs = draft.programs ?? club.programs
    const response = await fetch(`/api/admin/clubs/${club.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name ?? club.name,
        address: draft.address ?? "",
        city: draft.city ?? "",
        state: draft.state ?? "NC",
        zipCode: draft.zipCode ?? "",
        website: draft.website ?? "",
        contactPhone: draft.contactPhone ?? "",
        contactEmail: draft.contactEmail ?? "",
        verified: draft.verified ?? club.verified,
        ...programs,
      }),
    })
    const data = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) {
      setNote(data.error ?? "Save failed.")
      return
    }
    setNote(data.geocodeNote ?? "Saved.")
    await load()
    setOpenId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-[#071427]/70 p-6 text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading clubs…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-sm border border-red-400/40 bg-red-500/10 p-5 text-red-100">
        <h3 className="font-black">Unable to load clubs</h3>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Clubs", summary.total],
          ["On the map", summary.mapped],
          ["Need an address", summary.needLocation],
        ].map(([label, value]) => (
          <div key={label} className="rounded-sm border border-white/10 bg-[#071427]/80 p-4">
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search club, city, or alias…"
            className={`pl-9 ${INPUT}`}
          />
        </div>
        <Button
          type="button"
          variant={onlyNeedsLocation ? "default" : "outline"}
          onClick={() => setOnlyNeedsLocation((value) => !value)}
          className={
            onlyNeedsLocation
              ? "rounded-sm bg-[#D7B968] text-[#071427] hover:bg-[#c4a75c]"
              : "rounded-sm border-white/15 bg-white/5 text-white hover:bg-white/10"
          }
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Needs an address only
        </Button>
      </div>

      {note ? (
        <div className="rounded-sm border border-[#D7B968]/40 bg-[#D7B968]/10 p-3 text-sm text-[#F5E7BD]">{note}</div>
      ) : null}

      <div className="space-y-2">
        {visible.map((club) => {
          const open = openId === club.id
          return (
            <div key={club.id} className="rounded-sm border border-white/10 bg-[#071427]/70">
              <button
                type="button"
                onClick={() => (open ? setOpenId(null) : openEditor(club))}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">{club.name}</span>
                    {club.verified ? (
                      <Badge className="rounded-sm bg-emerald-500/15 text-emerald-200">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Verified
                      </Badge>
                    ) : null}
                    {club.needsLocation ? (
                      <Badge className="rounded-sm bg-amber-500/15 text-amber-200">Needs an address</Badge>
                    ) : (
                      <Badge className="rounded-sm bg-white/10 text-white/60">
                        <MapPin className="mr-1 h-3 w-3" />
                        On the map
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 truncate text-sm text-white/45">
                    {[club.address, club.city].filter(Boolean).join(", ") || "No address on file"}
                    {club.aliases.length ? ` · also known as ${club.aliases.join(", ")}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-black text-[#D7B968]">{club.profileCount}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">profiles</div>
                </div>
              </button>

              {open ? (
                <div className="space-y-4 border-t border-white/10 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Club name">
                      <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={INPUT} />
                    </Field>
                    <Field label="Street address">
                      <Input
                        value={draft.address ?? ""}
                        onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                        placeholder="6109 Maddry Oaks Ct"
                        className={INPUT}
                      />
                    </Field>
                    <Field label="City">
                      <Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Raleigh" className={INPUT} />
                    </Field>
                    <Field label="ZIP">
                      <Input value={draft.zipCode ?? ""} onChange={(e) => setDraft({ ...draft, zipCode: e.target.value })} placeholder="27616" className={INPUT} />
                    </Field>
                    <Field label="Website">
                      <Input value={draft.website ?? ""} onChange={(e) => setDraft({ ...draft, website: e.target.value })} className={INPUT} />
                    </Field>
                    <Field label="Phone">
                      <Input value={draft.contactPhone ?? ""} onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })} className={INPUT} />
                    </Field>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#D7B968]">Programs</div>
                    <div className="flex flex-wrap gap-4">
                      {PROGRAM_FIELDS.map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 text-sm text-white/80">
                          <Checkbox
                            checked={Boolean(draft.programs?.[key])}
                            onCheckedChange={(checked) =>
                              setDraft({
                                ...draft,
                                programs: { ...(draft.programs ?? club.programs), [key]: checked === true },
                              })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <Checkbox
                      checked={Boolean(draft.verified)}
                      onCheckedChange={(checked) => setDraft({ ...draft, verified: checked === true })}
                    />
                    Verified — show the verified badge publicly
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={() => void save(club)} disabled={saving} className="rounded-sm bg-[#CC0000] text-white hover:bg-[#a80000]">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Save &amp; place on map
                    </Button>
                    <Button variant="outline" onClick={() => setOpenId(null)} className="rounded-sm border-white/15 bg-transparent text-white hover:bg-white/10">
                      Cancel
                    </Button>
                    <span className="text-xs text-white/40">
                      Coordinates are looked up from the address — city and ZIP alone is enough for a town-level pin.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}

        {!visible.length ? (
          <div className="rounded-sm border border-white/10 bg-[#071427]/70 p-6 text-center text-white/50">
            {onlyNeedsLocation ? "Every club has an address. Turn off the filter to see them all." : "No clubs match that search."}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-white/45">{label}</div>
      {children}
    </div>
  )
}
