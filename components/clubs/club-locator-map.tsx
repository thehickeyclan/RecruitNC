"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ClubMapPin, ClubMapResponse } from "@/lib/clubs/club-map-types"
import { ExternalLink, LocateFixed, MapPin, Search, ShieldCheck, Users } from "lucide-react"

const NC_BOUNDS = {
  minLat: 33.65,
  maxLat: 36.7,
  minLng: -84.45,
  maxLng: -75.25,
}

function pinPosition(pin: ClubMapPin, index: number) {
  const x = ((pin.longitude - NC_BOUNDS.minLng) / (NC_BOUNDS.maxLng - NC_BOUNDS.minLng)) * 100
  const y = (1 - (pin.latitude - NC_BOUNDS.minLat) / (NC_BOUNDS.maxLat - NC_BOUNDS.minLat)) * 100
  const offset = ((index % 5) - 2) * 0.7

  return {
    left: `${Math.min(96, Math.max(4, x + offset))}%`,
    top: `${Math.min(90, Math.max(8, y - offset))}%`,
  }
}

function clubMatches(pin: ClubMapPin, query: string) {
  if (!query.trim()) return true
  const haystack = [pin.name, pin.city, pin.state, pin.address, pin.website].filter(Boolean).join(" ").toLowerCase()
  return haystack.includes(query.trim().toLowerCase())
}

function ClubLogo({ pin }: { pin: ClubMapPin }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/10">
      <Image
        src={pin.logoUrl || "/wrestling-club-logo.png"}
        alt={`${pin.name} logo`}
        fill
        className="object-contain p-1"
        sizes="48px"
      />
    </div>
  )
}

