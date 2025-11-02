"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { supabase } from "@/lib/supabase"

type StatsData = {
  totalCommitments: number
  classOf2025: number
  classOf2026: number
  divisionBreakdown: {
    D1: number
    D2: number
    D3: number
    NAIA: number
    NJCAA: number
  }
}

export function SimplifiedStatsDisplay() {
  const [stats, setStats] = useState<StatsData>({
    totalCommitments: 0,
    classOf2025: 0,
    classOf2026: 0,
    divisionBreakdown: {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
    },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        // Get all athletes with college commitments
        const { data: athletes, error: athletesError } = await supabase
          .from("athletes")
          .select("id, name, college, division, graduationyear")
          .not("college", "is", null)

        if (athletesError) throw new Error("Failed to fetch athletes")

        // Initialize stats object
        const newStats = {
          totalCommitments: athletes.length,
          classOf2025: 0,
          classOf2026: 0,
          divisionBreakdown: {
            D1: 0,
            D2: 0,
            D3: 0,
            NAIA: 0,
            NJCAA: 0,
          },
        }

        // Process athletes
        athletes.forEach((athlete) => {
          // Count by graduation year
          if (athlete.graduationyear === 2025) {
            newStats.classOf2025++
          } else if (athlete.graduationyear === 2026) {
            newStats.classOf2026++
          }

          // Count by division - EXACT MATCH
          const division = athlete.division || ""
          if (division === "NCAA Division I") {
            newStats.divisionBreakdown.D1++
          } else if (division === "NCAA Division II") {
            newStats.divisionBreakdown.D2++
          } else if (division === "NCAA Division III") {
            newStats.divisionBreakdown.D3++
          } else if (division === "NAIA") {
            newStats.divisionBreakdown.NAIA++
          } else if (division === "NJCAA") {
            newStats.divisionBreakdown.NJCAA++
          }
        })

        setStats(newStats)
      } catch (err) {
        console.error("Error fetching stats:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="text-center py-4">Loading stats...</div>
  }

  // Prepare data for pie chart
  const divisionData = [
    { name: "NCAA D1", value: stats.divisionBreakdown.D1, color: "#ef4444" },
    { name: "NCAA D2", value: stats.divisionBreakdown.D2, color: "#3b82f6" },
    { name: "NCAA D3", value: stats.divisionBreakdown.D3, color: "#10b981" },
    { name: "NAIA", value: stats.divisionBreakdown.NAIA, color: "#f59e0b" },
    { name: "NJCAA", value: stats.divisionBreakdown.NJCAA, color: "#8b5cf6" },
  ].filter((item) => item.value > 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Summary Card */}
      <Card className="md:col-span-1">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4">Commitment Summary</h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-medium">Total Commitments</span>
              <span className="text-xl font-bold">{stats.totalCommitments}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Class of 2025</span>
              <span className="font-semibold">{stats.classOf2025}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Class of 2026</span>
              <span className="font-semibold">{stats.classOf2026}</span>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Division Breakdown</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex flex-col items-center bg-red-50 p-2 rounded">
                  <span className="font-bold text-red-600">{stats.divisionBreakdown.D1}</span>
                  <span>D1</span>
                </div>
                <div className="flex flex-col items-center bg-blue-50 p-2 rounded">
                  <span className="font-bold text-blue-600">{stats.divisionBreakdown.D2}</span>
                  <span>D2</span>
                </div>
                <div className="flex flex-col items-center bg-green-50 p-2 rounded">
                  <span className="font-bold text-green-600">{stats.divisionBreakdown.D3}</span>
                  <span>D3</span>
                </div>
                <div className="flex flex-col items-center bg-amber-50 p-2 rounded">
                  <span className="font-bold text-amber-600">{stats.divisionBreakdown.NAIA}</span>
                  <span>NAIA</span>
                </div>
                <div className="flex flex-col items-center bg-purple-50 p-2 rounded">
                  <span className="font-bold text-purple-600">{stats.divisionBreakdown.NJCAA}</span>
                  <span>NJCAA</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Division Chart */}
      <Card className="md:col-span-2">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4">Division Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={divisionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                >
                  {divisionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} athletes`, "Count"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
