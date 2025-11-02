"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"

export default function CommitmentStatsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Commitment Statistics</h1>
        <Button onClick={fetchStats} disabled={loading} variant="outline" className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">Error: {error}</div>
      )}

      {loading && !stats && (
        <div className="text-center py-10">
          <p className="text-gray-500">Loading statistics...</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Commitments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-bold">{stats.totalCommitments}</p>
              <p className="text-gray-500 mt-2">Total athletes with college commitments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Class Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-lg font-medium">Class of 2025</p>
                  <p className="text-3xl font-bold">{stats.classOf2025}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-lg font-medium">Class of 2026</p>
                  <p className="text-3xl font-bold">{stats.classOf2026}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Division Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-100 p-4 rounded-lg">
                  <p className="text-lg font-medium">NCAA D1</p>
                  <p className="text-3xl font-bold">{stats.divisionBreakdown?.D1 || 0}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg">
                  <p className="text-lg font-medium">NCAA D2</p>
                  <p className="text-3xl font-bold">{stats.divisionBreakdown?.D2 || 0}</p>
                </div>
                <div className="bg-yellow-100 p-4 rounded-lg">
                  <p className="text-lg font-medium">NCAA D3</p>
                  <p className="text-3xl font-bold">{stats.divisionBreakdown?.D3 || 0}</p>
                </div>
                <div className="bg-purple-100 p-4 rounded-lg">
                  <p className="text-lg font-medium">NAIA</p>
                  <p className="text-3xl font-bold">{stats.divisionBreakdown?.NAIA || 0}</p>
                </div>
                <div className="bg-pink-100 p-4 rounded-lg">
                  <p className="text-lg font-medium">NJCAA</p>
                  <p className="text-3xl font-bold">{stats.divisionBreakdown?.NJCAA || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
