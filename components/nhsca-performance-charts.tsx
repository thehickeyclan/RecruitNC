"use client"
import { useState } from "react"

// NC United brand colors
const NC_NAVY = "#002147"
const NC_RED = "#B31B1B"

// Club data
const clubData = [
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

// High School data
const schoolData = [
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

export default function NHSCAPerformanceCharts() {
  const [clubTab, setClubTab] = useState<"chart" | "details">("chart")
  const [schoolTab, setSchoolTab] = useState<"chart" | "details">("chart")

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
              className={`px-6 py-3 ${clubTab === "chart" ? "bg-white font-medium text-[#002147]" : "hover:bg-gray-50 text-[#002147]/70"}`}
              onClick={() => setClubTab("chart")}
            >
              Chart
            </button>
            <button
              className={`px-6 py-3 ${clubTab === "details" ? "bg-white font-medium text-[#002147]" : "hover:bg-gray-50 text-[#002147]/70"}`}
              onClick={() => setClubTab("details")}
            >
              Club Details
            </button>
          </div>
        </div>

        {clubTab === "chart" ? (
          <div className="p-6">
            <div className="space-y-4">
              {clubData.map((club, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-[40%] text-right pr-4 text-sm text-[#002147]">{club.name}</div>
                  <div className="w-[60%]">
                    <div
                      className="h-6 rounded-r"
                      style={{
                        width: `${(club.value / 8) * 100}%`,
                        backgroundColor: NC_NAVY,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* X-axis */}
            <div className="flex justify-between mt-4 pl-[40%] pr-0 text-xs text-[#002147]/60">
              <div>0</div>
              <div>2</div>
              <div>4</div>
              <div>6</div>
              <div>8</div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#002147]/20">
                  <th className="text-left pb-2 text-[#002147] font-semibold">Club</th>
                  <th className="text-right pb-2 text-[#002147] font-semibold">All-Americans</th>
                </tr>
              </thead>
              <tbody>
                {clubData.map((club, index) => (
                  <tr key={index} className="border-b border-[#002147]/10">
                    <td className="py-2 text-[#002147]">{club.name}</td>
                    <td className="text-right py-2 text-[#002147] font-medium">{club.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              className={`px-6 py-3 ${schoolTab === "chart" ? "bg-white font-medium text-[#002147]" : "hover:bg-gray-50 text-[#002147]/70"}`}
              onClick={() => setSchoolTab("chart")}
            >
              Chart
            </button>
            <button
              className={`px-6 py-3 ${schoolTab === "details" ? "bg-white font-medium text-[#002147]" : "hover:bg-gray-50 text-[#002147]/70"}`}
              onClick={() => setSchoolTab("details")}
            >
              School Details
            </button>
          </div>
        </div>

        {schoolTab === "chart" ? (
          <div className="p-6 max-h-[500px] overflow-y-auto">
            <div className="space-y-4">
              {schoolData.map((school, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-[45%] text-right pr-4 text-sm text-[#002147]">{school.name}</div>
                  <div className="w-[55%]">
                    <div
                      className="h-6 rounded-r"
                      style={{
                        width: `${(school.value / 8) * 100}%`,
                        backgroundColor: NC_RED,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* X-axis */}
            <div className="flex justify-between mt-4 pl-[45%] pr-0 text-xs text-[#002147]/60">
              <div>0</div>
              <div>2</div>
              <div>4</div>
              <div>6</div>
              <div>8</div>
            </div>
          </div>
        ) : (
          <div className="p-6 max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#002147]/20">
                  <th className="text-left pb-2 text-[#002147] font-semibold">High School</th>
                  <th className="text-right pb-2 text-[#002147] font-semibold">All-Americans</th>
                </tr>
              </thead>
              <tbody>
                {schoolData.map((school, index) => (
                  <tr key={index} className="border-b border-[#002147]/10">
                    <td className="py-2 text-[#002147]">{school.name}</td>
                    <td className="text-right py-2 text-[#002147] font-medium">{school.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
