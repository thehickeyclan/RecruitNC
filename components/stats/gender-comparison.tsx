"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

// Fallback data
const data = [
  { year: "2020", men: 38, women: 4 },
  { year: "2021", men: 49, women: 9 },
  { year: "2022", men: 62, women: 13 },
  { year: "2023", men: 71, women: 18 },
  { year: "2024", men: 82, women: 23 },
  { year: "2025", men: 94, women: 30 },
]

export function GenderComparison() {
  return (
    <div className="h-[300px] w-full">
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
            formatter={(value) => [`${value} athletes`, ""]}
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
          <Bar dataKey="men" fill="#1E3A8A" name="Men" />
          <Bar dataKey="women" fill="#DC2626" name="Women" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
