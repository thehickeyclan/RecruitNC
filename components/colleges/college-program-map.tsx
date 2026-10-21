"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { BarChart3, Bookmark, ChevronRight, ClipboardList, GraduationCap, Lock, MapPin, Search, ShieldCheck, Star, Users, X } from "lucide-react"

import { CoachEmailComposer } from "@/components/colleges/coach-email-composer"
import { ListControls } from "@/components/colleges/list-controls"

import {
  COLLEGE_LIST_STATUSES,
  COLLEGE_LIST_STATUS_LABEL,
  type CollegeListItem,
  type CollegeListResponse,
  type CollegeListStatus,
} from "@/lib/college-programs/list"
import { STATE_NAMES } from "@/lib/college-programs/states"
import { loadMapbox, type MapLike } from "@/lib/mapbox/load-mapbox"
import { BrandName } from "@/components/recruiting/brand-name"
import {
  COLLEGE_DIVISIONS,
  DIVISION_COLOR,
  DIVISION_SHORT,
  primaryDivision,
  type CollegeDivision,
  type CollegeMapResponse,
  type CollegeMapSchool,
} from "@/lib/college-programs/types"

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
  myListOnly: boolean
  /** Only colleges with wrestlers from the state on their current roster (school.fromState). */
  fromState: boolean
  query: string
}

/** Saved schools and where the family stands with each (lib/college-programs/list). */
type SavedList = Map<string, CollegeListItem>

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
  if (filters.fromState && !school.fromState?.wrestlers.length) return false
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

function toGeoJson(schools: CollegeMapSchool[], filters: Filters | null, saved: SavedList) {
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
        saved: saved.has(school.id),
        fromCount: school.fromState?.wrestlers.length ?? 0,
      },
    })),
  }
}

function programLine(p: CollegeMapSchool["programs"][number]): string {
  const teams = [p.mens ? "Men's" : null, p.womens ? "Women's" : null].filter(Boolean).join(" & ")
  return teams
}

/**
 * What subscribing unlocks for this college, shown to anyone without the Recruiting Command Center
 * (Matt, 17 Oct 2026). Counts, never names: how many coaches, whether there is a questionnaire, how
 * many wrestlers from the family's state went here. Each line is a way in.
 */
