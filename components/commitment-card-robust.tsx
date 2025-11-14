"use client"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface Athlete {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  graduation_year?: number
  weight_class?: string
  college?: string
  high_school?: string
  club?: string
  division?: string
  gender?: string
  achievements?: string | string[]
  image_url?: string
  likes_count?: number
  is_liked?: boolean
  match_record?: {
    wins?: number
    losses?: number
    total_matches?: number
  }
}

interface CommitmentCardRobustProps {
  athlete: Athlete
  onLike?: (athleteId: string) => void
}

export function CommitmentCardRobust({ athlete, onLike }: CommitmentCardRobustProps) {
  const candidate = athlete ?? athlete
  const normalizedAthlete = normalizeAthlete(candidate)
  return <ProfessionalCommitmentCard athlete={normalizedAthlete} />
}

export default CommitmentCardRobust
