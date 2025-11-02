"use client"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface WorkingCommitmentCardProps {
  athlete: {
    id: string
    name: string
    graduation_year?: number
    graduationyear?: number
    weight_class?: string
    weightclass?: string
    college?: string
    high_school?: string
    highschool?: string
    wrestling_club?: string
    wrestlingclub?: string
    club?: string
    college_division?: string
    division?: string
    gender?: string
    image_url?: string
    photourl?: string
    commitment_date?: string
  }
  className?: string
}

export function WorkingCommitmentCard({ athlete, className = "" }: WorkingCommitmentCardProps) {
  const candidate = athlete ?? athlete ?? athlete
  const normalizedAthlete = normalizeAthlete(candidate)
  return <ProfessionalCommitmentCard athlete={normalizedAthlete} className={className} />
}

export default WorkingCommitmentCard
