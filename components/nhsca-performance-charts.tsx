"use client"
import { useMemo, useState } from "react"

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
                    <div key={`${school.name}-${index}`} className="flex items-center">
                      <div className="w-[45%] text-right pr-4 text-sm text-[#002147]">{school.name}</div>
                      <div className="w-[55%]">
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
                <div className="flex justify-between mt-4 pl-[45%] pr-0 text-xs text-[#002147]/60">
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
                      <td className="py-2 text-[#002147]">{school.name}</td>
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
