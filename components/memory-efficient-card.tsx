"use client"

import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface MemoryEfficientCardProps {
  athlete: {
    id: string
    name: string
    college: string
    division: string
    graduationyear: number
  }
}

// Memoized component to prevent unnecessary re-renders
export const MemoryEfficientCard = memo(function MemoryEfficientCard({ athlete }: MemoryEfficientCardProps) {
  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardContent className="p-6">
        {/* Simple layout - no complex styling */}
        <div className="text-center space-y-4">
          {/* Placeholder instead of image */}
          <div className="w-20 h-20 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-600">{athlete.name.charAt(0)}</span>
          </div>

          {/* Athlete info */}
          <div>
            <h3 className="text-xl font-bold text-gray-900">{athlete.name}</h3>
            <p className="text-sm text-gray-600">Class of {athlete.graduationyear}</p>
          </div>

          {/* College commitment */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">COMMITTED TO</p>
            <p className="font-bold text-blue-900">{athlete.college}</p>
            <p className="text-xs text-blue-700">{athlete.division}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
