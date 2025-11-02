"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function SimpleStatsDisplay() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/direct-stats-simple", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(`Failed to load stats: ${err instanceof Error ? err.message : String(err)}`)
      console.error("Error fetching stats:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Simple Stats Display</h2>
        <Button onClick={fetchStats} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading stats...</span>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Total Commitments</h3>
              <p className="text-4xl font-bold text-center">{stats.totalCommitments}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Division Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Division I:</span>
                  <span className="font-semibold">{stats.divisionBreakdown?.D1 || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Division II:</span>
                  <span className="font-semibold">{stats.divisionBreakdown?.D2 || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Division III:</span>
                  <span className="font-semibold">{stats.divisionBreakdown?.D3 || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>NAIA:</span>
                  <span className="font-semibold">{stats.divisionBreakdown?.NAIA || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>NJCAA:</span>
                  <span className="font-semibold">{stats.divisionBreakdown?.NJCAA || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unknown:</span>
                  <span className="font-semibold">{stats.divisionBreakdown?.Unknown || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Sample Athletes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        College
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Division
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.rawData?.athletes?.map((athlete: any) => (
                      <tr key={athlete.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{athlete.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {athlete.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{athlete.college}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{athlete.division}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p>No stats available</p>
      )}
    </div>
  )
}
