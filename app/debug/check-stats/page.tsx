"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CheckStatsPage() {
  const [stats, setStats] = useState<any>(null)
  const [rawData, setRawData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [rawLoading, setRawLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawError, setRawError] = useState<string | null>(null)

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
      setStats(data)
    } catch (err) {
      console.error("Error fetching stats:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const fetchRawData = async () => {
    setRawLoading(true)
    setRawError(null)
    try {
      const response = await fetch("/api/debug/athlete-division-check", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch raw data")
      }
      const data = await response.json()
      setRawData(data)
    } catch (err) {
      console.error("Error fetching raw data:", err)
      setRawError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setRawLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchRawData()
  }, [])

  // Calculate the sum of division counts
  const calculateDivisionSum = (divisionBreakdown: any) => {
    if (!divisionBreakdown) return 0
    return Object.values(divisionBreakdown).reduce((sum: any, count: any) => sum + count, 0)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Stats API Check</h1>

      <Tabs defaultValue="stats">
        <TabsList className="mb-4">
          <TabsTrigger value="stats">Dashboard Stats</TabsTrigger>
          <TabsTrigger value="raw">Raw Athlete Data</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <div className="mb-4">
            <Button onClick={fetchStats} disabled={loading} className="mr-2">
              {loading ? "Loading..." : "Refresh Stats"}
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">Error: {error}</div>
          )}

          {stats && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Stats Response</h2>

              <div className="mb-4">
                <h3 className="font-medium">Total Commitments</h3>
                <p className="text-2xl">{stats.totalCommitments}</p>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Division Breakdown</h3>
                <div className="grid grid-cols-5 gap-4 mt-2">
                  <div className="bg-blue-100 p-3 rounded">
                    <p className="font-medium">D1</p>
                    <p className="text-2xl">{stats.divisionBreakdown?.D1 || 0}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded">
                    <p className="font-medium">D2</p>
                    <p className="text-2xl">{stats.divisionBreakdown?.D2 || 0}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded">
                    <p className="font-medium">D3</p>
                    <p className="text-2xl">{stats.divisionBreakdown?.D3 || 0}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded">
                    <p className="font-medium">NAIA</p>
                    <p className="text-2xl">{stats.divisionBreakdown?.NAIA || 0}</p>
                  </div>
                  <div className="bg-pink-100 p-3 rounded">
                    <p className="font-medium">NJCAA</p>
                    <p className="text-2xl">{stats.divisionBreakdown?.NJCAA || 0}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <p className="font-medium">Sum of Division Counts: {calculateDivisionSum(stats.divisionBreakdown)}</p>
                  <p className="font-medium">
                    Matches Total Commitments:{" "}
                    {calculateDivisionSum(stats.divisionBreakdown) === stats.totalCommitments ? "✅ Yes" : "❌ No"}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Class Breakdown</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-medium">Class of 2025</p>
                    <p className="text-2xl">{stats.classOf2025 || 0}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-medium">Class of 2026</p>
                    <p className="text-2xl">{stats.classOf2026 || 0}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium">Raw Response</h3>
                <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto max-h-96">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="raw">
          <div className="mb-4">
            <Button onClick={fetchRawData} disabled={rawLoading} className="mr-2">
              {rawLoading ? "Loading..." : "Refresh Raw Data"}
            </Button>
          </div>

          {rawError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Error: {rawError}
            </div>
          )}

          {rawData && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Raw Athlete Data</h2>

              <div className="mb-4">
                <h3 className="font-medium">Total Athletes with Commitments</h3>
                <p className="text-2xl">{rawData.totalAthletes}</p>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Division Counts (Raw)</h3>
                <div className="grid grid-cols-6 gap-4 mt-2">
                  <div className="bg-blue-100 p-3 rounded">
                    <p className="font-medium">D1</p>
                    <p className="text-2xl">{rawData.divisionCounts?.D1 || 0}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded">
                    <p className="font-medium">D2</p>
                    <p className="text-2xl">{rawData.divisionCounts?.D2 || 0}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded">
                    <p className="font-medium">D3</p>
                    <p className="text-2xl">{rawData.divisionCounts?.D3 || 0}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded">
                    <p className="font-medium">NAIA</p>
                    <p className="text-2xl">{rawData.divisionCounts?.NAIA || 0}</p>
                  </div>
                  <div className="bg-pink-100 p-3 rounded">
                    <p className="font-medium">NJCAA</p>
                    <p className="text-2xl">{rawData.divisionCounts?.NJCAA || 0}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded">
                    <p className="font-medium">Unknown</p>
                    <p className="text-2xl">{rawData.divisionCounts?.Unknown || 0}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <p className="font-medium">
                    Sum of Division Counts:{" "}
                    {Object.values(rawData.divisionCounts || {}).reduce((sum: any, count: any) => sum + count, 0)}
                  </p>
                  <p className="font-medium">
                    Matches Total Athletes:{" "}
                    {Object.values(rawData.divisionCounts || {}).reduce((sum: any, count: any) => sum + count, 0) ===
                    rawData.totalAthletes
                      ? "✅ Yes"
                      : "❌ No"}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Athletes with Unknown Division</h3>
                <div className="mt-2 bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">College</th>
                        <th className="text-left p-2">Division</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.athletesByDivision?.Unknown?.map((athlete: any) => (
                        <tr key={athlete.id} className="border-t border-gray-200">
                          <td className="p-2">{athlete.id}</td>
                          <td className="p-2">{athlete.name}</td>
                          <td className="p-2">{athlete.college}</td>
                          <td className="p-2">{athlete.division || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
