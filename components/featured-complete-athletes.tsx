"use client"

import { CompleteCommitmentCard } from "./complete-commitment-card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Featured athletes for the home page
const FEATURED_COMPLETE_ATHLETES = [
  {
    id: "featured-1",
    name: "Colt Campbell",
    highschool: "Cary High School",
    club: "Wolfpack Wrestling Club",
    college: "Appalachian State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "165",
    photoUrl: "/wrestler-Colt-Campbell.png",
    achievements: ["State Runner-Up", "Regional Champion"],
  },
  {
    id: "featured-2",
    name: "Lorenzo Alston",
    highschool: "Jack Britt High School",
    club: "Sandhills Wrestling Academy",
    college: "Campbell University",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "184",
    photoUrl: "/wrestler-lorenzo-alston.png",
    achievements: ["State Placer", "Regional Champion"],
  },
  {
    id: "featured-3",
    name: "Liam Hickey",
    highschool: "Cardinal Gibbons",
    club: "Team Tar Heel",
    college: "NC State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "157",
    photoUrl: "/wrestler-liam-hickey.png",
    achievements: ["State Champion", "All-American"],
  },
  {
    id: "featured-4",
    name: "Bentley Sly",
    highschool: "Hough High School",
    club: "Charlotte Wrestling Academy",
    college: "UNC Chapel Hill",
    division: "NCAA D1",
    graduationyear: 2026,
    weightclass: "174",
    photoUrl: "/wrestler-silhouette.png",
    achievements: ["State Qualifier", "Conference Champion"],
  },
]

export function FeaturedCompleteAthletes() {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Featured Commitments</h2>
        <Link href="/athletes">
          <Button variant="outline" size="sm">
            View All Athletes
          </Button>
        </Link>
      </div>

      <div className="mb-4 rounded-lg bg-green-50 p-4">
        <p className="text-green-800">
          <strong>Complete Commitment Cards</strong> - With flip functionality, NC United logo, and all athlete details
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED_COMPLETE_ATHLETES.map((athlete) => (
          <CompleteCommitmentCard key={athlete.id} athlete={athlete} />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Link href="/athletes">
          <Button>View All Commitments</Button>
        </Link>
      </div>
    </section>
  )
}
