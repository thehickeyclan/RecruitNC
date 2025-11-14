"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// Fallback data
const data = [
  { year: "2020", count: 42 },
  { year: "2021", count: 58 },
  { year: "2022", count: 75 },
  { year: "2023", count: 89 },
  { year: "2024", count: 105 },
  { year: "2025", count: 124 },
]

export function CommitmentsOverTime() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip
            formatter={(value) => [`${value} athletes`, "Commitments"]}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D1D5DB",
              borderRadius: "4px",
              padding: "4px",
              fontSize: "12px",
              color: "#374151",
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#1E3A8A"
            strokeWidth={2}
            dot={{
              fill: "#4B5EAA",
              stroke: "#1E3A8A",
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              fill: "#1E3A8A",
              stroke: "#FFFFFF",
              strokeWidth: 2,
              r: 6,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
