"use client"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface FixedCommitmentCardProps {
  athlete: {
    id: string
    name: string
    graduationyear: number
    college: string
    division: string
    weightclass: number
    highschool: string
    wrestlingClub?: string
    photourl?: string
    achievements?: string[]
  }
}

export function FixedCommitmentCard({ athlete }: FixedCommitmentCardProps) {
  const candidate = athlete ?? athlete ?? athlete
  const normalizedAthlete = normalizeAthlete(candidate)
  return <ProfessionalCommitmentCard athlete={normalizedAthlete} />
}

export default FixedCommitmentCard
