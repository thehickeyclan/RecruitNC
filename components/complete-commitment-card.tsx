"use client"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface CompleteCommitmentCardProps {
  athlete: {
    id: string | number
    name: string
    highschool?: string
    club?: string
    college?: string
    division?: string
    graduationyear?: number
    weightclass?: string
    photoUrl?: string
    achievements?: string[]
  }
}

export function CompleteCommitmentCard({ athlete }: CompleteCommitmentCardProps) {
  const candidate = athlete ?? athlete ?? athlete
  const normalizedAthlete = normalizeAthlete(candidate)
  return <ProfessionalCommitmentCard athlete={normalizedAthlete} />
}

export default CompleteCommitmentCard
