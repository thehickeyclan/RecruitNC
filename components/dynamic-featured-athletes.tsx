"use client"

import { ProfessionalCommitmentCard } from "./professional-commitment-card"
import { useEffect, useState } from "react"
import type { Athlete } from "@/types/athlete"

type YearFilter = "All" | "2025" | "2026"

interface DynamicFeaturedAthletesProps {
  yearFilter: YearFilter
}

export function DynamicFeaturedAthletes({ yearFilter }: DynamicFeaturedAthletesProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        setIsLoading(true)

        if (yearFilter === "2026") {
          // Show Bentley Sly and Lorenzo Alston for 2026
          const fallback2026Athletes = [
            {
              id: "bentley-sly-fallback",
              name: "Bentley Sly",
              highschool: "Hough High School",
              college: "UNC Chapel Hill",
              division: "NCAA Division I",
              graduationyear: 2026,
              weightclass: "138",
              photoUrl: "/wrestler-silhouette.png",
              achievements: ["2024 State Placer", "Regional Champion"],
              wrestlingClub: "Charlotte Wrestling Club",
            },
            {
              id: "lorenzo-alston-fallback",
              name: "Lorenzo Alston",
              highschool: "Laney High School",
              college: "Campbell University",
              division: "NCAA Division I",
              graduationyear: 2026,
              weightclass: "150",
              photoUrl: "/wrestler-lorenzo-alston.png",
              achievements: ["2024 State Placer", "Regional Champion"],
              wrestlingClub: "Port City Wrestling",
            },
          ]
          setAthletes(fallback2026Athletes)
        } else {
          // Default athletes (All Years or 2025) - with Anna Ockerman instead of Xavier
          const response = await fetch("/api/featured-athletes-real")

          if (!response.ok) {
            throw new Error("Failed to fetch athletes")
          }

          const data = await response.json()
          let featuredAthletes = data.athletes || []

          // Default fallback athletes with Anna Ockerman
          const fallbackAthletes = [
            {
              id: "liam-hickey-fallback",
              name: "Liam Hickey",
              highschool: "Cardinal Gibbons",
              college: "NC State",
              division: "NCAA Division I",
              graduationyear: 2025,
              weightclass: "157",
              photoUrl: "/wrestler-liam-hickey.png",
              achievements: ["2023 State Champion", "3x State Placer"],
              wrestlingClub: "Team Evolution",
            },
            {
              id: "colt-campbell-fallback",
              name: "Colt Campbell",
              highschool: "Cary High School",
              college: "Appalachian State",
              division: "NCAA Division I",
              graduationyear: 2025,
              weightclass: "165",
              photoUrl: "/wrestler-Colt-Campbell.png",
              achievements: ["2023 State Runner-Up", "3x Regional Champion"],
              wrestlingClub: "Cary Wrestling Club",
            },
            {
              id: "anna-ockerman-fallback",
              name: "Anna Ockerman",
              highschool: "Jack Britt High School",
              college: "Queens University",
              division: "NCAA Division II",
              graduationyear: 2025,
              weightclass: "130",
              photoUrl: "/wrestler-silhouette.png",
              achievements: ["2023 State Champion", "2x Regional Champion"],
              wrestlingClub: "Cape Fear Wrestling",
              gender: "female",
            },
          ]

          // Use database athletes if available, otherwise use fallbacks
          if (featuredAthletes.length === 0) {
            featuredAthletes = fallbackAthletes
          } else {
            // Fill in missing athletes with fallbacks
            const athleteNames = featuredAthletes.map((a: Athlete) => a.name)
            fallbackAthletes.forEach((fallback) => {
              if (!athleteNames.includes(fallback.name)) {
                featuredAthletes.push(fallback)
              }
            })
          }

          // Limit to 3 athletes
          setAthletes(featuredAthletes.slice(0, 3))
        }

        setError(null)
      } catch (err) {
        console.error("Error fetching featured athletes:", err)
        setError(err instanceof Error ? err.message : "Unknown error")

        // Use fallback data on error based on year filter
        if (yearFilter === "2026") {
          setAthletes([
            {
              id: "bentley-sly-fallback",
              name: "Bentley Sly",
              highschool: "Hough High School",
              college: "UNC Chapel Hill",
              division: "NCAA Division I",
              graduationyear: 2026,
              weightclass: "138",
              photoUrl: "/wrestler-silhouette.png",
              achievements: ["2024 State Placer", "Regional Champion"],
              wrestlingClub: "Charlotte Wrestling Club",
            },
            {
              id: "lorenzo-alston-fallback",
              name: "Lorenzo Alston",
              highschool: "Laney High School",
              college: "Campbell University",
              division: "NCAA Division I",
              graduationyear: 2026,
              weightclass: "150",
              photoUrl: "/wrestler-lorenzo-alston.png",
              achievements: ["2024 State Placer", "Regional Champion"],
              wrestlingClub: "Port City Wrestling",
            },
          ])
        } else {
          setAthletes([
            {
              id: "liam-hickey-fallback",
              name: "Liam Hickey",
              highschool: "Cardinal Gibbons",
              college: "NC State",
              division: "NCAA Division I",
              graduationyear: 2025,
              weightclass: "157",
              photoUrl: "/wrestler-liam-hickey.png",
              achievements: ["2023 State Champion", "3x State Placer"],
              wrestlingClub: "Team Evolution",
            },
            {
              id: "colt-campbell-fallback",
              name: "Colt Campbell",
              highschool: "Cary High School",
              college: "Appalachian State",
              division: "NCAA Division I",
              graduationyear: 2025,
              weightclass: "165",
              photoUrl: "/wrestler-Colt-Campbell.png",
              achievements: ["2023 State Runner-Up", "3x Regional Champion"],
              wrestlingClub: "Cary Wrestling Club",
            },
            {
              id: "anna-ockerman-fallback",
              name: "Anna Ockerman",
              highschool: "Jack Britt High School",
              college: "Queens University",
              division: "NCAA Division II",
              graduationyear: 2025,
              weightclass: "130",
              photoUrl: "/wrestler-silhouette.png",
              achievements: ["2023 State Champion", "2x Regional Champion"],
              wrestlingClub: "Cape Fear Wrestling",
              gender: "female",
            },
          ])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchAthletes()
  }, [yearFilter])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[500px] animate-pulse rounded-lg bg-gray-200"></div>
        ))}
      </div>
    )
  }

  if (error) {
    console.error("Featured athletes error:", error)
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {athletes.map((athlete) => (
        <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
      ))}
    </div>
  )
}
