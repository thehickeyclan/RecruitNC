"use client"

import { CommitmentCardRebuilt } from "./commitment-card-rebuilt"

interface Athlete {
  id: string
  name: string
  graduation_year: number
  college: string
  division: string
  weight_class: number
  high_school: string
  club: string
  image_url?: string
  instagram?: string
}

interface AthletesGridRebuiltProps {
  athletes: Athlete[]
  className?: string
}

export function AthletesGridRebuilt({ athletes, className = "" }: AthletesGridRebuiltProps) {
  // Ensure athletes is an array
  const athletesArray = Array.isArray(athletes) ? athletes : []

  if (athletesArray.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No athletes found</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 ${className}`}>
      {athletesArray.map((athlete) => (
        <CommitmentCardRebuilt key={athlete.id} athlete={athlete} showFlip={true} className="w-full" />
      ))}
    </div>
  )
}
