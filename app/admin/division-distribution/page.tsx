"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin-header"
import { AuthGuard } from "@/components/auth-guard"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { createClient } from "@/lib/supabase/client"

export default function DivisionDistributionPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [divisionCounts, setDivisionCounts] = useState<Record<string, number>>({})
  const [nonStandardDivisions, setNonStandardDivisions] = useState<string[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const supabase = createClient()

        // Get all athletes with divisions
        const { data, error } = await supabase.from("athletes").select("division").not("division", "is", null)

        if (error) throw error

        // Count divisions
        const counts: Record<string, number> = {}
        const nonStandard: string[] = []
        const standardDivisions = ["Division I", "Division II", "Division III", "NAIA", "NJCAA"]

        data.forEach((athlete) => {
          const division = athlete.division || "Unknown"

          // Check if this is a non-standard division name
          if (!standardDivisions.includes(division)) {
            if (!nonStandard.includes(division)) {
              nonStandard.push(division)
            }
          }

          counts[division] = (counts[division] || 0) + 1
        })

        setDivisionCounts(counts)
        setNonStandardDivisions(nonStandard)
      } catch (err) {
        console.error("Error fetching division distribution:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Prepare chart data
  const chartData = Object.entries(divisionCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Chart colors
  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#6b7280"]

  return (
    <AuthGuard>
      <div className="container py-8">
        <AdminHeader
          title="Division Distribution"
          description="View the distribution of division names in the database"
        />

        {loading ? (
          <div className="text-center py-10">Loading division data...</div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
        ) : (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Division Distribution</CardTitle>
                <CardDescription>Distribution of athletes across different divisions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} athletes`, "Count"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {nonStandardDivisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Non-Standard Division Names</CardTitle>
                  <CardDescription>These division names need to be standardized</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                    <p className="text-amber-800">
                      The following division names do not match the standard format. Use the "Standardize Division
                      Names" tool to fix these.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nonStandardDivisions.map((division, index) => (
                      <div key={index} className="border rounded-md p-3 flex justify-between items-center">
                        <span>{division}</span>
                        <span className="text-sm font-semibold">{divisionCounts[division] || 0}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
