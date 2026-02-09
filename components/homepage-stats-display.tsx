"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

type StatsData = {
  totalCommitments: number
  byYear: {
    2025: number
    2026: number
    other: number
  }
  byDivision: {
    D1: number
    D2: number
    D3: number
    NAIA: number
    NJCAA: number
  }
  byGender: {
    male: number
    female: number
  }
}

export function HomepageStatsDisplay() {
  const [stats, setStats] = useState<StatsData>({
    totalCommitments: 0,
    byYear: {
      2025: 0,
      2026: 0,
      other: 0,
    },
    byDivision: {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
    },
    byGender: {
      male: 0,
      female: 0,
    },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/commitment-stats", { cache: "no-store" })
        const data = await res.json()
        if (data.success && data.stats) {
          setStats({
            totalCommitments: data.stats.totalCommitments,
            byYear: data.stats.byYear,
            byDivision: data.stats.byDivision,
            byGender: data.stats.byGender,
          })
        }
      } catch (err) {
        console.error("Error fetching stats:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="text-center py-4">Loading stats...</div>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Commitments */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-medium text-blue-700">Total Commitments</h3>
          <p className="text-4xl font-bold text-blue-800 mt-2">{stats.totalCommitments}</p>
        </CardContent>
      </Card>

      {/* By Year */}
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-amber-700 mb-2">By Graduation Year</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-amber-800">Class of 2025</span>
              <span className="font-semibold text-amber-900">{stats.byYear[2025]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-800">Class of 2026</span>
              <span className="font-semibold text-amber-900">{stats.byYear[2026]}</span>
            </div>
            {stats.byYear.other > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-800">Other Years</span>
                <span className="font-semibold text-amber-900">{stats.byYear.other}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* By Division */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-green-700 mb-2">By Division</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex flex-col items-center bg-white/60 p-1 rounded">
              <span className="font-bold text-green-800">{stats.byDivision.D1}</span>
              <span className="text-green-700">D1</span>
            </div>
            <div className="flex flex-col items-center bg-white/60 p-1 rounded">
              <span className="font-bold text-green-800">{stats.byDivision.D2}</span>
              <span className="text-green-700">D2</span>
            </div>
            <div className="flex flex-col items-center bg-white/60 p-1 rounded">
              <span className="font-bold text-green-800">{stats.byDivision.D3}</span>
              <span className="text-green-700">D3</span>
            </div>
            <div className="flex flex-col items-center bg-white/60 p-1 rounded">
              <span className="font-bold text-green-800">{stats.byDivision.NAIA}</span>
              <span className="text-green-700">NAIA</span>
            </div>
            <div className="flex flex-col items-center bg-white/60 p-1 rounded">
              <span className="font-bold text-green-800">{stats.byDivision.NJCAA}</span>
              <span className="text-green-700">NJCAA</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* By Gender */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-purple-700 mb-2">By Gender</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-full bg-purple-200 rounded-full h-4">
                <div
                  className="bg-purple-600 h-4 rounded-full"
                  style={{
                    width: `${stats.totalCommitments ? (stats.byGender.male / stats.totalCommitments) * 100 : 0}%`,
                  }}
                ></div>
              </div>
              <span className="ml-2 font-semibold text-purple-900 min-w-[30px] text-right">{stats.byGender.male}</span>
            </div>
            <div className="flex items-center">
              <div className="w-full bg-pink-200 rounded-full h-4">
                <div
                  className="bg-pink-500 h-4 rounded-full"
                  style={{
                    width: `${stats.totalCommitments ? (stats.byGender.female / stats.totalCommitments) * 100 : 0}%`,
                  }}
                ></div>
              </div>
              <span className="ml-2 font-semibold text-pink-900 min-w-[30px] text-right">{stats.byGender.female}</span>
            </div>
            <div className="flex justify-between text-sm pt-1">
              <span className="text-purple-700">Male</span>
              <span className="text-pink-700">Female</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
