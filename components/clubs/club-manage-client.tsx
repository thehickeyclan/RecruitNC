"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Facebook, Instagram, Loader2, MapPin, ShieldCheck } from "lucide-react"

type ManagedClub = {
  id: string
  name: string
  address: string | null
  city: string | null
  zipCode: string | null
  website: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  contactPhone: string | null
  contactEmail: string | null
  verified: boolean
  latitude: number | null
  longitude: number | null
  programs: {
    youth: boolean
    middleSchool: boolean
    highSchool: boolean
    boys: boolean
    girls: boolean
    freestyleGreco: boolean
  }
}

const PROGRAM_FIELDS = [
  ["youth", "Youth"],
  ["middleSchool", "Middle school"],
  ["highSchool", "High school"],
  ["boys", "Boys"],
  ["girls", "Girls"],
  ["freestyleGreco", "Freestyle / Greco"],
] as const

const INPUT = "mt-1 rounded-sm border-white/15 bg-[#020b18] text-white placeholder:text-white/30"

export function ClubManageClient() {
  const [clubs, setClubs] = useState<ManagedClub[]>([])
  const [loading, setLoading] = useState(true)
  const [signedOut, setSignedOut] = useState(false)
  const [draft, setDraft] = useState<Record<string, ManagedClub>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/clubs/manage", { credentials: "include", cache: "no-store" })
    if (response.status === 401) {
      setSignedOut(true)
      setLoading(false)
      return
    }
    const data = await response.json().catch(() => ({}))
    const list: ManagedClub[] = data.clubs ?? []
    setClubs(list)
    setDraft(Object.fromEntries(list.map((club) => [club.id, { ...club, programs: { ...club.programs } }])))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(club: ManagedClub) {
    const edit = draft[club.id]
    if (!edit) return
    setSavingId(club.id)
    setNote(null)
    const response = await fetch("/api/clubs/manage", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clubId: club.id,
        address: edit.address ?? "",
        city: edit.city ?? "",
        zipCode: edit.zipCode ?? "",
        website: edit.website ?? "",
        instagramUrl: edit.instagramUrl ?? "",
        facebookUrl: edit.facebookUrl ?? "",
        contactPhone: edit.contactPhone ?? "",
        contactEmail: edit.contactEmail ?? "",
        ...edit.programs,
      }),
    })
    const data = await response.json().catch(() => ({}))
    setSavingId(null)
    setNote(response.ok ? (data.geocodeNote ?? "Saved.") : (data.error ?? "Save failed."))
    if (response.ok) await load()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-[#071427]/70 p-6 text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your clubs…
      </div>
    )
  }

  if (signedOut) {
    return (
      <Card className="rounded-sm border-white/10 bg-[#071427]/90 text-white">
        <CardContent className="p-6">
          <h2 className="text-2xl font-black">Sign in to manage your club</h2>
          <p className="mt-2 text-white/65">You need the account you claimed the club with.</p>
          <Button asChild className="mt-4 rounded-sm bg-[#CC0000] text-white hover:bg-[#a80000]">
            <Link href="/auth/signin?returnTo=/clubs/manage">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!clubs.length) {
    return (
      <Card className="rounded-sm border-white/10 bg-[#071427]/90 text-white">
        <CardContent className="p-6">
          <ShieldCheck className="h-8 w-8 text-[#D7B968]" />
          <h2 className="mt-3 text-2xl font-black">No clubs yet</h2>
          <p className="mt-2 max-w-xl text-white/65">
            You don&apos;t manage a club yet. Find yours on the map and use &ldquo;Claim this listing&rdquo; — we review
            every claim by hand, so it may take a day or two.
          </p>
          <Button asChild className="mt-4 rounded-sm bg-[#CC0000] text-white hover:bg-[#a80000]">
            <Link href="/clubs">Find your club</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {note ? (
        <div className="rounded-sm border border-[#D7B968]/40 bg-[#D7B968]/10 p-3 text-sm text-[#F5E7BD]">{note}</div>
      ) : null}

      {clubs.map((club) => {
        const edit = draft[club.id] ?? club
        return (
          <Card key={club.id} className="rounded-sm border-white/10 bg-[#071427]/90 text-white">
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">{club.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-white/50">
                    <MapPin className="h-3.5 w-3.5 text-[#D7B968]" />
                    {club.latitude && club.longitude ? "On the map" : "Not on the map yet — add an address below"}
                  </p>
                </div>
                {club.verified ? (
                  <span className="rounded-sm bg-emerald-500/15 px-2.5 py-1 text-sm text-emerald-200">Verified</span>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Street address">
                  <Input
                    value={edit.address ?? ""}
                    onChange={(e) => setDraft({ ...draft, [club.id]: { ...edit, address: e.target.value } })}
                    placeholder="Where you practise"
                    className={INPUT}
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={edit.city ?? ""}
                    onChange={(e) => setDraft({ ...draft, [club.id]: { ...edit, city: e.target.value } })}
                    className={INPUT}
                  />
                </Field>
                <Field label="ZIP">
                  <Input
                    value={edit.zipCode ?? ""}
                    onChange={(e) => setDraft({ ...draft, [club.id]: { ...edit, zipCode: e.target.value } })}
                    className={INPUT}
                  />
                </Field>
                <Field label="Website">
                  <Input
                    value={edit.website ?? ""}
                    onChange={(e) => setDraft({ ...draft, [club.id]: { ...edit, website: e.target.value } })}
                    className={INPUT}
                  />
                </Field>
                <Field label={<span className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" /> Instagram</span>}>
                  <Input
                    value={edit.instagramUrl ?? ""}
                    onChange={(e) => setDraft({ ...draft, [club.id]: { ...edit, instagramUrl: e.target.value } })}
                    placeholder="@yourclub"
                    className={INPUT}
                  />
                </Field>
                <Field label={<span className="flex items-center gap-1.5"><Facebook className="h-3.5 w-3.5" /> Facebook</span>}>
                  <Input
                    value={edit.facebookUrl ?? ""}
                    onChange={(e) => setDraft({ ...draft, [club.id]: { ...edit, facebookUrl: e.target.value } })}
                    placeholder="@yourclub"
                    className={INPUT}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={edit.contactPhone ?? ""}
                    onChange={(e) => setDraft({ ...draft, [club.id]: { ...edit, contactPhone: e.target.value } })}
                    className={INPUT}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    value={edit.contactEmail ?? ""}
                    onChange={(e) => setDraft({ ...draft, [club.id]: { ...edit, contactEmail: e.target.value } })}
                    className={INPUT}
                  />
                </Field>
              </div>

              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#D7B968]">Programs you run</div>
                <div className="flex flex-wrap gap-4">
                  {PROGRAM_FIELDS.map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-white/80">
                      <Checkbox
                        checked={Boolean(edit.programs[key])}
                        onCheckedChange={(checked) =>
                          setDraft({
                            ...draft,
                            [club.id]: { ...edit, programs: { ...edit.programs, [key]: checked === true } },
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => void save(club)}
                  disabled={savingId === club.id}
                  className="rounded-sm bg-[#CC0000] text-white hover:bg-[#a80000]"
                >
                  {savingId === club.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save changes
                </Button>
                <span className="text-xs text-white/40">
                  Your pin is placed from the address — city and ZIP alone is enough. To change the club name or the
                  verified badge, contact us.
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">{label}</div>
      {children}
    </div>
  )
}
