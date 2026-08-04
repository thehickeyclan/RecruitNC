"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ClubMapPin, ClubMapResponse } from "@/lib/clubs/club-map-types"
import { ExternalLink, Facebook, Instagram, LocateFixed, MapPin, Search, ShieldCheck, Users } from "lucide-react"
import { clubSlug } from "@/lib/clubs/club-slug"

const MAPBOX_SCRIPT_ID = "mapbox-gl-js"
const MAPBOX_CSS_ID = "mapbox-gl-css"
const MAPBOX_VERSION = "v3.21.0"
const MAP_GOLD = "#C9A84C"
const MAP_RED = "#cc0000"

const NC_BOUNDS: [[number, number], [number, number]] = [
  [-84.45, 33.55],
  [-75.15, 36.75],
]

const NC_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-87.25, 32.1],
  [-73.0, 38.0],
]

const NC_CENTER: [number, number] = [-79.75, 35.38]
const STATIC_MAP_WIDTH = 1000
const STATIC_MAP_HEIGHT = 560
const STATIC_MAP_PADDING = 64

const NC_OUTLINE_COORDS: Array<[number, number]> = [
  [-84.32, 35.22],
  [-83.94, 35.45],
  [-83.45, 35.56],
  [-83.1, 35.38],
  [-82.62, 35.2],
  [-81.55, 35.18],
  [-81.03, 34.95],
  [-80.18, 34.82],
  [-79.45, 34.62],
  [-78.9, 34.38],
  [-78.38, 33.91],
  [-77.83, 33.92],
  [-77.25, 34.22],
  [-76.72, 34.52],
  [-76.25, 34.78],
  [-75.78, 35.18],
  [-75.46, 35.64],
  [-75.9, 35.8],
  [-76.66, 35.96],
  [-77.45, 36.22],
  [-78.28, 36.54],
  [-79.44, 36.55],
  [-80.78, 36.55],
  [-81.72, 36.31],
  [-82.36, 36.12],
  [-83.08, 36.58],
  [-83.64, 36.32],
  [-84.04, 35.86],
  [-84.32, 35.22],
]

const STATIC_CITY_LABELS = [
  { name: "Asheville", coordinates: [-82.55, 35.6] as [number, number] },
  { name: "Charlotte", coordinates: [-80.84, 35.23] as [number, number] },
  { name: "Greensboro", coordinates: [-79.79, 36.07] as [number, number] },
  { name: "Raleigh", coordinates: [-78.64, 35.78] as [number, number] },
  { name: "Wilmington", coordinates: [-77.94, 34.23] as [number, number] },
]

type MapboxLike = {
  accessToken: string
  Map: new (options: Record<string, unknown>) => MapLike
  NavigationControl: new (options?: Record<string, unknown>) => unknown
}

type MapLike = {
  addControl: (control: unknown, position?: string) => void
  addSource: (id: string, source: Record<string, unknown>) => void
  addLayer: (layer: Record<string, unknown>, beforeId?: string) => void
  getSource: (id: string) => { setData?: (data: unknown) => void; getClusterExpansionZoom?: (clusterId: number, callback: (error: Error | null, zoom: number) => void) => void } | undefined
  getLayer: (id: string) => unknown
  setFilter: (layerId: string, filter: unknown[]) => void
  fitBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => void
  easeTo: (options: Record<string, unknown>) => void
  getZoom: () => number
  resize: () => void
  queryRenderedFeatures: (point: unknown, options?: Record<string, unknown>) => Array<Record<string, any>>
  on: (event: string, layerOrHandler: string | ((event?: any) => void), handler?: (event?: any) => void) => void
  once: (event: string, handler: () => void) => void
  remove: () => void
  getCanvas: () => { style: { cursor: string } }
}

declare global {
  interface Window {
    mapboxgl?: MapboxLike
  }
}

let mapboxPromise: Promise<MapboxLike> | null = null

function loadMapbox() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Mapbox can only load in the browser."))
  }

  if (window.mapboxgl) {
    return Promise.resolve(window.mapboxgl)
  }

  if (mapboxPromise) return mapboxPromise

  const pending = new Promise<MapboxLike>((resolve, reject) => {
    if (!document.getElementById(MAPBOX_CSS_ID)) {
      const link = document.createElement("link")
      link.id = MAPBOX_CSS_ID
      link.rel = "stylesheet"
      link.href = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.css`
      document.head.appendChild(link)
    }

    const existingScript = document.getElementById(MAPBOX_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.mapboxgl) resolve(window.mapboxgl)
        else reject(new Error("Mapbox loaded, but window.mapboxgl was unavailable."))
      })
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Mapbox.")))
      return
    }

    const script = document.createElement("script")
    script.id = MAPBOX_SCRIPT_ID
    script.src = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.js`
    script.async = true
    script.onload = () => {
      if (window.mapboxgl) resolve(window.mapboxgl)
      else reject(new Error("Mapbox loaded, but window.mapboxgl was unavailable."))
    }
    script.onerror = () => reject(new Error("Unable to load Mapbox."))
    document.body.appendChild(script)
  })

  // Don't cache a rejection — otherwise one failed load (offline, blocked CDN) poisons
  // every retry for the rest of the session.
  mapboxPromise = pending
  pending.catch(() => {
    mapboxPromise = null
  })

  return pending
}

