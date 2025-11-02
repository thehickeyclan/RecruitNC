"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface StatsData {
  totalCommitments: number
  classOf2025: number
  classOf2026: number
  divisionBreakdown: {
    D1: number
    D2: number
    D3: number
    NAIA: number
    NJCAA: number
  }
  athleteCount: number
}

export function UltraSimpleStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        const response = await fetch("/api/ultra-simple-stats")

        if (!response.ok) {
          throw new Error(`Error fetching stats: ${response.status}`)
        }

        const data = await response.json()
        setStats(data)
      } catch (err) {
        console.error("Error fetching stats:", err)
        setError("Failed to load stats")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="h-24 animate-pulse rounded-md bg-gray-200"></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="h-24 animate-pulse rounded-md bg-gray-200"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (!stats) {
    return <div>No stats available</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="bg-blue-900 text-white">
        <CardContent className="p-6">
          <h3 className="mb-2 text-xl font-semibold">Total Commitments</h3>
          <p className="text-4xl font-bold">{stats.totalCommitments}</p>
          <div className="mt-2 text-sm">
            <p>Class of 2025: {stats.classOf2025}</p>
            <p>Class of 2026: {stats.classOf2026}</p>
            <p className="mt-2 text-xs text-gray-300">Total Athletes: {stats.athleteCount}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-red-900 text-white">
        <CardContent className="p-6">
          <h3 className="mb-2 text-xl font-semibold">Division Breakdown</h3>
          <div className="grid grid-cols-5 gap-2">
            <div className="text-center">
              <div className="rounded-md bg-blue-800 p-2">
                <p className="font-bold">D1</p>
                <p className="text-xl">{stats.divisionBreakdown.D1}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="rounded-md bg-blue-800 p-2">
                <p className="font-bold">D2</p>
                <p className="text-xl">{stats.divisionBreakdown.D2}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="rounded-md bg-blue-800 p-2">
                <p className="font-bold">D3</p>
                <p className="text-xl">{stats.divisionBreakdown.D3}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="rounded-md bg-yellow-700 p-2">
                <p className="font-bold">NAIA</p>
                <p className="text-xl">{stats.divisionBreakdown.NAIA}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="rounded-md bg-yellow-700 p-2">
                <p className="font-bold">NJCAA</p>
                <p className="text-xl">{stats.divisionBreakdown.NJCAA}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
