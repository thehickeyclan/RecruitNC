"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { AuthGuard } from "@/components/auth-guard"
import { createClient } from "@/lib/supabase/client"

export default function ViewDivisionDataPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all athletes with college commitments
      const { data: athletes, error } = await supabase
        .from("athletes")
        .select("id, name, college, division")
        .not("college", "is", null)
        .order("id", { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      // Count athletes by division
      const divisionCounts = {
        "NCAA D1": 0,
        "NCAA D2": 0,
        "NCAA D3": 0,
        NAIA: 0,
        NJCAA: 0,
        Unknown: 0,
      }

      // Group athletes by division
      const athletesByDivision: Record<string, any[]> = {
        "NCAA D1": [],
        "NCAA D2": [],
        "NCAA D3": [],
        NAIA: [],
        NJCAA: [],
        Unknown: [],
      }

      // Process each athlete
      athletes.forEach((athlete) => {
        const division = athlete.division || "Unknown"

        if (division.includes("D1") || division.includes("Division I") || division.includes("Division 1")) {
          divisionCounts["NCAA D1"]++
          athletesByDivision["NCAA D1"].push(athlete)
        } else if (division.includes("D2") || division.includes("Division II") || division.includes("Division 2")) {
          divisionCounts["NCAA D2"]++
          athletesByDivision["NCAA D2"].push(athlete)
        } else if (division.includes("D3") || division.includes("Division III") || division.includes("Division 3")) {
          divisionCounts["NCAA D3"]++
          athletesByDivision["NCAA D3"].push(athlete)
        } else if (division.includes("NAIA")) {
          divisionCounts["NAIA"]++
          athletesByDivision["NAIA"].push(athlete)
        } else if (
          division.includes("JUCO") ||
          division.includes("Junior") ||
          division.includes("NJCAA") ||
          division.includes("Community College")
        ) {
          divisionCounts["NJCAA"]++
          athletesByDivision["NJCAA"].push(athlete)
        } else {
          divisionCounts["Unknown"]++
          athletesByDivision["Unknown"].push(athlete)
        }
      })

      setData({
        totalAthletes: athletes.length,
        counts: divisionCounts,
        athletesByDivision,
      })
      setError(null)
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
    <AuthGuard>
      <div className="container py-8">
        <AdminHeader title="View Division Data" description="View and analyze division data for athletes" />

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Division Data</h1>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-8">Loading division data...</div>
        ) : data ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Division Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  Total Athletes with College Commitments: <strong>{data.totalAthletes}</strong>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
                  {Object.entries(data.counts).map(([division, count]) => (
                    <div key={division} className="bg-gray-100 p-4 rounded-md">
                      <h3 className="font-semibold">{division}</h3>
                      <p className="text-2xl font-bold">{count as number}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Athletes by Division</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(data.athletesByDivision).map(([division, athletes]) => (
                    <div key={division} className="border-t pt-4">
                      <h3 className="font-semibold text-lg mb-2">
                        {division} ({(athletes as any[]).length})
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left">ID</th>
                              <th className="px-4 py-2 text-left">Name</th>
                              <th className="px-4 py-2 text-left">College</th>
                              <th className="px-4 py-2 text-left">Division</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(athletes as any[]).map((athlete) => (
                              <tr key={athlete.id}>
                                <td className="px-4 py-2">{athlete.id}</td>
                                <td className="px-4 py-2">{athlete.name}</td>
                                <td className="px-4 py-2">{athlete.college}</td>
                                <td className="px-4 py-2">{athlete.division || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  )
}
