"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, Lock, Search, ShieldCheck, X } from "lucide-react"

import { STATE_NAMES } from "@/lib/college-programs/states"
import { loadMapbox, type MapLike } from "@/lib/mapbox/load-mapbox"
import {
  COLLEGE_DIVISIONS,
  DIVISION_SHORT,
  primaryDivision,
  type CollegeDivision,
  type CollegeMapResponse,
  type CollegeMapSchool,
} from "@/lib/college-programs/types"

/** One colour per level, readable on the dark basemap and distinct from each other. */
export const DIVISION_COLOR: Record<CollegeDivision, string> = {
  "NCAA Division I": "#EF4444",
  "NCAA Division II": "#3B82F6",
  "NCAA Division III": "#22C55E",
  NAIA: "#F5B942",
  NJCAA: "#A78BFA",
}

const RECRUITNC_RING = "#FFFFFF"
// The lower 48 with room for Simon Fraser (BC) at the top-left.
const US_BOUNDS: [[number, number], [number, number]] = [
  [-125, 24.5],
  [-66.5, 49.5],
]

type Gender = "all" | "mens" | "womens"

type Filters = {
  divisions: Set<CollegeDivision>
  gender: Gender
  state: string
  onRecruitNCOnly: boolean
  query: string
}

/** The school's programs that pass the level and men's/women's filters. */
function matchingPrograms(school: CollegeMapSchool, filters: Filters) {
  return school.programs.filter(
    (p) =>
      filters.divisions.has(p.division) &&
      (filters.gender === "all" || (filters.gender === "mens" ? p.mens : p.womens)),
  )
}

function matchesFilters(school: CollegeMapSchool, filters: Filters): boolean {
  if (matchingPrograms(school, filters).length === 0) return false
  if (filters.state && school.state !== filters.state) return false
  if (filters.onRecruitNCOnly && !school.onRecruitNC) return false
  const q = filters.query.trim().toLowerCase()
  if (q && !`${school.name} ${school.city} ${school.state} ${STATE_NAMES[school.state] ?? ""}`.toLowerCase().includes(q))
    return false
  return true
}

/**
 * The level a dot shows: the highest level among the programs the filters kept. Edinboro wrestles
 * men's D1 and women's D2, so with "Women's programs" selected it is a D2 dot, not a D1 one.
 */
function shownDivision(school: CollegeMapSchool, filters: Filters | null): CollegeDivision {
  const kept = filters ? matchingPrograms(school, filters) : school.programs
  return primaryDivision({ programs: kept.length > 0 ? kept : school.programs })
}

function toGeoJson(schools: CollegeMapSchool[], filters: Filters | null) {
  return {
    type: "FeatureCollection",
    features: schools.map((school) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [school.longitude, school.latitude] },
      properties: {
        id: school.id,
        name: school.name,
        color: DIVISION_COLOR[shownDivision(school, filters)],
        onRecruitNC: school.onRecruitNC === true,
      },
    })),
  }
}

function programLine(p: CollegeMapSchool["programs"][number]): string {
  const teams = [p.mens ? "Men's" : null, p.womens ? "Women's" : null].filter(Boolean).join(" & ")
  return teams
}

