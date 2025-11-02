"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { supabase } from "@/lib/supabase"

export function YearlyCommitments() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Get commitments by graduation year
        const { data: yearData, error } = await supabase
          .from("athletes")
          .select("graduationyear, gender")
          .not("graduationyear", "is", null)
          .not("college", "is", null)
          .order("graduationyear")

        if (error) {
          console.error("Error fetching yearly commitments:", error)
          return
        }

        // Process data to count by year and gender
        const yearCounts: Record<string, { year: number; men: number; women: number; total: number }> = {}

        yearData.forEach((athlete) => {
          const year = athlete.graduationyear
          if (!year) return

          if (!yearCounts[year]) {
            yearCounts[year] = { year, men: 0, women: 0, total: 0 }
          }

          if (athlete.gender?.toLowerCase() === "male") {
            yearCounts[year].men++
          } else if (athlete.gender?.toLowerCase() === "female") {
            yearCounts[year].women++
          }

          yearCounts[year].total++
        })

        // Convert to array and sort by year
        const chartData = Object.values(yearCounts).sort((a, b) => a.year - b.year)

        setData(chartData)
      } catch (error) {
        console.error("Error in yearly commitments:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center">Loading yearly data...</div>
  }

  // If no data, show a message
  if (data.length === 0) {
    return <div className="flex h-[400px] items-center justify-center">No yearly commitment data available</div>
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip
            formatter={(value, name) => {
              if (name === "men") return [`${value} athletes`, "Men"]
              if (name === "women") return [`${value} athletes`, "Women"]
              return [`${value} athletes`, "Total"]
            }}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D1D5DB",
              borderRadius: "4px",
              padding: "4px",
              fontSize: "12px",
              color: "#374151",
            }}
          />
          <Legend />
          <Bar dataKey="men" name="Men" stackId="a" fill="#1E3A8A" />
          <Bar dataKey="women" name="Women" stackId="a" fill="#DC2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
