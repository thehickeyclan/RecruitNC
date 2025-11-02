"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FlipVerticalIcon as Flip } from "lucide-react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"
import type { Athlete } from "@/types/athlete"

export function FeaturedAthletesFromAthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFeaturedAthletes() {
      try {
        setLoading(true)
        // Fetch featured athletes from our API
        const response = await fetch("/api/athletes?featured=true", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch featured athletes: ${response.status}`)
        }

        const data = await response.json()

        // Log the data to help with debugging
        console.log("Featured athletes data:", data)

        if (Array.isArray(data) && data.length > 0) {
          setAthletes(data)
        } else {
          // If no athletes found, use hardcoded data
          setAthletes(getFallbackAthletes())
        }
      } catch (err) {
        console.error("Error fetching featured athletes:", err)
        setError("Failed to load featured athletes")
        // Use fallback data on error
        setAthletes(getFallbackAthletes())
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedAthletes()
  }, [])

  // Fallback data in case the API fails
  function getFallbackAthletes(): Athlete[] {
    return [
      {
        id: 1,
        name: "Liam Hickey",
        highSchool: "Cardinal Gibbons",
        graduationYear: 2025,
        college: "NC State",
        division: "NCAA D1",
        weightClass: "157",
        achievements: ["State Champion", "All-American"],
        image: "/wrestler-silhouette.png",
        collegeImage: "/generic-college-logo.png",
        highSchoolImage: "/generic-high-school-logo.png",
        clubImage: "/wrestling-club-logo.png",
        club: "Team Evolution",
      },
      {
        id: 2,
        name: "Colt Campbell",
        highSchool: "Cary High School",
        graduationYear: 2025,
        college: "Appalachian State",
        division: "NCAA D1",
        weightClass: "165",
        achievements: ["State Runner-Up", "Regional Champion"],
        image: "/wrestler-silhouette.png",
        collegeImage: "/generic-college-logo.png",
        highSchoolImage: "/generic-high-school-logo.png",
        clubImage: "/wrestling-club-logo.png",
        club: "Cary Wrestling Club",
      },
      {
        id: 3,
        name: "Bentley Sly",
        highSchool: "Hough High School",
        graduationYear: 2026,
        college: "Appalachian State",
        division: "NCAA D1",
        weightClass: "174",
        achievements: ["State Qualifier", "Conference Champion"],
        image: "/wrestler-silhouette.png",
        collegeImage: "/generic-college-logo.png",
        highSchoolImage: "/generic-high-school-logo.png",
        clubImage: "/wrestling-club-logo.png",
        club: "Charlotte Wrestling Academy",
      },
      {
        id: 4,
        name: "Lorenzo Alston",
        highSchool: "Jack Britt High School",
        graduationYear: 2025,
        college: "Campbell University",
        division: "NCAA D1",
        weightClass: "184",
        achievements: ["State Placer", "Regional Champion"],
        image: "/wrestler-silhouette.png",
        collegeImage: "/generic-college-logo.png",
        highSchoolImage: "/generic-high-school-logo.png",
        clubImage: "/wrestling-club-logo.png",
        club: "Sandhills Wrestling Club",
      },
    ]
  }

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Featured Commitments</h2>
        <Link href="/auth/signin">
          <Button variant="outline" size="sm">
            Sign In to View All
          </Button>
        </Link>
      </div>

      {/* Interactive Cards Message */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#c8102e] bg-[#c8102e] p-4 shadow-sm">
        <Flip className="h-5 w-5 flex-shrink-0 text-white" />
        <p className="text-sm text-white">
          <span className="font-semibold">Pro Tip:</span> Cards are interactive! Click the flip icon
          <span className="mx-1 inline-block rounded-full bg-white p-1 text-[#c8102e]">
            <Flip className="h-3 w-3" />
          </span>
          in the bottom right corner to see more details about each athlete.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-[450px] animate-pulse bg-gray-200"></Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-red-500">{error}</p>
          <p>Showing fallback data instead.</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {athletes.map((athlete) => (
              <ProfessionalCommitmentCard key={athlete.id} athlete={normalizeAthlete(athlete)} />
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {athletes.map((athlete) => (
            <ProfessionalCommitmentCard key={athlete.id} athlete={normalizeAthlete(athlete)} />
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <Link href="/auth/signin">
          <Button>Sign In to View All Commitments</Button>
        </Link>
      </div>
    </section>
  )
}
