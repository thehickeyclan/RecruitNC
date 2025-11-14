"use client"

import { memo, useMemo } from "react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  graduationyear: number
  photourl: string
  weightclass: string
  gender: string
}

interface OptimizedCommitmentGridProps {
  athletes: Athlete[]
  loading?: boolean
  onAthleteClick?: (athlete: Athlete) => void
}

// Memoized individual card component
const MemoizedCommitmentCard = memo(function MemoizedCommitmentCard({
  athlete,
  onClick,
}: {
  athlete: Athlete
  onClick?: (athlete: Athlete) => void
}) {
  return (
    <div className="cursor-pointer transform transition-transform hover:scale-105" onClick={() => onClick?.(athlete)}>
      <ProfessionalCommitmentCard athlete={normalizeAthlete(athlete)} />
    </div>
  )
})

export const OptimizedCommitmentGrid = memo(function OptimizedCommitmentGrid({
  athletes,
  loading = false,
  onAthleteClick,
}: OptimizedCommitmentGridProps) {
  const memoizedAthletes = useMemo(() => athletes, [athletes])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-96"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {memoizedAthletes.map((athlete) => (
        <MemoizedCommitmentCard key={athlete.id} athlete={athlete} onClick={onAthleteClick} />
      ))}
    </div>
  )
})
