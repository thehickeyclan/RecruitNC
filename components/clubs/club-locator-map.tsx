"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ClubMapPin, ClubMapResponse } from "@/lib/clubs/club-map-types"
import { ExternalLink, LocateFixed, MapPin, Search, ShieldCheck, Users } from "lucide-react"

const MAPBOX_SCRIPT_ID = "mapbox-gl-js"
const MAPBOX_CSS_ID = "mapbox-gl-css"
const MAPBOX_VERSION = "v3.9.4"
const MAP_GOLD = "#d7b968"
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

  mapboxPromise = new Promise<MapboxLike>((resolve, reject) => {
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

  return mapboxPromise
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

function PinDetails({ pin }: { pin: ClubMapPin }) {
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
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-sm border border-white/10 bg-white/5 p-3">
            <div className="text-2xl font-black text-[#d7b968]">{pin.athleteCount}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Athletes</div>
          </div>
          <div className="rounded-sm border border-white/10 bg-white/5 p-3">
            <div className="text-2xl font-black text-sky-200">{pin.boysCount}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Boys</div>
          </div>
          <div className="rounded-sm border border-white/10 bg-white/5 p-3">
            <div className="text-2xl font-black text-pink-200">{pin.girlsCount}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Girls</div>
          </div>
        </div>

        {pin.recentCommits.length ? (
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#d7b968]">
              Recent college commits
            </div>
            <div className="space-y-2">
              {pin.recentCommits.map((commit, index) => (
                <div key={`${commit.name}-${commit.college}-${index}`} className="rounded-sm bg-white/5 px-3 py-2 text-sm">
                  <span className="font-semibold text-white">{commit.name}</span>
                  <span className="text-white/35"> → </span>
                  <span className="text-white/80">{commit.college}</span>
                  {commit.classYear ? <span className="text-white/35"> · {commit.classYear}</span> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-sm bg-[#cc0000] text-white hover:bg-[#a80000]">
            <Link href={pin.profileHref}>View RecruitNC athletes</Link>
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
  const [genderFilter, setGenderFilter] = useState("all")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [minAthletes, setMinAthletes] = useState("0")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLike | null>(null)
  const pinsRef = useRef<ClubMapPin[]>([])

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

  const hoveredPin = useMemo(() => {
    return filteredPins.find((pin) => pin.id === hoveredPinId) ?? null
  }, [filteredPins, hoveredPinId])

  useEffect(() => {
    pinsRef.current = filteredPins
  }, [filteredPins])

  useEffect(() => {
    if (loading || mapRef.current || !mapContainerRef.current) return
    if (!accessToken) {
      setMapError("Mapbox token missing. Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in Vercel to render the live map.")
      return
    }

    let cancelled = false

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

        map.on("error", (event: any) => {
          if (cancelled) return
          const message = String(event?.error?.message ?? "")
          if (/401|403|unauthorized|forbidden|access token|not authorized/i.test(message)) {
            setMapError(
              "Mapbox is blocking the base map. Check that the token is active and that URL restrictions include this exact RecruitNC domain and preview URL.",
            )
          }
        })

        map.once("load", () => {
          if (cancelled) return
          map.resize()
          map.fitBounds(NC_BOUNDS, { padding: 46, duration: 0 })

          map.addSource("nc-boundary", {
            type: "geojson",
            data: "/geo/nc-state.geojson",
          })

          map.addLayer({
            id: "nc-boundary-fill",
            type: "fill",
            source: "nc-boundary",
            paint: {
              "fill-color": "#0B1D3A",
              "fill-opacity": 0.28,
            },
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

          map.addLayer({
            id: "club-pin-count",
            type: "symbol",
            source: "clubs",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "text-field": ["to-string", ["get", "athleteCount"]],
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 11,
              "text-allow-overlap": true,
            },
            paint: {
              "text-color": "#ffffff",
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
          ["RecruitNC athletes", data?.summary.athletesRepresented ?? 0],
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
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/45" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search club, city, or website…"
              className="rounded-sm border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/35"
            />
          </div>

          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-full rounded-sm border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#071427] text-white">
              <SelectItem value="all">Boys & girls</SelectItem>
              <SelectItem value="boys">Boys athletes</SelectItem>
              <SelectItem value="girls">Girls athletes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={minAthletes} onValueChange={setMinAthletes}>
            <SelectTrigger className="w-full rounded-sm border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Athletes" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#071427] text-white">
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
            <Badge className="rounded-full bg-[#d7b968] px-3 py-1 text-[#071427]">{filteredPins.length} visible</Badge>
          </div>

          <div className="relative h-[580px] bg-[#0b0f14]">
            <StaticNcMapBackdrop pins={filteredPins} selectedId={selectedPin?.id ?? null} onSelectPin={setSelectedId} />
            <div
              ref={mapContainerRef}
              className={`absolute inset-0 transition-opacity duration-500 ${
                mapReady ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />

            {hoveredPin && !mapError ? (
              <div className="pointer-events-none absolute left-4 top-4 z-30 w-[min(330px,calc(100%-2rem))] rounded-sm border border-[#d7b968]/45 bg-[#071427]/95 p-4 text-white shadow-[0_0_34px_rgba(215,185,104,0.2)] backdrop-blur">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d7b968]">Club preview</div>
                <div className="mt-1 truncate text-lg font-black">{hoveredPin.name}</div>
                <div className="mt-1 flex items-center gap-1 text-sm text-white/60">
                  <MapPin className="h-3.5 w-3.5 text-[#d7b968]" />
                  {[hoveredPin.city, hoveredPin.state].filter(Boolean).join(", ") || "North Carolina"}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-sm border border-white/10 bg-white/5 p-2">
                    <div className="text-lg font-black text-[#d7b968]">{hoveredPin.athleteCount}</div>
                    <div className="text-[9px] uppercase tracking-[0.16em] text-white/40">Athletes</div>
                  </div>
                  <div className="rounded-sm border border-white/10 bg-white/5 p-2">
                    <div className="text-lg font-black text-sky-200">{hoveredPin.boysCount}</div>
                    <div className="text-[9px] uppercase tracking-[0.16em] text-white/40">Boys</div>
                  </div>
                  <div className="rounded-sm border border-white/10 bg-white/5 p-2">
                    <div className="text-lg font-black text-pink-200">{hoveredPin.girlsCount}</div>
                    <div className="text-[9px] uppercase tracking-[0.16em] text-white/40">Girls</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-white/50">Click the glowing dot for full club details.</div>
              </div>
            ) : null}

            {loading ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#071427]/65 text-white backdrop-blur-[1px]">
                Loading North Carolina club map…
              </div>
            ) : null}

            {mapError ? (
              <div className="absolute inset-6 z-30 flex items-center justify-center rounded-sm border border-[#d7b968]/35 bg-[#071427]/95 p-6 text-center text-[#f5e7bd]">
                <div>
                  <MapPin className="mx-auto h-8 w-8 text-[#d7b968]" />
                  <h3 className="mt-3 text-xl font-black text-white">Live map needs Mapbox</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#f5e7bd]/80">{mapError}</p>
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

        <div className="space-y-4">
          {selectedPin ? <PinDetails pin={selectedPin} /> : null}

          <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
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
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-[#d7b968]">{pin.athleteCount}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">athletes</div>
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
