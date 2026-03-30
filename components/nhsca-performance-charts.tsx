"use client"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"

// NC United brand colors
const NC_NAVY = "#002147"
const NC_RED = "#B31B1B"

const DEFAULT_CLUB_DATA = [
  { name: "Raleigh Area Wrestling", value: 5 },
  { name: "Darkhorse", value: 5 },
  { name: "Combat", value: 4 },
  { name: "K-Vegas", value: 2 },
  { name: "NC Pride", value: 1 },
  { name: "Mount Airy Wrestling Club", value: 1 },
  { name: "Wrestling Warehouse", value: 1 },
  { name: "Spartan Elite", value: 1 },
  { name: "Dogtown", value: 1 },
  { name: "OBX Wrestling Factory", value: 1 },
  { name: "No Club", value: 2 },
]

const DEFAULT_SCHOOL_DATA = [
  { name: "Cardinal Gibbons", value: 2 },
  { name: "Hickory Ridge", value: 2 },
  { name: "Lumberton High School", value: 1 },
  { name: "Mount Airy High School", value: 1 },
  { name: "Northwest Guilford HS", value: 1 },
  { name: "Pinecrest High School", value: 1 },
  { name: "New Bern High School", value: 1 },
  { name: "Watauga High School", value: 1 },
  { name: "Lake Norman", value: 1 },
  { name: "Green Hope", value: 1 },
  { name: "Northern Guilford", value: 1 },
  { name: "Asheboro", value: 1 },
  { name: "Stuart Cramer", value: 1 },
  { name: "Avery County", value: 1 },
  { name: "First Flight", value: 1 },
  { name: "McDowell", value: 1 },
  { name: "North Guilford", value: 1 },
  { name: "Hough", value: 1 },
  { name: "Seventy-First", value: 1 },
  { name: "Wakefield HS", value: 1 },
  { name: "Blowing Rock", value: 1 },
  { name: "Northeast Guilford High School", value: 1 },
]

export type NhscaPerformanceChartRow = { name: string; value: number }

type Props = {
  /** When set, drives clubs chart + details (e.g. 2026 from live roster). Omit for 2025 static defaults. */
  clubRows?: NhscaPerformanceChartRow[]
  /** When set, drives schools chart + details. Omit for 2025 static defaults. */
  schoolRows?: NhscaPerformanceChartRow[]
}

function axisMaxForRows(rows: { value: number }[]) {
  const m = rows.length ? Math.max(...rows.map((r) => r.value), 1) : 8
  return Math.max(8, m)
}