/** Great-circle miles. Good enough to sort clubs by "how far is this from me". */
function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadiusMiles = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a))
}

function clubMatches(pin: ClubMapPin, query: string) {
  if (!query.trim()) return true
  const haystack = [pin.name, pin.city, pin.state, pin.address, pin.website].filter(Boolean).join(" ").toLowerCase()
  return haystack.includes(query.trim().toLowerCase())
}

function pinsToGeoJson(pins: ClubMapPin[]) {
  return {
    type: "FeatureCollection",
    features: pins.map((pin) => ({
      type: "Feature",
      properties: {
        pinId: pin.id,
        name: pin.name,
        athleteCount: pin.athleteCount,
        city: pin.city ?? "",
      },
      geometry: {
        type: "Point",
        coordinates: [pin.longitude, pin.latitude],
      },
    })),
  }
}

function projectToStaticMap([longitude, latitude]: [number, number]) {
  const [[minLon, minLat], [maxLon, maxLat]] = NC_BOUNDS
  const width = STATIC_MAP_WIDTH - STATIC_MAP_PADDING * 2
  const height = STATIC_MAP_HEIGHT - STATIC_MAP_PADDING * 2
  const x = STATIC_MAP_PADDING + ((longitude - minLon) / (maxLon - minLon)) * width
  const y = STATIC_MAP_PADDING + (1 - (latitude - minLat) / (maxLat - minLat)) * height
  return { x, y }
}

