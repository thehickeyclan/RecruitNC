"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DivisionData = {
  // Canonical keys
  DI?: number
  DII?: number
  DIII?: number
  NAIA: number
  NJCAA: number
  Independent?: number
  // Legacy keys (fallback)
  D1?: number
  D2?: number
  D3?: number
}

interface DivisionBreakdownProps {
  data: DivisionData
}

const COLORS = {
  DI: "#1f2937", // slate-800
  DII: "#3b82f6", // blue-500
  DIII: "#6366f1", // indigo-500
  NAIA: "#f59e0b", // amber-500
  NJCAA: "#ef4444", // red-500
  Independent: "#10b981", // emerald-500
}

// Prefer canonical DI/DII/DIII; fall back to legacy D1/D2/D3 if missing
function pick(value?: number, fallback?: number) {
  return typeof value === "number" ? value : (fallback ?? 0)
}

export function DivisionBreakdown({ data }: DivisionBreakdownProps) {
  const di = pick(data.DI, data.D1)
  const dii = pick(data.DII, data.D2)
  const diii = pick(data.DIII, data.D3)
  const naia = data.NAIA ?? 0
  const njcaa = data.NJCAA ?? 0
  const independent = data.Independent ?? 0

  const chartData = [
    { name: "DI", value: di, color: COLORS.DI },
    { name: "DII", value: dii, color: COLORS.DII },
    { name: "DIII", value: diii, color: COLORS.DIII },
    { name: "NAIA", value: naia, color: COLORS.NAIA },
    { name: "NJCAA", value: njcaa, color: COLORS.NJCAA },
    { name: "Independent", value: independent, color: COLORS.Independent },
  ].filter((item) => item.value > 0)

  const total = di + dii + diii + naia + njcaa + independent

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Division Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">No division data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Division Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
              <span className="font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
