"use client"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface ProductionCommitmentCardProps {
  athlete: {
    id: string
    name: string
    graduation_year?: number
    graduationyear?: number
    weight_class?: string | number
    weightclass?: string | number
    college?: string
    high_school?: string
    highschool?: string
    wrestling_club?: string
    wrestlingclub?: string
    club?: string
    division?: string
    college_division?: string
    gender?: string
    image_url?: string
    photourl?: string
    photo_url?: string
    commitment_date?: string
    commitmentdate?: string
  }
}

interface LogoState {
  college?: string
  highschool?: string
  club?: string
}

export function ProductionCommitmentCard({ athlete }: ProductionCommitmentCardProps) {
  const candidate = athlete ?? athlete ?? athlete
  const normalizedAthlete = normalizeAthlete(candidate)
  return <ProfessionalCommitmentCard athlete={normalizedAthlete} />
}

export default ProductionCommitmentCard