function buildStaticNcPath() {
  return NC_OUTLINE_COORDS.map((coord, index) => {
    const point = projectToStaticMap(coord)
    return `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  }).join(" ")
}

function StaticNcMapBackdrop({
  pins,
  selectedId,
  onSelectPin,
}: {
  pins: ClubMapPin[]
  selectedId: string | null
  onSelectPin: (id: string) => void
}) {
  const outlinePath = useMemo(buildStaticNcPath, [])

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050b14]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(215,185,104,0.16),transparent_28%),linear-gradient(135deg,rgba(11,29,58,0.88),rgba(2,6,14,0.96))]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:54px_54px]" />

      <svg
        viewBox={`0 0 ${STATIC_MAP_WIDTH} ${STATIC_MAP_HEIGHT}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="North Carolina club locator fallback map"
      >
        <defs>
          <filter id="club-static-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="club-nc-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#102748" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#06101f" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        <path d={`${outlinePath} Z`} fill="url(#club-nc-fill)" stroke={MAP_GOLD} strokeWidth="3.5" />
        <path d={`${outlinePath} Z`} fill="none" stroke={MAP_GOLD} strokeOpacity="0.24" strokeWidth="18" />

        {STATIC_CITY_LABELS.map((city) => {
          const point = projectToStaticMap(city.coordinates)
          return (
            <g key={city.name} opacity="0.72">
              <circle cx={point.x} cy={point.y} r="3" fill="#f5e7bd" />
              <text x={point.x + 10} y={point.y + 4} fill="#f5e7bd" fontSize="18" fontWeight="700">
                {city.name}
              </text>
            </g>
          )
        })}

        {pins.map((pin) => {
          const point = projectToStaticMap([pin.longitude, pin.latitude])
          const selected = pin.id === selectedId
          return (
            <g
              key={pin.id}
              onClick={() => onSelectPin(pin.id)}
              className="cursor-pointer"
              filter="url(#club-static-glow)"
            >
              <circle cx={point.x} cy={point.y} r={selected ? 22 : 17} fill={MAP_RED} opacity="0.58" />
              <circle cx={point.x} cy={point.y} r={selected ? 12 : 9} fill={MAP_RED} stroke={MAP_GOLD} strokeWidth="3" />
              <text
                x={point.x}
                y={point.y + 4}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontWeight="900"
              >
                {pin.athleteCount}
              </text>
            </g>
          )
        })}

        {!pins.length ? (
          <g>
            <text
              x={STATIC_MAP_WIDTH / 2}
              y={STATIC_MAP_HEIGHT / 2 - 8}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="28"
              fontWeight="900"
            >
              North Carolina club map
            </text>
            <text
              x={STATIC_MAP_WIDTH / 2}
              y={STATIC_MAP_HEIGHT / 2 + 28}
              textAnchor="middle"
              fill="#f5e7bd"
              fontSize="17"
              fontWeight="700"
              opacity="0.82"
            >
              Add approved clubs with coordinates to light up the map.
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  )
}

/**
 * What the club told us it runs. Club-supplied fact, so it is the headline on the card —
 * unlike the profile counts, which only say how many RecruitNC profiles name this club.
 */
function programLabels(pin: ClubMapPin): string[] {
  const p = pin.programs
  if (!p) return []
  const labels: string[] = []
  if (p.youth) labels.push("Youth")
  if (p.middleSchool) labels.push("Middle school")
  if (p.highSchool) labels.push("High school")
  if (p.boys) labels.push("Boys")
  if (p.girls) labels.push("Girls")
  if (p.freestyleGreco) labels.push("Freestyle / Greco")
  return labels
}

function ProgramChips({ pin, compact = false }: { pin: ClubMapPin; compact?: boolean }) {
  const labels = programLabels(pin)
  if (!labels.length) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "mt-1"}`}>
      {labels.map((label) => (
        <span
          key={label}
          className={`rounded-full border border-[#d7b968]/35 bg-[#d7b968]/10 text-[#f5e7bd] ${
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function ClubLogo({ pin }: { pin: ClubMapPin }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-white/10">
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

function PinDetails({ pin, distance }: { pin: ClubMapPin; distance?: number | null }) {
  return (
    <Card className="rounded-sm border-white/10 bg-[#071427]/95 text-white shadow-2xl">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <ClubLogo pin={pin} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-black">{pin.name}</h3>
              {pin.verified ? (
                <Badge className="rounded-sm bg-emerald-500/15 text-emerald-200">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-white/60">
              {[pin.city, pin.state].filter(Boolean).join(", ") || "North Carolina"}
              {typeof distance === "number" ? (
                <span className="font-semibold text-[#d7b968]"> · {Math.round(distance)} miles away</span>
              ) : null}
            </p>
            {pin.address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [pin.address, pin.city, pin.state, pin.zipCode].filter(Boolean).join(", "),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-start gap-1.5 text-sm text-white/70 hover:text-[#d7b968]"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d7b968]" />
                <span>
                  {pin.address}
                  {pin.zipCode ? ` · ${pin.zipCode}` : ""}
                  <span className="block text-xs text-[#d7b968]">Get directions</span>
                </span>
              </a>
            ) : null}
          </div>
        </div>

        {programLabels(pin).length ? (
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#d7b968]">Programs</div>
            <ProgramChips pin={pin} />
          </div>
        ) : null}

        {pin.contactPhone || pin.contactEmail ? (
          <div className="space-y-1 text-sm">
            {pin.contactPhone ? (
              <a href={`tel:${pin.contactPhone}`} className="block text-white/80 hover:text-[#d7b968]">
                {pin.contactPhone}
              </a>
            ) : null}
            {pin.contactEmail ? (
              <a href={`mailto:${pin.contactEmail}`} className="block truncate text-white/80 hover:text-[#d7b968]">
                {pin.contactEmail}
              </a>
            ) : null}
          </div>
        ) : null}

        {pin.instagramUrl || pin.facebookUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            {pin.instagramUrl ? (
              <a
                href={pin.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${pin.name} on Instagram`}
                className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Instagram className="h-4 w-4 text-[#d7b968]" />
                Instagram
              </a>
            ) : null}
            {pin.facebookUrl ? (
              <a
                href={pin.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${pin.name} on Facebook`}
                className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Facebook className="h-4 w-4 text-[#d7b968]" />
                Facebook
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-sm bg-[#cc0000] text-white hover:bg-[#a80000]">
            <Link href={`/clubs/${clubSlug(pin.name)}`}>Club page</Link>
          </Button>
          {pin.website ? (
            <Button asChild variant="outline" className="rounded-sm border-white/20 bg-transparent text-white hover:bg-white/10">
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

export function ClubLocatorMap({ accessToken }: { accessToken: string }) {
  const [data, setData] = useState<ClubMapResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  // Filters run on what a club says it RUNS, never on how many RecruitNC profiles name it.
  // Filtering by profile count hid clubs with real girls or youth programs simply because
  // none of their wrestlers happen to have a profile here.
  const [ageFilter, setAgeFilter] = useState("all")
  const [genderFilter, setGenderFilter] = useState("all")
  const [styleFilter, setStyleFilter] = useState("all")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [origin, setOrigin] = useState<{ lat: number; lon: number; label: string } | null>(null)
  const [locating, setLocating] = useState(false)
  const [zipInput, setZipInput] = useState("")
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const detailsRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLike | null>(null)
  const pinsRef = useRef<ClubMapPin[]>([])

  useEffect(() => {
    let mounted = true

    fetch("/api/clubs/map-pins", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: ClubMapResponse) => {
        if (!mounted) return
        setData(payload)
        // Deliberately no auto-selection. Selecting a club eases the map to it, so
        // picking one on load dropped every visitor into whichever town happened to sort
        // first instead of showing the state.
        setSelectedId(null)
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
    const matches = (data?.pins ?? []).filter((pin) => {
      if (!clubMatches(pin, query)) return false
      if (verifiedOnly && !pin.verified) return false

      const programs = pin.programs
      if (ageFilter !== "all" && !programs?.[ageFilter as "youth" | "middleSchool" | "highSchool"]) return false
      if (genderFilter !== "all" && !programs?.[genderFilter as "boys" | "girls"]) return false
      if (styleFilter === "freestyleGreco" && !programs?.freestyleGreco) return false
      return true
    })

    // Once we know where the visitor is, nearest first is the only ordering that matters.
    if (origin) {
      return [...matches].sort(
        (a, b) =>
          distanceMiles(origin.lat, origin.lon, a.latitude, a.longitude) -
          distanceMiles(origin.lat, origin.lon, b.latitude, b.longitude),
      )
    }
    return matches
  }, [data?.pins, ageFilter, genderFilter, styleFilter, origin, query, verifiedOnly])

  const useMyLocation = useCallback(() => {
    setLocationError(null)
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Your browser can't share a location. Enter a ZIP code instead.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ lat: position.coords.latitude, lon: position.coords.longitude, label: "your location" })
        setLocating(false)
      },
      () => {
        setLocating(false)
        setLocationError("We couldn't get your location. Enter a ZIP code instead.")
      },
      { timeout: 10_000 },
    )
  }, [])

  const useZip = useCallback(async () => {
    const zip = zipInput.trim()
    if (!/^\d{5}$/.test(zip)) {
      setLocationError("Enter a 5-digit ZIP code.")
      return
    }
    setLocationError(null)
    setLocating(true)
    try {
      // Server-side, so this does not depend on the public Mapbox token reaching the
      // browser bundle, and it inherits the Nominatim fallback.
      const response = await fetch(`/api/clubs/geocode?zip=${encodeURIComponent(zip)}`, { cache: "no-store" })
      const body = (await response.json()) as { latitude?: number; longitude?: number; error?: string }
      if (!response.ok || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
        setLocationError(body.error ?? "We couldn't find that ZIP code.")
      } else {
        setOrigin({ lat: body.latitude, lon: body.longitude, label: zip })
      }
    } catch {
      setLocationError("Couldn't look up that ZIP code just now.")
    }
    setLocating(false)
  }, [zipInput])

  const selectedPin = useMemo(() => {
    // No falling back to the first pin — nothing is selected until the visitor picks it,
    // which is what keeps the opening view on the whole state.
    return filteredPins.find((pin) => pin.id === selectedId) ?? null
  }, [filteredPins, selectedId])

  const hoveredPin = useMemo(() => {
    return filteredPins.find((pin) => pin.id === hoveredPinId) ?? null
  }, [filteredPins, hoveredPinId])

  useEffect(() => {
    pinsRef.current = filteredPins
  }, [filteredPins])

  /**
   * On a phone the details panel sits below the map, so tapping a pin appeared to do
   * nothing — the card rendered off-screen. Bring it into view on selection. Only on
   * small screens; on desktop the panel is already beside the map and scrolling would be
   * disorienting.
   */
  useEffect(() => {
    if (!selectedId || typeof window === "undefined") return
    if (window.matchMedia("(min-width: 1024px)").matches) return
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [selectedId])

  useEffect(() => {
    if (loading || mapRef.current || !mapContainerRef.current) return
    if (!accessToken) {
      setMapError("Mapbox token missing. Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in Vercel to render the live map.")
      return
    }

    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    loadMapbox()
      .then((mapboxgl) => {
        if (cancelled || !mapContainerRef.current) return

        mapboxgl.accessToken = accessToken
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: NC_CENTER,
          zoom: 6.2,
          maxBounds: NC_MAX_BOUNDS,
          minZoom: 5.3,
          maxZoom: 13,
          attributionControl: true,
        })

        mapRef.current = map
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")
        requestAnimationFrame(() => map.resize())

        // Mapbox sizes its canvas once and only re-reads the container when told to.
        // This column changes width whenever the results sidebar appears or disappears
        // (0 pins vs 1+), so without this the map keeps painting at its old width and
        // renders as a black strip. Covers orientation changes and window resizes too.
        if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (!cancelled) map.resize()
          })
          resizeObserver.observe(mapContainerRef.current)
        }

        // If the style never loads, "load" never fires and no layers are added. Surface
        // that instead of leaving an empty canvas with no explanation.
        const loadTimeout = window.setTimeout(() => {
          if (cancelled) return
          setMapReady((ready) => {
            if (!ready) {
              setMapError(
                "The Mapbox base map did not finish loading. The North Carolina outline below is a fallback — check the browser console and the token's URL restrictions.",
              )
            }
            return ready
          })
        }, 12_000)

        map.on("error", (event: any) => {
          if (cancelled) return
          // Mapbox style/tile failures arrive as an AJAXError whose `message` is often
          // empty — the useful part is `status` and `url`. Reading only `message` is why
          // a 401 could slip through here and leave a blank canvas with no explanation.
          const status = event?.error?.status ?? event?.error?.statusCode
          const message = String(event?.error?.message ?? event?.error ?? "").trim()
          const combined = [status, message].filter(Boolean).join(" ")

          if (status === 401 || status === 403 || /401|403|unauthorized|forbidden|access token|not authorized/i.test(combined)) {
            setMapError(
              "Mapbox is blocking the base map. Check that the token is active and that URL restrictions include this exact RecruitNC domain and preview URL.",
            )
            return
          }
          // Every other failure used to be swallowed here, which left a black rectangle
          // and no clue why. Report it.
          console.error("[club-locator] mapbox error:", event?.error ?? event)
          setMapError(combined ? `Mapbox error: ${combined}` : "Mapbox failed to render the base map.")
        })

        map.once("load", () => {
          if (cancelled) return
          window.clearTimeout(loadTimeout)
          setMapError(null)
          map.resize()
          map.fitBounds(NC_BOUNDS, { padding: 46, duration: 0 })

          map.addSource("nc-boundary", {
            type: "geojson",
            data: "/geo/nc-state.geojson",
          })

          map.addLayer({
            id: "nc-boundary-line",
            type: "line",
            source: "nc-boundary",
            paint: {
              "line-color": MAP_GOLD,
              "line-opacity": 0.95,
              "line-width": 2.75,
            },
          })

          map.addSource("clubs", {
            type: "geojson",
            data: pinsToGeoJson(pinsRef.current),
            cluster: true,
            clusterMaxZoom: 12,
            clusterRadius: 58,
          })

          map.addLayer({
            id: "club-cluster-glow",
            type: "circle",
            source: "clubs",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": MAP_GOLD,
              "circle-opacity": 0.32,
              "circle-radius": ["step", ["get", "point_count"], 34, 8, 44, 20, 58],
              "circle-blur": 0.8,
            },
          })

          map.addLayer({
            id: "club-clusters",
            type: "circle",
            source: "clubs",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": MAP_GOLD,
              "circle-opacity": 0.95,
              "circle-radius": ["step", ["get", "point_count"], 20, 8, 26, 20, 34],
              "circle-stroke-color": "#081324",
              "circle-stroke-width": 3,
            },
          })

          map.addLayer({
            id: "club-cluster-count",
            type: "symbol",
            source: "clubs",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 14,
              "text-allow-overlap": true,
            },
            paint: {
              "text-color": "#071427",
            },
          })

          map.addLayer({
            id: "club-pin-glow",
            type: "circle",
            source: "clubs",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": MAP_RED,
              "circle-opacity": 0.42,
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 24, 9, 32, 12, 42],
              "circle-blur": 0.72,
            },
          })

          map.addLayer({
            id: "club-pin-selected",
            type: "circle",
            source: "clubs",
            filter: ["==", ["get", "pinId"], ""],
            paint: {
              "circle-color": MAP_GOLD,
              "circle-opacity": 0.45,
              "circle-radius": 30,
              "circle-blur": 0.5,
            },
          })

          map.addLayer({
            id: "club-pins",
            type: "circle",
            source: "clubs",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": MAP_RED,
              "circle-radius": 14,
              "circle-stroke-color": MAP_GOLD,
              "circle-stroke-width": 3,
            },
          })

          map.addLayer({
            id: "club-pin-hover",
            type: "circle",
            source: "clubs",
            filter: ["==", ["get", "pinId"], ""],
            paint: {
              "circle-color": MAP_GOLD,
              "circle-radius": 21,
              "circle-opacity": 0.92,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
              "circle-blur": 0.18,
            },
          })

          // A single club is one dot. The old label printed the RecruitNC profile count
          // on the pin, which read as "this club has N wrestlers" — a number we cannot
          // know. Club names carry the meaning instead; counts are labelled on hover.
          map.addLayer({
            id: "club-pin-label",
            type: "symbol",
            source: "clubs",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 11,
              "text-offset": [0, 1.6],
              "text-anchor": "top",
              "text-optional": true,
            },
            paint: {
              "text-color": "#f5e7bd",
              "text-halo-color": "#071427",
              "text-halo-width": 1.4,
            },
          })

          map.on("click", "club-clusters", (event: any) => {
            const features = map.queryRenderedFeatures(event.point, { layers: ["club-clusters"] })
            const clusterId = features[0]?.properties?.cluster_id
            const coordinates = features[0]?.geometry?.coordinates
            const source = map.getSource("clubs")
            if (clusterId == null || !coordinates || !source?.getClusterExpansionZoom) return

            source.getClusterExpansionZoom(clusterId, (error, zoom) => {
              if (error) return
              map.easeTo({ center: coordinates, zoom })
            })
          })

          map.on("click", "club-pins", (event: any) => {
            const feature = event.features?.[0]
            const id = feature?.properties?.pinId
            if (id) setSelectedId(id)
          })

          map.on("mousemove", "club-pins", (event: any) => {
            const feature = event.features?.[0]
            const id = feature?.properties?.pinId
            if (!id) return

            setHoveredPinId(id)
            if (map.getLayer("club-pin-hover")) {
              map.setFilter("club-pin-hover", ["==", ["get", "pinId"], id])
            }
          })

          map.on("mouseleave", "club-pins", () => {
            setHoveredPinId(null)
            if (map.getLayer("club-pin-hover")) {
              map.setFilter("club-pin-hover", ["==", ["get", "pinId"], ""])
            }
          })

          for (const layer of ["club-clusters", "club-pins"]) {
            map.on("mouseenter", layer, () => {
              map.getCanvas().style.cursor = "pointer"
            })
            map.on("mouseleave", layer, () => {
              map.getCanvas().style.cursor = ""
            })
          }

          setMapReady(true)
        })
      })
      .catch((error) => {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : "Unable to load the map.")
        }
      })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      resizeObserver = null
      mapRef.current?.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [accessToken, loading])

  useEffect(() => {
    if (!mapReady) return
    const source = mapRef.current?.getSource("clubs")
    source?.setData?.(pinsToGeoJson(filteredPins))
  }, [filteredPins, mapReady])

  /**
   * Asking for clubs near you should move the map to you — sorting the list while leaving
   * the view on the whole state makes you find your own town by hand.
   *
   * Frames the area rather than a point: the visitor's location plus the nearest few clubs,
   * so the zoom suits somewhere with three clubs in ten miles and somewhere with one in
   * forty. Falls back to a fixed zoom when there is nothing nearby to frame.
   */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !origin) return
    const map = mapRef.current

    const nearest = [...filteredPins]
      .sort(
        (a, b) =>
          distanceMiles(origin.lat, origin.lon, a.latitude, a.longitude) -
          distanceMiles(origin.lat, origin.lon, b.latitude, b.longitude),
      )
      .slice(0, 3)

    if (!nearest.length) {
      map.easeTo({ center: [origin.lon, origin.lat], zoom: 9, duration: 800 })
      return
    }

    const lons = [origin.lon, ...nearest.map((pin) => pin.longitude)]
    const lats = [origin.lat, ...nearest.map((pin) => pin.latitude)]
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 70, maxZoom: 11, duration: 800 },
    )
  }, [mapReady, origin, filteredPins])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    if (mapRef.current.getLayer("club-pin-selected")) {
      mapRef.current.setFilter(
        "club-pin-selected",
        selectedPin ? ["==", ["get", "pinId"], selectedPin.id] : ["==", ["get", "pinId"], ""],
      )
    }
    if (!selectedPin) return
    mapRef.current.easeTo({
      center: [selectedPin.longitude, selectedPin.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 8.1),
      duration: 650,
    })
  }, [mapReady, selectedPin?.id])

  const setupMessage = !data?.success && data?.setupNeeded ? data.error : null
  const hardError = !data?.success && !data?.setupNeeded ? data?.error : null

  return (
    <section className="space-y-8">
      {setupMessage ? (
        <div className="rounded-sm border border-[#d7b968]/40 bg-[#d7b968]/10 p-5 text-[#f5e7bd]">
          <h3 className="text-xl font-black">Club map database setup needed</h3>
          <p className="mt-2 text-sm leading-6 text-[#f5e7bd]/85">{setupMessage}</p>
        </div>
      ) : null}

      {hardError ? (
        <div className="rounded-sm border border-red-400/40 bg-red-500/10 p-5 text-red-100">
          <h3 className="text-xl font-black">Unable to load club data</h3>
          <p className="mt-2 text-sm leading-6 text-red-100/85">{hardError}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Mapped clubs", data?.summary.mappedClubs ?? 0],
          ["RecruitNC profiles", data?.summary.athletesRepresented ?? 0],
          ["College commits", data?.summary.commitsRepresented ?? 0],
          ["Verified clubs", data?.summary.verifiedClubs ?? 0],
          ["Need location", data?.summary.unlocatedClubs ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-sm border border-white/10 bg-[#071427]/80 p-4 shadow-lg shadow-black/20">
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-white/10 bg-[#071427]/85 p-4 shadow-2xl shadow-black/35 sm:p-5">
        {/*
          Finding a club near you is the whole point of this page for a parent, so it sits
          above the filters rather than buried in them.
        */}
        <div className="mb-3 flex flex-col gap-2 rounded-sm border border-[#d7b968]/25 bg-[#d7b968]/5 p-3 sm:flex-row sm:items-center sm:gap-3">
          <Button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="min-h-11 w-full rounded-sm bg-[#d7b968] text-[#071427] hover:bg-[#c4a75c] sm:w-auto"
          >
            <LocateFixed className="mr-2 h-4 w-4" />
            {locating ? "Finding you…" : "Clubs near me"}
          </Button>

          <div className="flex flex-1 items-center gap-2">
            <Input
              value={zipInput}
              onChange={(event) => setZipInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void useZip()
              }}
              inputMode="numeric"
              placeholder="or enter your ZIP code"
              className="min-h-11 rounded-sm border-white/10 bg-white/5 text-white placeholder:text-white/35"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void useZip()}
              disabled={locating}
              className="rounded-sm border-white/15 bg-transparent text-white hover:bg-white/10"
            >
              Go
            </Button>
          </div>

          {origin ? (
            <div className="flex items-center gap-2 text-sm text-[#f5e7bd]">
              <span>Nearest to {origin.label} first</span>
              <button
                type="button"
                onClick={() => {
                  setOrigin(null)
                  setZipInput("")
                }}
                className="underline underline-offset-2 hover:text-white"
              >
                clear
              </button>
            </div>
          ) : null}
        </div>

        {locationError ? (
          <p className="mb-3 text-sm text-amber-200">{locationError}</p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-[1fr_170px_190px_150px_140px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/45" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search club, city, or website…"
              className="min-h-11 rounded-sm border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/35"
            />
          </div>

          {/* Age group is the first thing a parent needs to know — "do you take 8-year-olds?" */}
          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="min-h-11 w-full rounded-sm border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Age group" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#071427] text-white">
              <SelectItem value="all">Any age group</SelectItem>
              <SelectItem value="youth">Youth</SelectItem>
              <SelectItem value="middleSchool">Middle school</SelectItem>
              <SelectItem value="highSchool">High school</SelectItem>
            </SelectContent>
          </Select>

          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="min-h-11 w-full rounded-sm border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Boys / girls" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#071427] text-white">
              <SelectItem value="all">Boys &amp; girls</SelectItem>
              <SelectItem value="boys">Runs a boys program</SelectItem>
              <SelectItem value="girls">Runs a girls program</SelectItem>
            </SelectContent>
          </Select>

          <Select value={styleFilter} onValueChange={setStyleFilter}>
            <SelectTrigger className="min-h-11 w-full rounded-sm border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#071427] text-white">
              <SelectItem value="all">Any style</SelectItem>
              <SelectItem value="freestyleGreco">Freestyle / Greco</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={verifiedOnly ? "default" : "outline"}
            onClick={() => setVerifiedOnly((value) => !value)}
            className={
              verifiedOnly
                ? "rounded-sm bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                : "rounded-sm border-white/10 bg-white/5 text-white hover:bg-white/10"
            }
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Verified
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="relative overflow-hidden rounded-sm border border-white/10 bg-black shadow-2xl shadow-black/40">
          <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.25))]" />
          <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/70 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.24em] text-[#d7b968]">
                <LocateFixed className="h-4 w-4" />
                Club locator
              </div>
              <h2 className="mt-1 text-xl font-black text-white">North Carolina wrestling clubs</h2>
            </div>
            <div className="flex items-center gap-2">
              {selectedPin ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedId(null)
                    mapRef.current?.fitBounds(NC_BOUNDS, { padding: 46, duration: 600 })
                  }}
                  className="rounded-sm border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  Show all of NC
                </Button>
              ) : null}
              <Badge className="rounded-full bg-[#d7b968] px-3 py-1 text-[#071427]">{filteredPins.length} visible</Badge>
            </div>
          </div>

          <div className="relative h-[300px] bg-[#0b0f14] sm:h-[460px] lg:h-[580px]">
            {/*
              The North Carolina outline sits underneath the live map and shows through
              whenever Mapbox has not painted — still loading, token rejected, CDN blocked.
              Without it this area is just a black rectangle with no indication of why.
              Once Mapbox reports `load` its style is opaque and covers this entirely.
            */}
            {mapError ? (
              <div className="absolute inset-0 z-0">
                <StaticNcMapBackdrop
                  pins={filteredPins}
                  selectedId={selectedPin?.id ?? null}
                  onSelectPin={setSelectedId}
                />
              </div>
            ) : null}

            {/*
              Two divs on purpose. Mapbox adds `.mapboxgl-map` to whatever element it
              initialises into, and its stylesheet sets `position: relative` on that class.
              `.mapboxgl-map` and Tailwind's `.absolute` have equal specificity, and the
              Mapbox CSS is appended to <head> at runtime — after Tailwind — so it wins.
              A container relying on `absolute inset-0` therefore loses its positioning the
              instant the map loads and collapses to height:0, which renders as a blank box.
              The outer div owns the positioning and Mapbox never touches it; the inner one
              is sized with h-full/w-full, which holds whatever `position` ends up being.
            */}
            <div className="absolute inset-0 z-10">
              <div ref={mapContainerRef} className="h-full w-full" />
            </div>

            {hoveredPin && !mapError ? (
              <div className="pointer-events-none absolute left-4 top-4 z-30 w-[min(330px,calc(100%-2rem))] rounded-sm border border-[#d7b968]/45 bg-[#071427]/95 p-4 text-white shadow-[0_0_34px_rgba(215,185,104,0.2)] backdrop-blur">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d7b968]">Club preview</div>
                <div className="mt-1 truncate text-lg font-black">{hoveredPin.name}</div>
                <div className="mt-1 flex items-center gap-1 text-sm text-white/60">
                  <MapPin className="h-3.5 w-3.5 text-[#d7b968]" />
                  {[hoveredPin.city, hoveredPin.state].filter(Boolean).join(", ") || "North Carolina"}
                </div>
                {programLabels(hoveredPin).length ? (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                      Programs
                    </div>
                    <ProgramChips pin={hoveredPin} compact />
                  </div>
                ) : null}

                {hoveredPin.website ? (
                  <div className="mt-2 truncate text-xs text-[#d7b968]">
                    {hoveredPin.website.replace(/^https?:\/\//, "")}
                  </div>
                ) : null}

                {hoveredPin.athleteCount > 0 ? (
                  <div className="mt-2 text-xs text-white/45">
                    {hoveredPin.athleteCount} RecruitNC {hoveredPin.athleteCount === 1 ? "profile" : "profiles"}
                    {hoveredPin.commitCount > 0 ? ` · ${hoveredPin.commitCount} commits` : ""}
                  </div>
                ) : null}

                <div className="mt-3 text-xs text-white/50">Click the dot for contact details.</div>
              </div>
            ) : null}

            {loading ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#071427]/65 text-white backdrop-blur-[1px]">
                Loading North Carolina club map…
              </div>
            ) : null}

            {/*
              A banner rather than a full-bleed panel — the fallback outline behind it is
              still a usable North Carolina map, so don't cover it up to report the problem.
            */}
            {mapError ? (
              <div className="absolute inset-x-4 top-4 z-30 flex items-start gap-3 rounded-sm border border-[#d7b968]/35 bg-[#071427]/95 p-4 text-[#f5e7bd] shadow-lg backdrop-blur">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#d7b968]" />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white">Showing the fallback North Carolina map</h3>
                  <p className="mt-1 text-sm leading-6 text-[#f5e7bd]/80">{mapError}</p>
                </div>
              </div>
            ) : null}

            {!loading && !mapError && !filteredPins.length ? (
              <div className="absolute inset-x-6 bottom-6 z-30 rounded-sm border border-[#d7b968]/25 bg-[#071427]/90 p-4 text-sm text-[#f5e7bd]/85 shadow-[0_0_24px_rgba(215,185,104,0.12)] backdrop-blur">
                <span className="font-bold text-white">North Carolina map is ready.</span>{" "}
                No mapped clubs match the current filters yet. Add verified club coordinates to light up the pins.
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 bg-black px-4 py-3 text-center text-sm text-white/45">
            {filteredPins.length} clubs visible across North Carolina — pan and zoom the map to explore.
          </div>
        </div>

        <div ref={detailsRef} className="scroll-mt-4 space-y-4">
          {selectedPin ? (
            <PinDetails
              pin={selectedPin}
              distance={origin ? distanceMiles(origin.lat, origin.lon, selectedPin.latitude, selectedPin.longitude) : null}
            />
          ) : (
            <Card className="rounded-sm border-white/10 bg-[#071427]/95 text-white">
              <CardContent className="p-5">
                <LocateFixed className="h-6 w-6 text-[#d7b968]" />
                <h3 className="mt-3 text-lg font-black">Tap a club on the map</h3>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  You&apos;ll get its address, programs, phone and socials — plus a link to the full club page.
                </p>
              </CardContent>
            </Card>
          )}

          {/*
            Desktop only. On a phone the map plus the selected club's card is the whole
            interaction — a scrolling list of every club underneath it is just something
            to scroll past.
          */}
          <div className="hidden space-y-3 lg:block lg:max-h-[520px] lg:overflow-auto lg:pr-1">
            {filteredPins.map((pin) => (
              <button
                key={pin.id}
                type="button"
                onClick={() => setSelectedId(pin.id)}
                className={`w-full rounded-sm border p-3 text-left transition ${
                  selectedPin?.id === pin.id
                    ? "border-[#d7b968]/70 bg-[#d7b968]/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ClubLogo pin={pin} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-white">{pin.name}</div>
                    <div className="truncate text-sm text-white/45">
                      {[pin.city, pin.state].filter(Boolean).join(", ") || "North Carolina"}
                      {origin ? (
                        <span className="text-[#d7b968]">
                          {" · "}
                          {Math.round(distanceMiles(origin.lat, origin.lon, pin.latitude, pin.longitude))} mi
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-[#d7b968]">{pin.athleteCount}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">profiles</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {data?.unlocatedClubs?.length ? (
        <div className="rounded-sm border border-[#d7b968]/20 bg-[#d7b968]/10 p-5 text-[#f5e7bd]">
          <h3 className="flex items-center gap-2 text-xl font-black text-white">
            <Users className="h-5 w-5 text-[#d7b968]" />
            Clubs showing in profiles that still need verified locations
          </h3>
          <p className="mt-2 text-sm text-[#f5e7bd]/80">
            These are coming from athlete profile text. Add them to <code>wrestling_clubs</code>, give them aliases,
            and store coordinates once to place them on the map.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.unlocatedClubs.slice(0, 18).map((club) => (
              <div key={club.normalizedName} className="rounded-sm border border-[#d7b968]/10 bg-[#071427]/60 p-3">
                <div className="font-semibold text-white">{club.name}</div>
                <div className="mt-1 text-sm text-[#f5e7bd]/75">
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
