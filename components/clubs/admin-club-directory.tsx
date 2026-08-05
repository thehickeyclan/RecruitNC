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
  instagramUrl: string | null
  facebookUrl: string | null
  contactPhone: string | null
  contactEmail: string | null
  latitude: number | null
  longitude: number | null
  verified: boolean
  status: string
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
  hasLocationText: boolean
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
  // Every club by default. Filtering to "needs an address" made a club vanish the instant
  // you gave it one, so you could not see what you had just saved or go back and correct it.
  const [onlyNeedsLocation, setOnlyNeedsLocation] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<ClubRow>>({})
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

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
      if (onlyNeedsLocation && (!club.needsLocation || club.status !== "active")) return false
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
      // Closed clubs are excluded from both counts. They are deliberately off the map, so
      // counting them as "not on the map" would make the address work look never-ending.
      needLocation: clubs.filter((c) => c.needsLocation && c.status === "active").length,
      mapped: clubs.filter((c) => !c.needsLocation && c.status === "active").length,
      closed: clubs.filter((c) => c.status !== "active").length,
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
        instagramUrl: draft.instagramUrl ?? "",
        facebookUrl: draft.facebookUrl ?? "",
        contactPhone: draft.contactPhone ?? "",
        contactEmail: draft.contactEmail ?? "",
        verified: draft.verified ?? club.verified,
        status: draft.status ?? club.status,
        ...programs,
      }),
    })
    const data = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) {
      setNote(data.error ?? "Save failed.")
      return
    }

    // Update this club in place rather than refetching. A reload re-sorts the list, so the
    // club you just saved would jump somewhere else the moment it gained an address —
    // leaving you unsure whether it saved and unable to correct it.
    const latitude = typeof data.latitude === "number" ? data.latitude : null
    const longitude = typeof data.longitude === "number" ? data.longitude : null
    setClubs((current) =>
      current.map((row) =>
        row.id === club.id
          ? {
              ...row,
              ...draft,
              programs,
              latitude,
              longitude,
              needsLocation: latitude === null || longitude === null,
              hasLocationText: Boolean(
                String(draft.address ?? "").trim() || String(draft.city ?? "").trim() || String(draft.zipCode ?? "").trim(),
              ),
            }
          : row,
      ),
    )
    setSavedId(club.id)
    setNote(`${club.name} — ${data.geocodeNote ?? "saved."}`)
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Clubs", summary.total],
          ["On the map", summary.mapped],
          ["Not on the map", summary.needLocation],
          ["Closed", summary.closed],
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
          {onlyNeedsLocation ? `Showing ${summary.needLocation} not on the map` : `Show ${summary.needLocation} not on the map`}
        </Button>
      </div>

      {note ? (
        <div className="rounded-sm border border-[#D7B968]/40 bg-[#D7B968]/10 p-3 text-sm text-[#F5E7BD]">{note}</div>
      ) : null}

      <div className="space-y-2">
        {visible.map((club) => {
          const open = openId === club.id
          return (
            <div
              key={club.id}
              className={`rounded-sm border bg-[#071427]/70 transition-colors ${
                savedId === club.id ? "border-emerald-500/50" : "border-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => (open ? setOpenId(null) : openEditor(club))}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">{club.name}</span>
                    {club.status !== "active" ? (
                      <Badge className="rounded-sm bg-white/10 text-white/60">
                        {club.status === "merged" ? "Merged" : "Closed"}
                      </Badge>
                    ) : null}
                    {club.verified && club.status === "active" ? (
                      <Badge className="rounded-sm bg-emerald-500/15 text-emerald-200">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Verified
                      </Badge>
                    ) : null}
                    {savedId === club.id ? (
                      <Badge className="rounded-sm bg-emerald-500/15 text-emerald-200">
                        <Check className="mr-1 h-3 w-3" />
                        Saved
                      </Badge>
                    ) : null}
                    {club.status !== "active" ? null : club.needsLocation ? (
                      <Badge className="rounded-sm bg-amber-500/15 text-amber-200">
                        {club.hasLocationText ? "Address didn't map" : "Needs an address"}
                      </Badge>
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
                    <Field label="Instagram">
                      <Input
                        value={draft.instagramUrl ?? ""}
                        onChange={(e) => setDraft({ ...draft, instagramUrl: e.target.value })}
                        placeholder="@rawwolfpack"
                        className={INPUT}
                      />
                    </Field>
                    <Field label="Facebook">
                      <Input
                        value={draft.facebookUrl ?? ""}
                        onChange={(e) => setDraft({ ...draft, facebookUrl: e.target.value })}
                        placeholder="@rawwolfpack or a page URL"
                        className={INPUT}
                      />
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

                  <Field label="Status">
                    <select
                      value={draft.status ?? club.status}
                      onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                      className={`h-10 w-full px-3 text-sm ${INPUT} border`}
                    >
                      <option value="active">Open — shown on the club map</option>
                      <option value="closed">Closed — off the map, page kept for its wrestlers</option>
                      <option value="merged">Merged into another club</option>
                    </select>
                    <p className="mt-1.5 text-xs text-white/40">
                      Closing a club never deletes it. Its athletes keep their history and its page stays live with a
                      notice, so old links still work — it just stops being offered as somewhere to train.
                    </p>
                  </Field>

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
