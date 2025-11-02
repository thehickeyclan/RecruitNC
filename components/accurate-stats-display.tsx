"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Calendar, Award } from "lucide-react"
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

export function AccurateStatsDisplay() {
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        // Get all athletes with college commitments
        const { data: athletes, error: athletesError } = await supabase
          .from("athletes")
          .select("id, name, college, division, graduationyear")
          .not("college", "is", null)

        if (athletesError) {
          throw new Error("Failed to fetch athletes")
        }

        // Get the total count of athletes with commitments
        const totalCommitments = athletes.length

        // Initialize stats object
        const newStats = {
          totalCommitments,
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

        // Count athletes by graduation year
        athletes.forEach((athlete) => {
          if (athlete.graduationyear === 2025) {
            newStats.classOf2025++
          } else if (athlete.graduationyear === 2026) {
            newStats.classOf2026++
          }
        })

        // Count athletes by division - EXACT MATCH with debug page
        athletes.forEach((athlete) => {
          const division = athlete.division || ""

          // Use exact matching to match the debug page
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
        setError("Failed to load stats")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="text-center py-4">Loading stats...</div>
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>
  }

  const statsItems = [
    {
      title: "Total Commitments",
      value: stats.totalCommitments,
      icon: Trophy,
      description: "NC wrestlers committed to colleges",
      color: "bg-[#0a1e50] text-white", // Blue
      breakdown: [
        { label: "Class of 2025", value: stats.classOf2025 },
        { label: "Class of 2026", value: stats.classOf2026 },
      ],
    },
    {
      title: "Class of 2025",
      value: stats.classOf2025,
      icon: Calendar,
      description: "Current year commitments",
      color: "bg-[#c8102e] text-white", // Red
    },
    {
      title: "Class of 2026",
      value: stats.classOf2026,
      icon: Calendar,
      description: "Next year commitments",
      color: "bg-[#0a1e50] text-white", // Blue
    },
    {
      title: "Division Breakdown",
      icon: Award,
      color: "bg-[#c8102e] text-white", // Red
      isDivisionBreakdown: true,
      divisions: [
        { name: "D1", value: stats.divisionBreakdown.D1 },
        { name: "D2", value: stats.divisionBreakdown.D2 },
        { name: "D3", value: stats.divisionBreakdown.D3 },
        { name: "NAIA", value: stats.divisionBreakdown.NAIA },
        { name: "NJCAA", value: stats.divisionBreakdown.NJCAA },
      ],
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsItems.map((stat, index) => (
        <Card key={index} className={`border-0 ${stat.color}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 opacity-75" />
          </CardHeader>
          <CardContent>
            {stat.isDivisionBreakdown ? (
              <div className="flex flex-wrap gap-2">
                {stat.divisions.map((div, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="text-lg font-bold">{div.value}</div>
                    <p className="text-xs opacity-75">{div.name}</p>
                  </div>
                ))}
              </div>
            ) : stat.breakdown ? (
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-lg font-bold">{stat.breakdown[0].value}</div>
                  <p className="text-xs opacity-75">{stat.breakdown[0].label}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs opacity-75">{stat.description}</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{stat.breakdown[1].value}</div>
                  <p className="text-xs opacity-75">{stat.breakdown[1].label}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs opacity-75">{stat.description}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
