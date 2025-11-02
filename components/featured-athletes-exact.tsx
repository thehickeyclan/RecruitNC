"use client"

import { useState, useEffect } from "react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  graduationyear: number
  photourl: string
  weightclass: string
  wrestlingClub?: string
  achievements?: string[]
}

interface FeaturedAthletesExactProps {
  yearFilter: "All" | "2025" | "2026"
}

export function FeaturedAthletesExact({ yearFilter }: FeaturedAthletesExactProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedAthletes = async () => {
      try {
        setLoading(true)

        // Hardcoded featured athletes for exact matching
        let featuredAthletes: Athlete[] = []

        if (yearFilter === "2026") {
          // 2026 featured athletes
          featuredAthletes = [
            {
              id: "bentley-sly",
              name: "Bentley Sly",
              highschool: "Hough High School",
              college: "UNC Chapel Hill",
              division: "NCAA Division I",
              graduationyear: 2026,
              photourl: "/wrestler-silhouette.png",
              weightclass: "138 lbs",
              wrestlingClub: "Charlotte Wrestling Club",
              achievements: ["State Placer", "Regional Champion"],
            },
            {
              id: "lorenzo-alston",
              name: "Lorenzo Alston",
              highschool: "Laney High School",
              college: "Campbell University",
              division: "NCAA Division I",
              graduationyear: 2026,
              photourl: "/wrestler-lorenzo-alston.png",
              weightclass: "150 lbs",
              wrestlingClub: "Port City Wrestling",
              achievements: ["State Placer", "Regional Champion"],
            },
          ]
        } else {
          // 2025 or All featured athletes
          featuredAthletes = [
            {
              id: "anna-ockerman",
              name: "Anna Ockerman",
              highschool: "Jack Britt High School",
              college: "Queens University",
              division: "NCAA Division II",
              graduationyear: 2025,
              photourl: "/wrestler-silhouette.png",
              weightclass: "130 lbs",
              wrestlingClub: "Cape Fear Wrestling",
              achievements: ["State Champion", "2x Regional Champion"],
            },
            {
              id: "liam-hickey",
              name: "Liam Hickey",
              highschool: "Cardinal Gibbons",
              college: "NC State",
              division: "NCAA Division I",
              graduationyear: 2025,
              photourl: "/wrestler-liam-hickey.png",
              weightclass: "157 lbs",
              wrestlingClub: "Team Evolution",
              achievements: ["State Champion", "3x State Placer"],
            },
            {
              id: "colt-campbell",
              name: "Colt Campbell",
              highschool: "Cary High School",
              college: "Appalachian State",
              division: "NCAA Division I",
              graduationyear: 2025,
              photourl: "/wrestler-Colt-Campbell.png",
              weightclass: "165 lbs",
              wrestlingClub: "Cary Wrestling Club",
              achievements: ["State Runner-Up", "3x Regional Champion"],
            },
          ]
        }

        setAthletes(featuredAthletes)
      } catch (err) {
        console.error("Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedAthletes()
  }, [yearFilter])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-96 bg-gray-200 animate-pulse rounded-md"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {athletes.map((athlete) => (
        <ProfessionalCommitmentCard key={athlete.id} athlete={normalizeAthlete(athlete)} />
      ))}
    </div>
  )
}
