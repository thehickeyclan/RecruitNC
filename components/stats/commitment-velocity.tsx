"use client"

import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts"

// Fallback data
const data = [
  { month: "Jan", count: 4, trend: 4 },
  { month: "Feb", count: 6, trend: 5 },
  { month: "Mar", count: 8, trend: 6 },
  { month: "Apr", count: 5, trend: 7 },
  { month: "May", count: 9, trend: 8 },
  { month: "Jun", count: 12, trend: 9 },
  { month: "Jul", count: 7, trend: 10 },
  { month: "Aug", count: 11, trend: 11 },
  { month: "Sep", count: 14, trend: 12 },
  { month: "Oct", count: 10, trend: 13 },
  { month: "Nov", count: 16, trend: 14 },
  { month: "Dec", count: 8, trend: 15 },
]

export function CommitmentVelocity() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            formatter={(value, name) => [
              `${value} ${name === "count" ? "commits" : ""}`,
              name === "count" ? "Monthly Commits" : "Trend",
            ]}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D1D5DB",
              borderRadius: "4px",
              padding: "4px",
              fontSize: "12px",
              color: "#374151",
            }}
          />
          <Bar dataKey="count" fill="#4B5EAA" name="count" />
          <Line type="monotone" dataKey="trend" stroke="#1E3A8A" strokeWidth={2} dot={false} name="trend" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
