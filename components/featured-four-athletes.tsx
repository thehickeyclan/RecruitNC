"use client"

import { ProfessionalCommitmentCard } from "./professional-commitment-card"
import { useEffect, useState } from "react"

// Featured athletes data
const FEATURED_ATHLETES = [
  {
    id: "liam-hickey",
    name: "Liam Hickey",
    highschool: "Cardinal Gibbons",
    highschool_logo: "/cardinal-gibbons-crest.png",
    college: "NC State",
    college_logo: "/wolfpack-logo.png",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "157",
    photoUrl: "/wrestler-liam-hickey.png",
    achievements: ["2023 State Champion", "3x State Placer", "NHSCA All-American"],
    club: "Team Evolution",
    club_logo: "/wrestling-club-logo.png",
    instagram: "liamhickey_",
  },
  {
    id: "colt-campbell",
    name: "Colt Campbell",
    highschool: "Cary High School",
    highschool_logo: "/cary-high-school-spirit.png",
    college: "Appalachian State",
    college_logo: "/appalachian-state-mountains.png",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "165",
    photoUrl: "/wrestler-Colt-Campbell.png",
    achievements: ["2023 State Runner-Up", "3x Regional Champion", "Super 32 Placer"],
    club: "Cary Wrestling Club",
    club_logo: "/wrestling-club-logo.png",
    instagram: "colt_campbell",
  },
  {
    id: "bentley-sly",
    name: "Bentley Sly",
    highschool: "Hough High School",
    highschool_logo: "/hough-high-school-logo.png",
    college: "UNC Chapel Hill",
    college_logo: "/UNC_Chapel_Hill_Logo.png",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "149",
    photoUrl: "/wrestler-profile.png",
    achievements: ["2023 State Champion", "2x Regional Champion", "Fargo All-American"],
    club: "Darkhorse Wrestling",
    club_logo: "/wrestling-club-logo.png",
    instagram: "bentley_sly",
  },
  {
    id: "lorenzo-alston",
    name: "Lorenzo Alston",
    highschool: "Jack Britt High School",
    highschool_logo: "/jack-britt-high-school-logo.png",
    college: "Campbell University",
    college_logo: "/campbell-university-seal.png",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "184",
    photoUrl: "/wrestler-lorenzo-alston.png",
    achievements: ["2023 State Champion", "3x State Placer", "Fargo All-American"],
    club: "RAW",
    club_logo: "/wrestling-club-logo.png",
    instagram: "lorenzo_alston",
    isNCUnitedBlue: true,
  },
]

export function FeaturedFourAthletes() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-96 animate-pulse rounded-lg bg-gray-200"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURED_ATHLETES.map((athlete) => (
        <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
      ))}
    </div>
  )
}