function PinDetails({ pin }: { pin: ClubMapPin }) {
  return (
    <Card className="border-white/10 bg-slate-950/90 text-white shadow-2xl">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <ClubLogo pin={pin} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-black">{pin.name}</h3>
              {pin.verified ? (
                <Badge className="bg-emerald-500/15 text-emerald-200">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-300">
              {[pin.city, pin.state].filter(Boolean).join(", ") || "North Carolina"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-2xl font-black text-amber-300">{pin.athleteCount}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Athletes</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-2xl font-black text-sky-200">{pin.boysCount}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Boys</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-2xl font-black text-pink-200">{pin.girlsCount}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Girls</div>
          </div>
        </div>

        {pin.recentCommits.length ? (
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
              Recent college commits
            </div>
            <div className="space-y-2">
              {pin.recentCommits.map((commit, index) => (
                <div key={`${commit.name}-${commit.college}-${index}`} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span className="font-semibold text-white">{commit.name}</span>
                  <span className="text-slate-400"> → </span>
                  <span className="text-slate-200">{commit.college}</span>
                  {commit.classYear ? <span className="text-slate-500"> · {commit.classYear}</span> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-amber-400 text-slate-950 hover:bg-amber-300">
            <Link href={pin.profileHref}>View RecruitNC athletes</Link>
          </Button>
          {pin.website ? (
            <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
              <a href={pin.website} target="_blank" rel="noopener noreferrer">
                Website <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function ClubLocatorMap() {
  const [data, setData] = useState<ClubMapResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [genderFilter, setGenderFilter] = useState("all")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [minAthletes, setMinAthletes] = useState("0")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    fetch("/api/clubs/map-pins", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: ClubMapResponse) => {
        if (!mounted) return
        setData(payload)
        setSelectedId(payload.pins?.[0]?.id ?? null)
      })
      .catch((error) => {
        if (!mounted) return
        setData({
          success: false,
          error: error instanceof Error ? error.message : "Failed to load clubs.",
          pins: [],
          unlocatedClubs: [],
          summary: {
            mappedClubs: 0,
            unlocatedClubs: 0,
            athletesRepresented: 0,
            commitsRepresented: 0,
            verifiedClubs: 0,
          },
        })
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const filteredPins = useMemo(() => {
    const minimum = Number(minAthletes) || 0
    return (data?.pins ?? []).filter((pin) => {
      if (!clubMatches(pin, query)) return false
      if (verifiedOnly && !pin.verified) return false
      if (pin.athleteCount < minimum) return false
      if (genderFilter === "boys" && pin.boysCount === 0) return false
      if (genderFilter === "girls" && pin.girlsCount === 0) return false
      return true
    })
  }, [data?.pins, genderFilter, minAthletes, query, verifiedOnly])

  const selectedPin = useMemo(() => {
    return filteredPins.find((pin) => pin.id === selectedId) ?? filteredPins[0] ?? null
  }, [filteredPins, selectedId])

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-200">
        Loading North Carolina club map…
      </div>
    )
  }

  if (!data?.success && data?.setupNeeded) {
    return (
      <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-6 text-amber-50">
        <h3 className="text-xl font-black">Club map database setup needed</h3>
        <p className="mt-2 text-amber-100/90">{data.error}</p>
      </div>
    )
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-3xl font-black text-white">{data?.summary.mappedClubs ?? 0}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Mapped clubs</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-3xl font-black text-white">{data?.summary.athletesRepresented ?? 0}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">RecruitNC athletes</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-3xl font-black text-white">{data?.summary.commitsRepresented ?? 0}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">College commits</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-3xl font-black text-white">{data?.summary.verifiedClubs ?? 0}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Verified clubs</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-3xl font-black text-white">{data?.summary.unlocatedClubs ?? 0}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Need location</div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search club, city, or website…"
              className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-500"
            />
          </div>

          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Boys & girls</SelectItem>
              <SelectItem value="boys">Boys athletes</SelectItem>
              <SelectItem value="girls">Girls athletes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={minAthletes} onValueChange={setMinAthletes}>
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Athletes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any size</SelectItem>
              <SelectItem value="5">5+ athletes</SelectItem>
              <SelectItem value="10">10+ athletes</SelectItem>
              <SelectItem value="25">25+ athletes</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={verifiedOnly ? "default" : "outline"}
            onClick={() => setVerifiedOnly((value) => !value)}
            className={
              verifiedOnly
                ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                : "border-white/10 bg-white/5 text-white hover:bg-white/10"
            }
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Verified
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.22),transparent_35%),linear-gradient(145deg,#071427,#0b2444_55%,#071427)] p-4">
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.24em] text-amber-300">
                <LocateFixed className="h-4 w-4" />
                Club locator
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">North Carolina wrestling clubs</h2>
            </div>
            <Badge className="bg-white/10 text-white">{filteredPins.length} visible</Badge>
          </div>

          <div className="relative z-10 h-[440px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/20">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-50" aria-hidden="true">
              <polygon
                points="5,70 12,49 25,39 39,41 50,34 65,36 82,43 95,54 88,63 73,64 62,70 52,71 41,83 25,86 13,80"
                fill="rgba(255,255,255,0.08)"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="0.6"
              />
              <text x="50" y="58" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="7" fontWeight="800">
                NC
              </text>
            </svg>

            {filteredPins.map((pin, index) => {
              const active = selectedPin?.id === pin.id
              return (
                <button
                  key={pin.id}
                  type="button"
                  onClick={() => setSelectedId(pin.id)}
                  className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border transition ${
                    active
                      ? "border-amber-200 bg-amber-300 text-slate-950 shadow-[0_0_0_8px_rgba(251,191,36,0.2)]"
                      : "border-white/30 bg-red-600 text-white hover:bg-amber-300 hover:text-slate-950"
                  }`}
                  style={pinPosition(pin, index)}
                  aria-label={`Select ${pin.name}`}
                >
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-xs font-black">
                    {pin.athleteCount || <MapPin className="h-4 w-4" />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          {selectedPin ? <PinDetails pin={selectedPin} /> : null}

          <div className="max-h-[430px] space-y-3 overflow-auto pr-1">
            {filteredPins.map((pin) => (
              <button
                key={pin.id}
                type="button"
                onClick={() => setSelectedId(pin.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedPin?.id === pin.id
                    ? "border-amber-300/70 bg-amber-300/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ClubLogo pin={pin} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-white">{pin.name}</div>
                    <div className="truncate text-sm text-slate-400">
                      {[pin.city, pin.state].filter(Boolean).join(", ") || "North Carolina"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-amber-300">{pin.athleteCount}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">athletes</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {data?.unlocatedClubs?.length ? (
        <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-amber-50">
          <h3 className="flex items-center gap-2 text-xl font-black">
            <Users className="h-5 w-5" />
            Clubs showing in profiles that still need verified locations
          </h3>
          <p className="mt-2 text-sm text-amber-100/80">
            These are coming from athlete profile text. Add them to <code>wrestling_clubs</code>, give them aliases,
            and store coordinates once to place them on the map.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.unlocatedClubs.slice(0, 18).map((club) => (
              <div key={club.normalizedName} className="rounded-xl border border-amber-200/10 bg-slate-950/40 p-3">
                <div className="font-semibold text-white">{club.name}</div>
                <div className="mt-1 text-sm text-amber-100/75">
                  {club.athleteCount} athletes · {club.commitCount} commits
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