/** Resolves logo via Enhanced Logo Manager (`logo_mappings` highschool). */
function HighSchoolChartLogo({ schoolName }: { schoolName: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const name = (schoolName || "").trim()
    if (!name) {
      setReady(true)
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/logo-mappings/by-entity/highschool/${encodeURIComponent(name)}`)
        if (res.ok) {
          const data = (await res.json()) as { success?: boolean; logo_url?: string }
          if (!cancelled && data?.success && data.logo_url) setLogoUrl(data.logo_url)
        }
      } catch {
        /* use fallback image */
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [schoolName])

  if (!ready) {
    return <div className="h-8 w-8 shrink-0 rounded bg-gray-200 animate-pulse" aria-hidden />
  }

  return (
    <Image
      src={logoUrl || "/high-school-logo.png"}
      alt={`${schoolName} logo`}
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded object-contain bg-white/80 border border-[#002147]/10"
      onError={(e) => {
        const el = e.target as HTMLImageElement
        el.src = "/high-school-logo.png"
      }}
    />
  )
}

export default function NHSCAPerformanceCharts({ clubRows: clubRowsProp, schoolRows: schoolRowsProp }: Props) {
  const [clubTab, setClubTab] = useState<"chart" | "details">("chart")
  const [schoolTab, setSchoolTab] = useState<"chart" | "details">("chart")

  const clubData = clubRowsProp ?? DEFAULT_CLUB_DATA
  const schoolData = schoolRowsProp ?? DEFAULT_SCHOOL_DATA
  const clubAxisMax = useMemo(() => axisMaxForRows(clubData), [clubData])
  const schoolAxisMax = useMemo(() => axisMaxForRows(schoolData), [schoolData])

  const axisTicks = (max: number) => [0, Math.round(max / 4), Math.round(max / 2), Math.round((3 * max) / 4), max]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Top Performing Clubs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-[#002147] text-white p-4">
          <h3 className="text-xl font-bold">Top Performing Clubs</h3>
        </div>

        <div className="bg-gray-100 border-b">
          <div className="flex">
            <button
              type="button"
              className={`px-6 py-3 ${clubTab === "chart" ? "bg-white font-medium text-[#002147]" : "hover:bg-gray-50 text-[#002147]/70"}`}
              onClick={() => setClubTab("chart")}
            >
              Chart
            </button>
            <button
              type="button"
              className={`px-6 py-3 ${clubTab === "details" ? "bg-white font-medium text-[#002147]" : "hover:bg-gray-50 text-[#002147]/70"}`}
              onClick={() => setClubTab("details")}
            >
              Club Details
            </button>
          </div>
        </div>

        {clubTab === "chart" ? (
          <div className="p-6">
            {clubData.length === 0 ? (
              <p className="text-sm text-[#002147]/70 text-center py-8">No club data for this roster yet.</p>
            ) : (
              <>
                <div className="space-y-4">
                  {clubData.map((club, index) => (
                    <div key={`${club.name}-${index}`} className="flex items-center">
                      <div className="w-[40%] text-right pr-4 text-sm text-[#002147]">{club.name}</div>
                      <div className="w-[60%]">
                        <div
                          className="h-6 rounded-r"
                          style={{
                            width: `${(club.value / clubAxisMax) * 100}%`,
                            backgroundColor: NC_NAVY,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 pl-[40%] pr-0 text-xs text-[#002147]/60">
                  {axisTicks(clubAxisMax).map((t) => (
                    <div key={t}>{t}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6">
            {clubData.length === 0 ? (
              <p className="text-sm text-[#002147]/70 text-center py-8">No club data for this roster yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#002147]/20">
                    <th className="text-left pb-2 text-[#002147] font-semibold">Club</th>
                    <th className="text-right pb-2 text-[#002147] font-semibold">All-Americans</th>
                  </tr>
                </thead>
                <tbody>
                  {clubData.map((club, index) => (
                    <tr key={`${club.name}-${index}`} className="border-b border-[#002147]/10">
                      <td className="py-2 text-[#002147]">{club.name}</td>
                      <td className="text-right py-2 text-[#002147] font-medium">{club.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Top Performing High Schools */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-[#B31B1B] text-white p-4">
          <h3 className="text-xl font-bold">Top Performing High Schools</h3>
        </div>

        <div className="bg-gray-100 border-b">
          <div className="flex">
            <button
              type="button"
              className={`px-6 py-3 ${schoolTab === "chart" ? "bg-white font-medium text-[#002147]" : "hover:bg-gray-50 text-[#002147]/70"}`}
              onClick={() => setSchoolTab("chart")}
            >
              Chart
            </button>
            <button
              type="button"
              className={`px-6 py-3 ${schoolTab === "details" ? "bg-white font-medium text-[#002147]" : "hover:bg-gray-50 text-[#002147]/70"}`}
              onClick={() => setSchoolTab("details")}
            >
              School Details
            </button>
          </div>
        </div>

        {schoolTab === "chart" ? (
          <div className="p-6 max-h-[500px] overflow-y-auto">
            {schoolData.length === 0 ? (
              <p className="text-sm text-[#002147]/70 text-center py-8">No high school data for this roster yet.</p>
            ) : (
              <>
                <div className="space-y-4">
                  {schoolData.map((school, index) => (
                    <div key={`${school.name}-${index}`} className="flex items-center gap-0">
                      <div className="w-[45%] flex items-center justify-end gap-2 pr-3 min-w-0">
                        <HighSchoolChartLogo schoolName={school.name} />
                        <span className="text-sm text-[#002147] truncate text-right min-w-0" title={school.name}>
                          {school.name}
                        </span>
                      </div>
                      <div className="w-[55%] min-w-0">
                        <div
                          className="h-6 rounded-r"
                          style={{
                            width: `${(school.value / schoolAxisMax) * 100}%`,
                            backgroundColor: NC_RED,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#002147]/55 mt-3 pr-1 text-right">
                  Logos from Logo Manager. Missing one? Add the high school in Enhanced Logo Manager.
                </p>
                <div className="flex justify-between mt-2 pl-[45%] pr-0 text-xs text-[#002147]/60">
                  {axisTicks(schoolAxisMax).map((t) => (
                    <div key={t}>{t}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6 max-h-[500px] overflow-y-auto">
            {schoolData.length === 0 ? (
              <p className="text-sm text-[#002147]/70 text-center py-8">No high school data for this roster yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#002147]/20">
                    <th className="text-left pb-2 text-[#002147] font-semibold">High School</th>
                    <th className="text-right pb-2 text-[#002147] font-semibold">All-Americans</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolData.map((school, index) => (
                    <tr key={`${school.name}-${index}`} className="border-b border-[#002147]/10">
                      <td className="py-2 text-[#002147]">
                        <div className="flex items-center gap-2 min-w-0">
                          <HighSchoolChartLogo schoolName={school.name} />
                          <span className="truncate">{school.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-2 text-[#002147] font-medium">{school.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
