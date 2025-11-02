"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Athlete {
  id: string
  name: string
  college: string
  originalDivision: string
  assignedDivision: string
}

interface StatsData {
  totalCommitments: number
  divisionBreakdown: {
    "Division I": number
    "Division II": number
    "Division III": number
    NAIA: number
    NJCAA: number
    Unknown: number
  }
  d1Athletes: Athlete[]
  d2Athletes: Athlete[]
  d3Athletes: Athlete[]
  naiaAthletes: Athlete[]
  njcaaAthletes: Athlete[]
  unknownAthletes: Athlete[]
}

export default function DebugStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug-stats")

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

  useEffect(() => {
    fetchStats()
  }, [])

  const renderAthleteTable = (athletes: Athlete[]) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">ID</th>
            <th className="border p-2 text-left">Name</th>
            <th className="border p-2 text-left">College</th>
            <th className="border p-2 text-left">Original Division</th>
            <th className="border p-2 text-left">Assigned Division</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map((athlete) => (
            <tr key={athlete.id} className="hover:bg-gray-50">
              <td className="border p-2">{athlete.id}</td>
              <td className="border p-2">{athlete.name}</td>
              <td className="border p-2">{athlete.college}</td>
              <td className="border p-2">{athlete.originalDivision}</td>
              <td className="border p-2">{athlete.assignedDivision}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Debug Stats</h1>

      <Button onClick={fetchStats} disabled={loading} className="mb-6">
        {loading ? "Loading..." : "Refresh Stats"}
      </Button>

      {error && <div className="mb-4 rounded bg-red-100 p-4 text-red-700">{error}</div>}

      {stats && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Division Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                <div className="rounded bg-blue-100 p-4 text-center">
                  <div className="text-sm font-medium">Total</div>
                  <div className="text-2xl font-bold">{stats.totalCommitments}</div>
                </div>
                <div className="rounded bg-blue-100 p-4 text-center">
                  <div className="text-sm font-medium">Division I</div>
                  <div className="text-2xl font-bold">{stats.divisionBreakdown["Division I"]}</div>
                </div>
                <div className="rounded bg-blue-100 p-4 text-center">
                  <div className="text-sm font-medium">Division II</div>
                  <div className="text-2xl font-bold">{stats.divisionBreakdown["Division II"]}</div>
                </div>
                <div className="rounded bg-blue-100 p-4 text-center">
                  <div className="text-sm font-medium">Division III</div>
                  <div className="text-2xl font-bold">{stats.divisionBreakdown["Division III"]}</div>
                </div>
                <div className="rounded bg-blue-100 p-4 text-center">
                  <div className="text-sm font-medium">NAIA</div>
                  <div className="text-2xl font-bold">{stats.divisionBreakdown["NAIA"]}</div>
                </div>
                <div className="rounded bg-blue-100 p-4 text-center">
                  <div className="text-sm font-medium">NJCAA</div>
                  <div className="text-2xl font-bold">{stats.divisionBreakdown["NJCAA"]}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Division I Athletes ({stats.d1Athletes.length})</CardTitle>
            </CardHeader>
            <CardContent>{renderAthleteTable(stats.d1Athletes)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Division II Athletes ({stats.d2Athletes.length})</CardTitle>
            </CardHeader>
            <CardContent>{renderAthleteTable(stats.d2Athletes)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Division III Athletes ({stats.d3Athletes.length})</CardTitle>
            </CardHeader>
            <CardContent>{renderAthleteTable(stats.d3Athletes)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>NAIA Athletes ({stats.naiaAthletes.length})</CardTitle>
            </CardHeader>
            <CardContent>{renderAthleteTable(stats.naiaAthletes)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>NJCAA Athletes ({stats.njcaaAthletes.length})</CardTitle>
            </CardHeader>
            <CardContent>{renderAthleteTable(stats.njcaaAthletes)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unknown Division Athletes ({stats.unknownAthletes.length})</CardTitle>
            </CardHeader>
            <CardContent>{renderAthleteTable(stats.unknownAthletes)}</CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
