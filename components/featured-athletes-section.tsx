import { ProfessionalCommitmentCard } from "./professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface Athlete {
  id: string
  name: string
  graduation_year: number
  weight_class: string
  high_school: string
  college: string
  image_url?: string
  achievements?: any
}

interface FeaturedAthletesSectionProps {
  athletes: Athlete[]
}

export function FeaturedAthletesSection({ athletes }: FeaturedAthletesSectionProps) {
  if (!athletes || athletes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No featured athletes available at this time.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {athletes.map((athlete) => (
        <ProfessionalCommitmentCard key={athlete.id} athlete={normalizeAthlete(athlete)} />
      ))}
    </div>
  )
}
