"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Award, Trophy } from "lucide-react"

interface DivisionStats {
  D1: number
  D2: number
  D3: number
  NAIA: number
  NJCAA: number // Changed from JuCo to NJCAA
}

interface Stats {
  totalAthletes: number
  divisions: DivisionStats
}

export function DirectStatsDisplay() {
  const [stats, setStats] = useState<Stats>({
    totalAthletes: 0,
    divisions: { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/direct-dashboard-stats", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }
      const data = await response.json()
      setStats({
        totalAthletes: data.totalCommitments || 0,
        divisions: data.divisionBreakdown || { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
      })
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Error fetching stats:", err)
      setError("Failed to load stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // NC United Wrestling colors
  const colors = {
    blue: "#0a1e50",
    red: "#c8102e",
    gold: "#f1c400",
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#0a1e50]">Wrestling Commitment Stats</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 border-[#0a1e50] text-[#0a1e50] hover:bg-[#0a1e50] hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-[#0a1e50] shadow-md overflow-hidden">
          <div className="bg-[#0a1e50] py-2 px-4">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Total Commitments
            </CardTitle>
          </div>
          <CardContent className="pt-4">
            <p className="text-4xl font-bold text-center">{stats.totalAthletes}</p>
            <p className="text-sm text-center text-gray-500 mt-1">NC Wrestlers Committed</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-2 border-[#c8102e] shadow-md overflow-hidden">
          <div className="bg-[#c8102e] py-2 px-4">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Award className="h-5 w-5" />
              Division Breakdown
            </CardTitle>
          </div>
          <CardContent className="pt-4">
            <div className="grid grid-cols-5 gap-3 text-center">
              <div className="rounded-lg overflow-hidden shadow-sm">
                <div className="bg-[#0a1e50] text-white p-2">
                  <p className="text-sm font-medium">D1</p>
                </div>
                <div className="bg-white p-3">
                  <p className="text-2xl font-bold">{stats.divisions.D1}</p>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden shadow-sm">
                <div className="bg-[#0a1e50] text-white p-2">
                  <p className="text-sm font-medium">D2</p>
                </div>
                <div className="bg-white p-3">
                  <p className="text-2xl font-bold">{stats.divisions.D2}</p>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden shadow-sm">
                <div className="bg-[#0a1e50] text-white p-2">
                  <p className="text-sm font-medium">D3</p>
                </div>
                <div className="bg-white p-3">
                  <p className="text-2xl font-bold">{stats.divisions.D3}</p>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden shadow-sm">
                <div className="bg-[#f1c400] text-[#0a1e50] p-2">
                  <p className="text-sm font-medium">NAIA</p>
                </div>
                <div className="bg-white p-3">
                  <p className="text-2xl font-bold">{stats.divisions.NAIA}</p>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden shadow-sm">
                <div className="bg-[#f1c400] text-[#0a1e50] p-2">
                  <p className="text-sm font-medium">NJCAA</p>
                </div>
                <div className="bg-white p-3">
                  <p className="text-2xl font-bold">{stats.divisions.NJCAA}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-gray-500 text-right">Last updated: {lastUpdated.toLocaleTimeString()}</p>
    </div>
  )
}