function SchoolCard({
  school,
  filters,
  onClose,
}: {
  school: CollegeMapSchool
  /** Programs the filters hid are shown dimmed, so a D1 + D2 school reads right under a D2 filter. */
  filters: Filters | null
  onClose: () => void
}) {
  const kept = new Set((filters ? matchingPrograms(school, filters) : school.programs).map((p) => p.division))
  return (
    <div className="max-h-[440px] overflow-y-auto rounded-sm border border-white/15 bg-[#071427]/95 p-4 shadow-2xl shadow-black/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold leading-tight text-white">{school.name}</p>
          <p className="mt-0.5 text-sm text-white/60">
            {school.city}, {school.state}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {school.programs.map((p) => (
          <li key={p.division} className={`flex items-start gap-2 text-sm ${kept.has(p.division) ? "" : "opacity-40"}`}>
            <span
              className="mt-0.5 inline-flex min-w-[3.25rem] justify-center rounded-sm px-1.5 py-0.5 text-xs font-bold text-[#071427]"
              style={{ backgroundColor: DIVISION_COLOR[p.division] }}
            >
              {DIVISION_SHORT[p.division]}
            </span>
            <span className="text-white/85">
              {programLine(p)}
              {p.conference ? <span className="text-white/50"> · {p.conference}</span> : null}
            </span>
          </li>
        ))}
      </ul>

      {school.onRecruitNC ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-white/10 px-2 py-1 text-xs font-semibold text-white">
          <ShieldCheck className="h-3.5 w-3.5 text-[#D7B968]" />
          Coaches on RecruitNC
        </p>
      ) : null}

      <StaffList school={school} />

      {school.website ? (
        <a
          href={school.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[#F5D985] hover:underline"
        >
          Athletics website <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
  )
}

type StaffRow = {
  name: string
  title: string
  division: CollegeDivision
  teams: Array<"mens" | "womens">
  email: string | null
  head: boolean
}

/**
 * Loaded when the card opens (the staff file is ~2,000 coaches). Head coaches always show; the
 * rest of the staff sits behind one tap so the card stays a card.
 */
function StaffList({ school }: { school: CollegeMapSchool }) {
  const [staff, setStaff] = useState<StaffRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStaff(null)
    setFailed(false)
    setShowAll(false)
    fetch(`/api/college-map/staff?school=${encodeURIComponent(school.id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error()
        const body = (await res.json()) as { staff: StaffRow[] }
        if (!cancelled) setStaff(body.staff)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [school.id])

  if (failed) return <p className="mt-3 text-xs text-white/50">Could not load the coaching staff.</p>
  if (!staff) return <p className="mt-3 text-xs text-white/50">Loading staff…</p>
  if (staff.length === 0) {
    // 25 programs' sites could not be read; absence here is ours, not the school's.
    return <p className="mt-3 text-xs text-white/50">Coaching staff not confirmed yet — check the athletics website.</p>
  }

  const twoTeams = school.programs.some((p) => p.mens && p.womens) || school.programs.length > 1
  const shown = showAll ? staff : staff.filter((m) => m.head)
  const hidden = staff.length - shown.length

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs font-bold uppercase tracking-wider text-white/45">Coaching staff</p>
      <ul className="mt-2 space-y-1.5">
        {(shown.length > 0 ? shown : staff.slice(0, 1)).map((m) => (
          <li key={`${m.name}-${m.title}-${m.division}`} className="text-sm leading-5">
            <span className={m.head ? "font-semibold text-white" : "text-white/85"}>{m.name}</span>
            <span className="text-white/50">
              {" "}
              · {m.title}
              {twoTeams && !/men|women/i.test(m.title)
                ? ` (${m.teams.map((t) => (t === "mens" ? "men's" : "women's")).join(" & ")})`
                : ""}
            </span>
            {m.email ? (
              <a href={`mailto:${m.email}`} className="block truncate text-xs text-[#F5D985] hover:underline">
                {m.email}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      {!showAll && hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs font-semibold text-[#F5D985] hover:underline"
        >
          Show all {staff.length} staff
        </button>
      ) : null}
    </div>
  )
}

export function CollegeProgramMap({ accessToken }: { accessToken: string }) {
  const [response, setResponse] = useState<CollegeMapResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    divisions: new Set(COLLEGE_DIVISIONS),
    gender: "all",
    state: "",
    onRecruitNCOnly: false,
    query: "",
  })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLike | null>(null)

  const full = response?.access === "full"
  const schools = useMemo(() => response?.schools ?? [], [response])

  useEffect(() => {
    fetch("/api/college-map", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load the college map.")
        setResponse((await res.json()) as CollegeMapResponse)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Could not load the college map."))
  }, [])

  // Preview viewers see every school; the filters are what Blue unlocks.
  const visible = useMemo(
    () => (full ? schools.filter((school) => matchesFilters(school, filters)) : schools),
    [full, schools, filters],
  )

  const states = useMemo(
    () =>
      [...new Set(schools.map((s) => s.state))].sort((a, b) =>
        (STATE_NAMES[a] ?? a).localeCompare(STATE_NAMES[b] ?? b),
      ),
    [schools],
  )
  const selected = useMemo(() => schools.find((s) => s.id === selectedId) ?? null, [schools, selectedId])
  const recruitNCCount = useMemo(() => schools.filter((s) => s.onRecruitNC).length, [schools])

  useEffect(() => {
    if (!response || mapRef.current || !containerRef.current) return
    if (!accessToken) {
      console.error("[college-map] NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set")
      setMapError("The interactive map is unavailable right now. The school list below still works.")
      return
    }

    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    loadMapbox()
      .then((mapboxgl) => {
        if (cancelled || !containerRef.current) return
        mapboxgl.accessToken = accessToken
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          bounds: US_BOUNDS,
          minZoom: 2.5,
          maxZoom: 13,
          attributionControl: true,
        })
        mapRef.current = map
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")

        if (typeof ResizeObserver !== "undefined" && containerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (!cancelled) map.resize()
          })
          resizeObserver.observe(containerRef.current)
        }

        map.on("error", (event: any) => {
          if (cancelled) return
          console.error("[college-map] mapbox error:", event?.error ?? event)
          setMapError("The interactive map is unavailable right now. The school list below still works.")
        })

        map.once("load", () => {
          if (cancelled) return
          map.addSource("colleges", { type: "geojson", data: toGeoJson([], null) })

          // On RecruitNC: a white ring behind the dot.
          map.addLayer({
            id: "college-recruitnc-ring",
            type: "circle",
            source: "colleges",
            filter: ["==", ["get", "onRecruitNC"], true],
            paint: {
              "circle-color": RECRUITNC_RING,
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 6.5, 8, 11, 12, 15],
            },
          })
          map.addLayer({
            id: "college-dots",
            type: "circle",
            source: "colleges",
            paint: {
              "circle-color": ["get", "color"],
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 7.5, 12, 11],
              "circle-stroke-color": "#071427",
              "circle-stroke-width": 1,
            },
          })
          map.addLayer({
            id: "college-selected",
            type: "circle",
            source: "colleges",
            filter: ["==", ["get", "id"], ""],
            paint: {
              "circle-color": "rgba(0,0,0,0)",
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 9, 8, 14, 12, 18],
              "circle-stroke-color": "#F5D985",
              "circle-stroke-width": 3,
            },
          })
          map.addLayer({
            id: "college-labels",
            type: "symbol",
            source: "colleges",
            minzoom: 7,
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 11,
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              "text-optional": true,
            },
            paint: { "text-color": "#E5E7EB", "text-halo-color": "#071427", "text-halo-width": 1.3 },
          })

          map.on("click", "college-dots", (event: any) => {
            const id = event.features?.[0]?.properties?.id
            if (id) setSelectedId(String(id))
          })
          map.on("mouseenter", "college-dots", () => {
            map.getCanvas().style.cursor = "pointer"
          })
          map.on("mouseleave", "college-dots", () => {
            map.getCanvas().style.cursor = ""
          })
          setMapReady(true)
        })
      })
      .catch((error) => {
        if (!cancelled) setMapError(error instanceof Error ? error.message : "Unable to load the map.")
      })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [accessToken, response])

  useEffect(() => {
    if (!mapReady) return
    mapRef.current?.getSource("colleges")?.setData?.(toGeoJson(visible, full ? filters : null))
  }, [mapReady, visible, full, filters])

  // Picking a state frames that state; clearing it goes back to the whole country.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    const inState = filters.state ? schools.filter((s) => s.state === filters.state) : []
    if (inState.length === 0) {
      map.fitBounds(US_BOUNDS, { padding: 24, duration: 600 })
      return
    }
    const lons = inState.map((s) => s.longitude)
    const lats = inState.map((s) => s.latitude)
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 80, maxZoom: 8, duration: 600 },
    )
  }, [mapReady, filters.state, schools])

  // A school the filters just hid cannot stay selected: its ring and card would float over nothing.
  useEffect(() => {
    if (selectedId && !visible.some((school) => school.id === selectedId)) setSelectedId(null)
  }, [visible, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    map.setFilter("college-selected", ["==", ["get", "id"], selectedId ?? ""])
    if (selected) map.easeTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(map.getZoom(), 6) })
  }, [mapReady, selectedId, selected])

  /**
   * With every level showing, a tap means "just this one". After that, taps add and remove levels,
   * and turning off the last one shows them all again rather than an empty map.
   */
  const toggleDivision = (division: CollegeDivision) =>
    setFilters((f) => {
      const all = f.divisions.size === COLLEGE_DIVISIONS.length
      if (all) return { ...f, divisions: new Set([division]) }
      const divisions = new Set(f.divisions)
      if (divisions.has(division)) divisions.delete(division)
      else divisions.add(division)
      return { ...f, divisions: divisions.size === 0 ? new Set(COLLEGE_DIVISIONS) : divisions }
    })

  const filtersActive =
    filters.divisions.size !== COLLEGE_DIVISIONS.length ||
    filters.gender !== "all" ||
    filters.state !== "" ||
    filters.onRecruitNCOnly ||
    filters.query.trim() !== ""

  const resetFilters = () =>
    setFilters({ divisions: new Set(COLLEGE_DIVISIONS), gender: "all", state: "", onRecruitNCOnly: false, query: "" })

  if (loadError) {
    return <p className="rounded-sm border border-white/10 bg-white/5 p-6 text-white/70">{loadError}</p>
  }

  return (
    <div className="space-y-4">
      {/* Legend doubles as the division filter for full access. */}
      <div className="flex flex-wrap items-center gap-2">
        {COLLEGE_DIVISIONS.map((division) => {
          const on = filters.divisions.has(division)
          return (
            <button
              key={division}
              type="button"
              disabled={!full}
              onClick={() => toggleDivision(division)}
              aria-pressed={full ? on : undefined}
              className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm font-semibold transition ${
                !full || on ? "border-white/20 text-white" : "border-white/10 text-white/35"
              } ${full ? "hover:bg-white/10" : "cursor-default"}`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: DIVISION_COLOR[division], opacity: !full || on ? 1 : 0.35 }}
              />
              {DIVISION_SHORT[division]}
            </button>
          )
        })}
        {full ? (
          // A button like the levels, not a checkbox off to the side: one tap shows every program
          // with a coach on RecruitNC, at every level. Levels can then narrow it.
          <button
            type="button"
            onClick={() =>
              setFilters((f) =>
                f.onRecruitNCOnly
                  ? { ...f, onRecruitNCOnly: false }
                  : { ...f, onRecruitNCOnly: true, divisions: new Set(COLLEGE_DIVISIONS) },
              )
            }
            aria-pressed={filters.onRecruitNCOnly}
            className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10 ${
              filters.onRecruitNCOnly ? "border-[#D7B968] bg-[#D7B968]/15 text-white" : "border-white/20 text-white"
            }`}
          >
            <span className="h-3 w-3 rounded-full border-2 border-white bg-transparent" />
            On RecruitNC ({recruitNCCount})
          </button>
        ) : null}
        {full && filtersActive ? (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto rounded-sm px-3 py-1.5 text-sm font-semibold text-[#F5D985] hover:bg-white/10"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {full ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
              placeholder="Search school or city"
              className="h-10 w-full rounded-sm border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-[#D7B968] focus:outline-none"
            />
          </label>
          <select
            value={filters.gender}
            onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value as Gender }))}
            className="h-10 rounded-sm border border-white/15 bg-[#0B1D3A] px-3 text-sm text-white"
            aria-label="Men's or women's"
          >
            <option value="all">Men's and women's</option>
            <option value="mens">Men's programs</option>
            <option value="womens">Women's programs</option>
          </select>
          <select
            value={filters.state}
            onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
            className="h-10 rounded-sm border border-white/15 bg-[#0B1D3A] px-3 text-sm text-white"
            aria-label="State"
          >
            <option value="">All states</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {STATE_NAMES[state] ?? state}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-sm border border-[#D7B968]/30 bg-[#D7B968]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm leading-6 text-white/80">
            <Lock className="mt-1 h-4 w-4 shrink-0 text-[#F5D985]" />
            Filter by level, men&apos;s or women&apos;s, state, and see which programs have coaches on RecruitNC — part of the
            Recruiting Portal with NC United Blue.
          </p>
          <Link
            href="/blue"
            className="inline-flex shrink-0 items-center justify-center rounded-sm bg-[#CC0000] px-4 py-2 text-sm font-bold text-white hover:bg-[#a80000]"
          >
            Learn about Blue
          </Link>
        </div>
      )}

      <div className="relative overflow-hidden rounded-sm border border-white/10">
        <div ref={containerRef} className="h-[520px] w-full bg-[#0a1528] sm:h-[620px]" />
        {!response ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">Loading programs…</div>
        ) : null}
        {mapError ? (
          <div className="absolute inset-x-4 top-4 rounded-sm bg-black/70 p-3 text-sm text-white/80">{mapError}</div>
        ) : null}
        {selected ? (
          // bottom-10 keeps the Mapbox logo, which their terms require, visible below the card.
          <div className="absolute bottom-10 left-4 right-4 sm:right-auto sm:w-[340px]">
            <SchoolCard school={selected} filters={full ? filters : null} onClose={() => setSelectedId(null)} />
          </div>
        ) : null}
      </div>

      <p className="text-sm text-white/55">
        {visible.length} of {schools.length} schools · {response?.season ?? "2026-27"} season
      </p>

      {full ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((school) => (
            <li key={school.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(school.id)
                  // The list sits below the map; without this the map moves out of sight.
                  containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                }}
                className={`w-full rounded-sm border px-3 py-2 text-left transition hover:bg-white/10 ${
                  selectedId === school.id ? "border-[#D7B968]" : "border-white/10"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DIVISION_COLOR[shownDivision(school, filters)] }}
                  />
                  <span className="truncate text-sm font-semibold text-white">{school.name}</span>
                  {school.onRecruitNC ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#D7B968]" /> : null}
                </span>
                <span className="mt-0.5 block pl-[18px] text-xs text-white/50">
                  {school.city}, {school.state} · {school.programs.map((p) => DIVISION_SHORT[p.division]).join(" / ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
