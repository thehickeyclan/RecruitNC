import { ProfessionalCommitmentCard } from "./professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface CommitmentCardProps {
  athlete: any
  showFlip?: boolean
  [key: string]: any
}

export function CommitmentCard({ athlete, ...props }: CommitmentCardProps) {
  const normalizedAthlete = normalizeAthlete(athlete)
  return <ProfessionalCommitmentCard athlete={normalizedAthlete} {...props} />
}

export default CommitmentCard
