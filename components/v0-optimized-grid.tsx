"use client"

import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface OptimizedAthleteData {
  id: string
  name: string
  college: string
  division: string
  year: string
}

const OptimizedCard = memo(({ athlete }: { athlete: OptimizedAthleteData }) => (
  <Card className="w-full max-w-sm">
    <CardContent className="p-4">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
          {athlete.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{athlete.name}</h3>
          <p className="text-xs text-gray-600">{athlete.college}</p>
          <p className="text-xs text-blue-600">
            {athlete.division} • {athlete.year}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
))

OptimizedCard.displayName = "OptimizedCard"

export default function V0OptimizedGrid() {
  // Static data for V0 preview - no API calls
  const sampleAthletes: OptimizedAthleteData[] = [
    { id: "1", name: "John Smith", college: "NC State", division: "NCAA D1", year: "2024" },
    { id: "2", name: "Mike Johnson", college: "UNC", division: "NCAA D1", year: "2025" },
    { id: "3", name: "Chris Wilson", college: "App State", division: "NCAA D1", year: "2024" },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {sampleAthletes.map((athlete) => (
        <OptimizedCard key={athlete.id} athlete={athlete} />
      ))}
    </div>
  )
}
