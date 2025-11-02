"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DivisionCountsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/direct-dashboard-stats", {
        cache: "no-store",
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
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Division Counts</h1>

      <Button onClick={fetchStats} disabled={loading} className="mb-6">
        {loading ? "Loading..." : "Refresh Stats"}
      </Button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">Error: {error}</div>
      )}

      {stats && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Total Commitments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalCommitments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Division Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>D1:</span>
                  <span className="font-bold">{stats.divisionCounts.D1}</span>
                </div>
                <div className="flex justify-between">
                  <span>D2:</span>
                  <span className="font-bold">{stats.divisionCounts.D2}</span>
                </div>
                <div className="flex justify-between">
                  <span>D3:</span>
                  <span className="font-bold">{stats.divisionCounts.D3}</span>
                </div>
                <div className="flex justify-between">
                  <span>NAIA:</span>
                  <span className="font-bold">{stats.divisionCounts.NAIA}</span>
                </div>
                <div className="flex justify-between">
                  <span>NJCAA:</span>
                  <span className="font-bold">{stats.divisionCounts.NJCAA}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between font-bold">
                  <span>Sum of Divisions:</span>
                  <span>{Object.values(stats.divisionCounts).reduce((a: number, b: number) => a + b, 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Update Instructions</h2>
        <div className="bg-blue-50 p-4 rounded-lg">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <a href="/debug/view-divisions" className="text-blue-600 hover:underline">
                View all athletes and their current divisions
              </a>
            </li>
            <li>
              <a href="/debug/update-college-division" className="text-blue-600 hover:underline">
                Update all athletes at a specific college
              </a>
            </li>
            <li>
              <a href="/debug/update-division" className="text-blue-600 hover:underline">
                Update an individual athlete's division
              </a>
            </li>
            <li>After making updates, come back to this page and click "Refresh Stats" to see the updated counts</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
