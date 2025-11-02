"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { mockAthletes } from "@/lib/mock-data"

export function WeightClassDistribution() {
  // Count athletes by weight class
  const weightClassCounts = mockAthletes.reduce(
    (acc, athlete) => {
      acc[athlete.weightClass] = (acc[athlete.weightClass] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Convert to array for chart
  const data = Object.entries(weightClassCounts)
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => {
      // Extract numeric part of weight class for sorting
      const aWeight = Number.parseInt(a.name.replace(/[^0-9]/g, ""))
      const bWeight = Number.parseInt(b.name.replace(/[^0-9]/g, ""))
      return aWeight - bWeight
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weight Class Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
