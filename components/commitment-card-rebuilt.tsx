"use client"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface Athlete {
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

interface CommitmentCardRebuiltProps {
  athlete: Athlete
}

export function CommitmentCardRebuilt(props: any) {
  const candidate = props?.athlete ?? props?.data ?? props
  const athlete = normalizeAthlete(candidate)
  return <ProfessionalCommitmentCard athlete={athlete} />
}

export default CommitmentCardRebuilt
