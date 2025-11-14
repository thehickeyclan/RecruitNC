"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function VerifyDivisionCountsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<any[]>([])

  const fetchStats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/direct-dashboard-stats")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch division stats")
      }

      setStats(data)

      // Also fetch all athletes for detailed view
      const athletesResponse = await fetch("/api/athletes")
      const athletesData = await athletesResponse.json()

      if (!athletesResponse.ok) {
        throw new Error("Failed to fetch athletes")
      }

      // Filter to only include athletes with college commitments
      const committedAthletes = athletesData.filter((a: any) => a.college)
      setAthletes(committedAthletes)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Verify Division Counts</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Division Breakdown</CardTitle>
          <CardDescription>Current division counts for all athletes with college commitments</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchStats} disabled={isLoading} className="mb-4">
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              "Refresh Counts"
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stats && (
            <div className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-lg">Total Commitments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.totalCommitments}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-lg">Class of 2025</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.classOf2025}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-lg">Class of 2026</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.classOf2026}</p>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-xl font-bold mb-3">Division Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="py-2 bg-blue-600 text-white">
                    <CardTitle className="text-lg">D1</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.divisionBreakdown.D1}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2 bg-blue-600 text-white">
                    <CardTitle className="text-lg">D2</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.divisionBreakdown.D2}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2 bg-blue-600 text-white">
                    <CardTitle className="text-lg">D3</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.divisionBreakdown.D3}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2 bg-yellow-500 text-blue-900">
                    <CardTitle className="text-lg">NAIA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.divisionBreakdown.NAIA}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2 bg-yellow-500 text-blue-900">
                    <CardTitle className="text-lg">NJCAA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.divisionBreakdown.NJCAA}</p>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-xl font-bold mt-8 mb-3">Athletes with College Commitments</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">College</th>
                      <th className="text-left p-2">Division</th>
                      <th className="text-left p-2">Graduation Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {athletes.map((athlete: any) => (
                      <tr key={athlete.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{athlete.name}</td>
                        <td className="p-2">{athlete.college}</td>
                        <td className="p-2">{athlete.division}</td>
                        <td className="p-2">{athlete.graduationyear}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