function LockedActions({ schoolId, href }: { schoolId: string; href: string }) {
  const [staff, setStaff] = useState<{ staffCount: number; hasQuestionnaire: boolean } | null>(null)
  const [alumni, setAlumni] = useState<{ count: number; stateName: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    setStaff(null)
    setAlumni(null)
    fetch(`/api/college-map/staff?school=${encodeURIComponent(schoolId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!cancelled && b?.locked) setStaff({ staffCount: Number(b.staffCount) || 0, hasQuestionnaire: Boolean(b.hasQuestionnaire) })
      })
      .catch(() => {})
    fetch(`/api/college-map/went-here?school=${encodeURIComponent(schoolId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!cancelled && b?.locked && b.alumni) setAlumni({ count: Number(b.alumni.count) || 0, stateName: String(b.alumni.stateName ?? "North Carolina") })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [schoolId])
  const rows: Array<{ icon: typeof Users; label: string }> = [
    { icon: Users, label: staff && staff.staffCount > 0 ? `See all ${staff.staffCount} coaches and their emails` : "See the coaching staff and their emails" },
    ...(staff?.hasQuestionnaire ? [{ icon: ClipboardList, label: "Fill out the recruiting questionnaire" }] : []),
    {
      icon: GraduationCap,
      label:
        alumni && alumni.count > 0
          ? `See the ${alumni.count} ${alumni.stateName} wrestler${alumni.count === 1 ? "" : "s"} who went here`
          : `See the ${alumni?.stateName ?? "North Carolina"} wrestlers who went here`,
    },
    { icon: Bookmark, label: "Save to your college list" },
    { icon: BarChart3, label: "Compare with other colleges" },
  ]
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <ul className="space-y-1.5">
        {rows.map(({ icon: Icon, label }) => (
          <li key={label}>
            <a
              href={href}
              onClick={() => {
                void fetch("/api/track-funnel-event", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ event: "upsell_click", source: label.replace(/\d+/g, "N").slice(0, 80), path: window.location.pathname }),
                  keepalive: true,
                }).catch(() => {})
              }}
              className="group flex items-center gap-2 rounded-sm px-1.5 py-1.5 text-sm text-white/85 hover:bg-white/5"
            >
              <Icon className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
              <span className="flex-1">{label}</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-[#D7B968]/15 px-1.5 py-0.5 text-[11px] font-bold text-[#F5D985] group-hover:bg-[#D7B968] group-hover:text-[#071427]">
                <Lock className="h-3 w-3" aria-hidden /> Subscribe
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The state's wrestlers on this college's current roster, from its published roster. */
function FromStateRoster({ school }: { school: CollegeMapSchool }) {
  const from = school.fromState!
  const [all, setAll] = useState(false)
  const shown = all ? from.wrestlers : from.wrestlers.slice(0, 5)
  const stateName = STATE_NAMES[from.state] ?? from.state
  return (
    <div className="mt-3 rounded-sm border border-white/10 bg-white/[0.04] p-2.5">
      <p className="text-xs font-bold uppercase tracking-wider text-[#D7B968]">
        {from.wrestlers.length} from {stateName} on the roster
      </p>
      <ul className="mt-1.5 space-y-1 text-sm">
        {shown.map((w) => (
          <li key={`${w.name}-${w.team}`} className="leading-tight text-white/85">
            <span className="font-semibold text-white">{w.name}</span>
            <span className="text-white/55">
              {[w.weight ? `${w.weight} lbs` : null, w.class, w.highSchool].filter(Boolean).length ? " · " : ""}
              {[w.weight ? `${w.weight} lbs` : null, w.class, w.highSchool].filter(Boolean).join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      {from.wrestlers.length > 5 ? (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 text-xs font-semibold text-[#D7B968] hover:underline">
          {all ? "Show fewer" : `Show all ${from.wrestlers.length}`}
        </button>
      ) : null}
    </div>
  )
}

function SchoolCard({
  school,
  filters,
  onClose,
  list,
  upsellHref = null,
}: {
  /** Set when the viewer does not have the Command Center: the card shows what subscribing unlocks. */
  upsellHref?: string | null
  school: CollegeMapSchool
  /** Programs the filters hid are shown dimmed, so a D1 + D2 school reads right under a D2 filter. */
  filters: Filters | null
  onClose: () => void
  /** The My List controls, or null when the list is not available to this viewer. */
  list: ReactNode
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
          {school.firstSeason ? (
            <p className="mt-1 text-xs font-semibold text-[#D7B968]">New program · first season {school.firstSeason}, recruiting now</p>
          ) : null}
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
          Coaches on <BrandName />
        </p>
      ) : null}

      {school.fromState?.wrestlers.length ? <FromStateRoster school={school} /> : null}

      {list}

      {upsellHref ? <LockedActions schoolId={school.id} href={upsellHref} /> : null}

      {/* Everything else about the school - staff, questionnaire, who went there - is on its page. */}
      <a
        href={`/recruiting/schools/${school.id}`}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-sm bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/15"
      >
        Open school page <ChevronRight className="h-4 w-4" aria-hidden />
      </a>
    </div>
  )
}

export function CollegeProgramMap({
  accessToken,
  upsellHref = "/command-center",
  heightClass = "h-[520px] sm:h-[620px]",
  showList = true,
  cooperative = false,
}: {
  accessToken: string
  /** Where the Subscribe actions on a locked college card go. */
  upsellHref?: string
  heightClass?: string
  /** The list of every college under the map. Off on the sales page, where the map is the demo (Matt, 17 Oct 2026). */
  showList?: boolean
  /** One finger scrolls the page, two move the map: for a map in the middle of a page people scroll on a phone. */
  cooperative?: boolean
}) {
  const [response, setResponse] = useState<CollegeMapResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** Arrived from Compare colleges to add one: show the way back. */
  const [fromCompare, setFromCompare] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    divisions: new Set(COLLEGE_DIVISIONS),
    gender: "all",
    state: "",
    onRecruitNCOnly: false,
    myListOnly: false,
    fromState: false,
    query: "",
  })
  const [listAvailable, setListAvailable] = useState(false)
  /** Each college's logo for the list under the map (not the map): { schoolId: url }. */
  const [logos, setLogos] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!showList) return
    let cancelled = false
    fetch("/api/college-map/logos")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { logos?: Record<string, string> } | null) => {
        if (!cancelled && j?.logos) setLogos(j.logos)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [showList])
  const [saved, setSaved] = useState<SavedList>(new Map())
  const [listBusy, setListBusy] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  /** The school whose email draft is open. Kept apart from the selection so closing the card does not lose a draft. */
  const [emailSchool, setEmailSchool] = useState<CollegeMapSchool | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLike | null>(null)

  const full = response?.access === "full"
  const schools = useMemo(() => response?.schools ?? [], [response])

  useEffect(() => {
    fetch("/api/college-map", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load the college map.")
        const body = (await res.json()) as CollegeMapResponse
        setResponse(body)
        // A girl's family opens on women's programs, a boy's on men's. A link that asked for one
        // school or for My List is left alone: it must show that school whatever teams it has.
        const params = new URLSearchParams(window.location.search)
        if (body.focus && !params.get("school") && params.get("list") !== "1") {
          setFilters((f) => ({ ...f, gender: body.focus!.gender }))
        }
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Could not load the college map."))
  }, [])

  // /recruiting/college-map?list=1 opens straight onto My List (the Command Center links here), and
  // ?school=<id> opens on that school (its page links back with "See it on the map").
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("list") === "1") setFilters((f) => ({ ...f, myListOnly: true }))
    // ?on=recruitnc opens on the programs with a coach here: the link we share with the map graphic.
    if (params.get("on") === "recruitnc") setFilters((f) => ({ ...f, onRecruitNCOnly: true }))
    if (params.get("from") === "compare") setFromCompare(true)
    const school = params.get("school")
    if (school) setSelectedId(school)
  }, [])

  // My List loads beside the map and never blocks it: no list (signed out, not Blue, table not
  // there yet) just means no Save button.
  useEffect(() => {
    fetch("/api/college-list", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return
        const body = (await res.json()) as CollegeListResponse
        setListAvailable(body.available)
        setSaved(new Map(body.items.map((item) => [item.schoolId, item])))
      })
      .catch(() => {})
  }, [])

  const saveToList = async (schoolId: string, status?: CollegeListStatus) => {
    setListBusy(true)
    setListError(null)
    try {
      const res = await fetch("/api/college-list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, ...(status ? { status } : {}) }),
      })
      const body = (await res.json()) as { item?: CollegeListItem; error?: string }
      if (!res.ok || !body.item) throw new Error(body.error || "Could not save. Try again.")
      const item = body.item
      setSaved((current) => new Map(current).set(item.schoolId, item))
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Could not save. Try again.")
    } finally {
      setListBusy(false)
    }
  }

  const removeFromList = async (schoolId: string) => {
    setListBusy(true)
    setListError(null)
    try {
      const res = await fetch(`/api/college-list?school=${encodeURIComponent(schoolId)}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Could not remove. Try again.")
      setSaved((current) => {
        const next = new Map(current)
        next.delete(schoolId)
        return next
      })
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Could not remove. Try again.")
    } finally {
      setListBusy(false)
    }
  }

  // Preview viewers see every school and may narrow to On RecruitNC; the other filters are what Blue unlocks.
  const visible = useMemo(
    () =>
      full
        ? schools.filter((school) => matchesFilters(school, filters) && (!filters.myListOnly || saved.has(school.id)))
        : schools.filter((school) => (!filters.onRecruitNCOnly || school.onRecruitNC) && (!filters.fromState || (school.fromState?.wrestlers.length ?? 0) > 0)),
    [full, schools, filters, saved],
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
  /** Colleges with wrestlers from the state on the roster, most first: the "From North Carolina" list. */
  const fromStateSchools = useMemo(
    () => schools.filter((s) => (s.fromState?.wrestlers.length ?? 0) > 0).sort((a, b) => b.fromState!.wrestlers.length - a.fromState!.wrestlers.length || a.name.localeCompare(b.name)),
    [schools],
  )
  const fromStateName = STATE_NAMES[fromStateSchools[0]?.fromState?.state ?? ""] ?? "your state"

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
          cooperativeGestures: cooperative,
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
          map.addSource("colleges", { type: "geojson", data: toGeoJson([], null, new Map()) })

          // On My List: a gold halo, outside the RecruitNC ring so a school can show both.
          map.addLayer({
            id: "college-saved-ring",
            type: "circle",
            source: "colleges",
            filter: ["==", ["get", "saved"], true],
            paint: {
              "circle-color": "#F5D985",
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 9, 8, 14, 12, 18],
              "circle-opacity": 0.9,
            },
          })

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
    mapRef.current?.getSource("colleges")?.setData?.(toGeoJson(visible, full ? filters : null, saved))
  }, [mapReady, visible, full, filters, saved])

  // From North Carolina: a dot's size is how many of the state's wrestlers are on that roster.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map?.getLayer?.("college-dots")) return
    map.setPaintProperty?.(
      "college-dots",
      "circle-radius",
      filters.fromState
        ? ["interpolate", ["linear"], ["get", "fromCount"], 1, 6, 3, 9, 6, 13, 10, 18, 16, 24]
        : ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 7.5, 12, 11],
    )
  }, [mapReady, filters.fromState])

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
    // Only once the schools are in: a school named in the address (?school=) is selected before
    // the list loads, and must not be thrown away for not being in an empty list.
    if (schools.length > 0 && selectedId && !visible.some((school) => school.id === selectedId)) setSelectedId(null)
  }, [schools, visible, selectedId])

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
    filters.myListOnly ||
    filters.fromState ||
    filters.query.trim() !== ""

  const resetFilters = () =>
    setFilters({
      divisions: new Set(COLLEGE_DIVISIONS),
      gender: "all",
      state: "",
      onRecruitNCOnly: false,
      fromState: false,
      myListOnly: false,
      query: "",
    })

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
        {recruitNCCount > 0 ? (
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
            On <BrandName /> ({recruitNCCount})
          </button>
        ) : null}
        {fromStateSchools.length > 0 ? (
          // Where wrestlers from the state go: every level, sized by how many are on each roster.
          <button
            type="button"
            onClick={() =>
              setFilters((f) => (f.fromState ? { ...f, fromState: false } : { ...f, fromState: true, divisions: new Set(COLLEGE_DIVISIONS) }))
            }
            aria-pressed={filters.fromState}
            className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10 ${
              filters.fromState ? "border-[#D7B968] bg-[#D7B968]/15 text-white" : "border-white/20 text-white"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            From {fromStateName} ({fromStateSchools.length})
          </button>
        ) : null}
        {full && listAvailable ? (
          // Same behaviour as On RecruitNC: one tap is the whole list, at every level.
          <button
            type="button"
            onClick={() =>
              setFilters((f) =>
                f.myListOnly ? { ...f, myListOnly: false } : { ...f, myListOnly: true, divisions: new Set(COLLEGE_DIVISIONS) },
              )
            }
            aria-pressed={filters.myListOnly}
            className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10 ${
              filters.myListOnly ? "border-[#D7B968] bg-[#D7B968]/15 text-white" : "border-white/20 text-white"
            }`}
          >
            <Star className="h-3.5 w-3.5 fill-[#F5D985] text-[#F5D985]" />
            My List ({saved.size})
          </button>
        ) : null}
        {(full && filtersActive) || filters.onRecruitNCOnly || filters.fromState ? (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto rounded-sm px-3 py-1.5 text-sm font-semibold text-[#F5D985] hover:bg-white/10"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {fromCompare ? (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-[#D7B968] bg-[#0B1D3A] px-4 py-3 text-sm text-white shadow-lg">
          <span>Tap a college, then <b>Save to My List</b>. It will be there to compare.</span>
          <Link href="/recruiting/compare?step=colleges" className="rounded-sm bg-[#D7B968] px-3 py-1.5 font-bold text-[#071427] hover:bg-[#F5D985]">
            Back to compare →
          </Link>
        </div>
      ) : null}

      {full && response?.focus && filters.gender === response.focus.gender ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-[#D7B968]/30 bg-[#D7B968]/10 px-3 py-2 text-sm text-white/85">
          <span>
            Showing {response.focus.gender === "womens" ? "women's" : "men's"} programs
            {response.focus.names.length > 0 ? ` for ${response.focus.names.join(" and ")}` : ""}.
          </span>
          <button type="button" onClick={() => setFilters((f) => ({ ...f, gender: "all" }))} className="font-semibold text-[#F5D985] hover:underline">
            Show men&apos;s and women&apos;s
          </button>
        </p>
      ) : null}

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
            <span>
              Filter by level, men&apos;s or women&apos;s and state, see coaching staff and save your own college list — part of the{" "}
              <BrandName ncu="Recruiting Command Center." guild="full Command Center, coming soon." />
            </span>
          </p>
          <Link
            href={upsellHref}
            className="ncu-only inline-flex shrink-0 items-center justify-center rounded-sm bg-[#D7B968] px-4 py-2 text-sm font-bold text-[#071427] hover:bg-[#F5D985]"
          >
            See the Recruiting Command Center
          </Link>
        </div>
      )}

      <div className="relative overflow-hidden rounded-sm border border-white/10">
        <div ref={containerRef} className={`${heightClass} w-full bg-[#0a1528]`} />
        {!response ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">Loading programs…</div>
        ) : null}
        {mapError ? (
          <div className="absolute inset-x-4 top-4 rounded-sm bg-black/70 p-3 text-sm text-white/80">{mapError}</div>
        ) : null}
        {selected ? (
          // bottom-10 keeps the Mapbox logo, which their terms require, visible below the card.
          <div className="absolute bottom-10 left-4 right-4 sm:right-auto sm:w-[340px]">
            <SchoolCard
              school={selected}
              filters={full ? filters : null}
              upsellHref={full ? null : upsellHref}
              onClose={() => setSelectedId(null)}
              list={
                listAvailable ? (
                  <>
                    <ListControls
                      item={saved.get(selected.id)}
                      busy={listBusy}
                      onSave={(status) => saveToList(selected.id, status)}
                      onRemove={() => removeFromList(selected.id)}
                      onEmail={() => setEmailSchool(selected)}
                    />
                    {listError ? <p className="mt-1 text-xs text-red-300">{listError}</p> : null}
                  </>
                ) : null
              }
            />
          </div>
        ) : null}
      </div>

      {filters.fromState && fromStateSchools.length > 0 ? (
        // The question the filter answers, as a list: where this state's wrestlers are wrestling now.
        <section className="mt-4 rounded-sm border border-white/10 bg-[#071427] p-4" aria-label={`Top programs for ${fromStateName} wrestlers`}>
          <p className="text-sm font-bold text-white">Top programs for {fromStateName} wrestlers</p>
          <p className="mt-0.5 text-xs text-white/55">
            {fromStateSchools.reduce((n, s) => n + (s.fromState?.wrestlers.length ?? 0), 0)} {fromStateName} wrestlers on {fromStateSchools.length} current college rosters, read from each school&apos;s published 2026-27 roster.
          </p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {fromStateSchools.slice(0, 12).map((s, i) => (
              <li key={s.id}>
                <button type="button" onClick={() => setSelectedId(s.id)} className="flex w-full items-center gap-2 text-left text-sm hover:text-white">
                  <span className="w-5 text-right text-xs text-white/40">{i + 1}</span>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: DIVISION_COLOR[primaryDivision(s)] }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-white/85">{s.name}</span>
                  <span className="font-bold text-white">{s.fromState!.wrestlers.length}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {emailSchool ? (
        <CoachEmailComposer
          schoolId={emailSchool.id}
          schoolName={emailSchool.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()}
          open
          onOpenChange={(open) => {
            if (!open) setEmailSchool(null)
          }}
          onSent={(status) => {
            // Sending moves the school along My List; it never moves it backwards.
            const current = saved.get(emailSchool.id)?.status
            if (status && current && COLLEGE_LIST_STATUSES.indexOf(status) > COLLEGE_LIST_STATUSES.indexOf(current)) {
              void saveToList(emailSchool.id, status)
            }
          }}
        />
      ) : null}

      <p className="text-sm text-white/55">
        {visible.length} of {schools.length} schools · {response?.season ?? "2026-27"} season
      </p>

      {full && filters.myListOnly && saved.size === 0 ? (
        <p className="rounded-sm border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/70">
          Your list is empty. Tap any school on the map, then <span className="font-semibold text-white">Save to My List</span>
          . Aim for 20 to 30 schools across more than one level to start.
        </p>
      ) : null}

      {full && showList ? (
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
                <span className="flex items-center gap-2.5">
                  {/* The college's logo, with its level as a dot on the corner; the dot alone when there is no logo. */}
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06]">
                    {logos[school.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logos[school.id]} alt="" loading="lazy" className="h-7 w-7 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                    ) : null}
                    <span
                      className={logos[school.id] ? "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0A1628]" : "h-2.5 w-2.5 rounded-full"}
                      style={{ backgroundColor: DIVISION_COLOR[shownDivision(school, filters)] }}
                    />
                  </span>
                  <span className="truncate text-sm font-semibold text-white">{school.name}</span>
                  {school.onRecruitNC ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#D7B968]" /> : null}
                  {saved.has(school.id) ? <Star className="h-3.5 w-3.5 shrink-0 fill-[#F5D985] text-[#F5D985]" /> : null}
                </span>
                <span className="mt-0.5 block pl-[42px] text-xs text-white/50">
                  {school.city}, {school.state} · {school.programs.map((p) => DIVISION_SHORT[p.division]).join(" / ")}
                  {school.firstSeason ? ` · starts ${school.firstSeason}` : ""}
                </span>
                {saved.has(school.id) ? (
                  <span className="mt-0.5 block pl-[42px] text-xs font-semibold text-[#F5D985]">
                    {COLLEGE_LIST_STATUS_LABEL[saved.get(school.id)!.status]}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
