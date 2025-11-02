import type React from "react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  graduationyear: number
  weightclass: string
  photoUrl: string
  achievements: string[]
  wrestlingClub: string
  gender: string
}

const fallbackAthletes: Athlete[] = [
  {
    id: "liam-hickey-fallback",
    name: "Liam Hickey",
    highschool: "Cardinal Gibbons",
    college: "NC State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "157",
    photoUrl: "/wrestler-liam-hickey.png",
    achievements: ["2023 State Champion", "3x State Placer"],
    wrestlingClub: "Team Evolution",
    gender: "male",
  },
  {
    id: "colt-campbell-fallback",
    name: "Colt Campbell",
    highschool: "Cary High School",
    college: "Appalachian State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "165",
    photoUrl: "/wrestler-Colt-Campbell.png",
    achievements: ["2023 State Runner-Up", "3x Regional Champion"],
    wrestlingClub: "Cary Wrestling Club",
    gender: "male",
  },
  {
    id: "anna-ockerman-fallback",
    name: "Anna Ockerman",
    highschool: "Jack Britt High School",
    college: "Queens University",
    division: "NCAA D2",
    graduationyear: 2025,
    weightclass: "130",
    photoUrl: "/wrestler-silhouette.png",
    achievements: ["2023 State Champion", "2x Regional Champion"],
    wrestlingClub: "Cape Fear Wrestling",
    gender: "female",
  },
]

interface FeaturedThreeAthletesProps {
  athletes?: Athlete[]
}

export const FeaturedThreeAthletes: React.FC<FeaturedThreeAthletesProps> = ({ athletes }) => {
  const athletesToDisplay = athletes && athletes.length >= 3 ? athletes.slice(0, 3) : fallbackAthletes

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {athletesToDisplay.map((athlete) => (
        <ProfessionalCommitmentCard key={athlete.id} athlete={normalizeAthlete(athlete)} />
      ))}
    </div>
  )
}
