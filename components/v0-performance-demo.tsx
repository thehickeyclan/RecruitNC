"use client"

import { useState } from "react"
import { MemoryEfficientCard } from "./memory-efficient-card"

// Minimal sample data for V0 preview
const DEMO_ATHLETES = [
  {
    id: "1",
    name: "Liam Hickey",
    college: "NC State",
    division: "NCAA D1",
    graduationyear: 2025,
  },
  {
    id: "2",
    name: "Colt Campbell",
    college: "Appalachian State",
    division: "NCAA D1",
    graduationyear: 2025,
  },
  {
    id: "3",
    name: "Lorenzo Alston",
    college: "Campbell University",
    division: "NCAA D1",
    graduationyear: 2025,
  },
]

export function V0PerformanceDemo() {
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">NC Wrestling Portal</h1>
        <p className="text-gray-600">Optimized for V0 Preview Performance</p>
      </div>

      {/* Performance Stats */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-800 mb-2">Performance Optimizations:</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✅ No external API calls</li>
          <li>✅ No image loading</li>
          <li>✅ Memoized components</li>
          <li>✅ Minimal DOM elements</li>
          <li>✅ Reduced memory footprint</li>
        </ul>
      </div>

      {/* Simple grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DEMO_ATHLETES.map((athlete) => (
          <div
            key={athlete.id}
            onClick={() => setSelectedAthlete(selectedAthlete === athlete.id ? null : athlete.id)}
            className="cursor-pointer transform transition-transform hover:scale-105"
          >
            <MemoryEfficientCard athlete={athlete} />
          </div>
        ))}
      </div>

      {/* Selected athlete details */}
      {selectedAthlete && (
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2">Selected Athlete</h3>
          <p className="text-blue-700">
            {DEMO_ATHLETES.find((a) => a.id === selectedAthlete)?.name} - Click another card to change selection
          </p>
        </div>
      )}
    </div>
  )
}
