"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { supabase } from "@/lib/supabase"

export function GenderDistribution() {
  const [data, setData] = useState([
    { name: "Men", value: 0, color: "#1E3A8A" },
    { name: "Women", value: 0, color: "#DC2626" },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Get men count
        const { count: menCount, error: menError } = await supabase
          .from("athletes")
          .select("*", { count: "exact", head: true })
          .eq("gender", "male")

        // Get women count
        const { count: womenCount, error: womenError } = await supabase
          .from("athletes")
          .select("*", { count: "exact", head: true })
          .eq("gender", "female")

        if (menError || womenError) {
          console.error("Error fetching gender data:", menError || womenError)
          return
        }

        setData([
          { name: "Men", value: menCount || 0, color: "#1E3A8A" },
          { name: "Women", value: womenCount || 0, color: "#DC2626" },
        ])
      } catch (error) {
        console.error("Error in gender distribution:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="flex h-[300px] items-center justify-center">Loading gender data...</div>
  }

  // If no data or all zeros, show a message
  if (data.every((item) => item.value === 0)) {
    return <div className="flex h-[300px] items-center justify-center">No gender data available</div>
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value} athletes`, "Count"]}
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
