"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdjustDivisionCountsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [divisionCounts, setDivisionCounts] = useState({
    D1: 16,
    D2: 20,
    D3: 18,
    NAIA: 8,
    NJCAA: 4,
  })

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

      // Update the form with current values
      if (data.divisionBreakdown) {
        setDivisionCounts({
          D1: data.divisionBreakdown.D1 || 16,
          D2: data.divisionBreakdown.D2 || 20,
          D3: data.divisionBreakdown.D3 || 18,
          NAIA: data.divisionBreakdown.NAIA || 8,
          NJCAA: data.divisionBreakdown.NJCAA || 4,
        })
      }
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

  const handleInputChange = (division: string, value: string) => {
    const numValue = Number.parseInt(value) || 0
    setDivisionCounts({
      ...divisionCounts,
      [division]: numValue,
    })
  }

  const calculateTotal = () => {
    return Object.values(divisionCounts).reduce((sum, count) => sum + count, 0)
  }

  const updateApiFile = async () => {
    alert(
      "This would update the hardcoded values in the API file. In a real implementation, this would modify the API file or store values in a database.",
    )
    // In a real implementation, this would call an API endpoint to update the hardcoded values
    // or store them in a database table that the API would read from
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Adjust Division Counts</h1>

      <div className="mb-4">
        <Button onClick={fetchStats} disabled={loading} className="mr-2">
          {loading ? "Loading..." : "Refresh Stats"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">Error: {error}</div>
      )}

      {stats && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Stats</h2>

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
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Adjust Division Counts</h2>
        <p className="mb-4 text-gray-600">
          Use this form to adjust the hardcoded division counts used in the stats API. The total should match the total
          number of commitments ({stats?.totalCommitments || "unknown"}).
        </p>

        <div className="grid grid-cols-5 gap-4 mb-6">
          <div>
            <Label htmlFor="d1-count">D1 Count</Label>
            <Input
              id="d1-count"
              type="number"
              value={divisionCounts.D1}
              onChange={(e) => handleInputChange("D1", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="d2-count">D2 Count</Label>
            <Input
              id="d2-count"
              type="number"
              value={divisionCounts.D2}
              onChange={(e) => handleInputChange("D2", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="d3-count">D3 Count</Label>
            <Input
              id="d3-count"
              type="number"
              value={divisionCounts.D3}
              onChange={(e) => handleInputChange("D3", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="naia-count">NAIA Count</Label>
            <Input
              id="naia-count"
              type="number"
              value={divisionCounts.NAIA}
              onChange={(e) => handleInputChange("NAIA", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="njcaa-count">NJCAA Count</Label>
            <Input
              id="njcaa-count"
              type="number"
              value={divisionCounts.NJCAA}
              onChange={(e) => handleInputChange("NJCAA", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-100 rounded">
          <p className="font-medium">Total Count: {calculateTotal()}</p>
          <p className="font-medium">
            Matches Total Commitments: {calculateTotal() === (stats?.totalCommitments || 0) ? "✅ Yes" : "❌ No"}
            {calculateTotal() !== (stats?.totalCommitments || 0) && (
              <span className="text-red-500 ml-2">
                (Difference: {calculateTotal() - (stats?.totalCommitments || 0)})
              </span>
            )}
          </p>
        </div>

        <Button onClick={updateApiFile}>Update Hardcoded Values</Button>
        <p className="mt-2 text-sm text-gray-500">
          Note: In this demo, this button just shows an alert. In a real implementation, it would update the API file or
          store values in a database.
        </p>
      </div>
    </div>
  )
}
