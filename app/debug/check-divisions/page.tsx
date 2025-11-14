"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"

export default function CheckDivisionsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/check-athlete-divisions?t=" + new Date().getTime())
      if (!response.ok) {
        throw new Error("Failed to fetch division data")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Check Athlete Divisions</h1>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading && <p>Loading...</p>}

      {data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Division Counts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Total Athletes with Commitments: {data.totalAthletes}</p>

              <div className="bg-gray-50 p-4 rounded-md">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Division</th>
                      <th className="px-4 py-2 text-left">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.divisionCounts).map(([division, count]: [string, any]) => (
                      <tr key={division} className="border-t">
                        <td className="px-4 py-2 font-medium">{division}</td>
                        <td className="px-4 py-2">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {Object.entries(data.athletesByDivision).map(([division, athletes]: [string, any]) => (
              <Card key={division}>
                <CardHeader>
                  <CardTitle>
                    {division} ({athletes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">College</th>
                        </tr>
                      </thead>
                      <tbody>
                        {athletes.map((athlete: any) => (
                          <tr key={athlete.id} className="border-t">
                            <td className="px-4 py-2">{athlete.name}</td>
                            <td className="px-4 py-2">{athlete.college}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
