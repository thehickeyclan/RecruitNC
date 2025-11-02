"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface GenderData {
  male: number
  female: number
}

interface GenderBreakdownProps {
  data: GenderData
}

export function GenderBreakdown({ data }: GenderBreakdownProps) {
  const total = data.male + data.female

  const chartData = [
    {
      name: "Male",
      count: data.male,
      percentage: total > 0 ? ((data.male / total) * 100).toFixed(1) : 0,
    },
    {
      name: "Female",
      count: data.female,
      percentage: total > 0 ? ((data.female / total) * 100).toFixed(1) : 0,
    },
  ]

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gender Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">No gender data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gender Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [value, "Athletes"]}
                labelFormatter={(label) => `${label} Athletes`}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.male}</div>
            <div className="text-sm text-gray-600">Male Athletes</div>
            <div className="text-xs text-gray-500">{total > 0 ? ((data.male / total) * 100).toFixed(1) : 0}%</div>
          </div>
          <div className="text-center p-4 bg-pink-50 rounded-lg">
            <div className="text-2xl font-bold text-pink-600">{data.female}</div>
            <div className="text-sm text-gray-600">Female Athletes</div>
            <div className="text-xs text-gray-500">{total > 0 ? ((data.female / total) * 100).toFixed(1) : 0}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
