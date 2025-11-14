"use client"

import { CompleteCommitmentCard } from "./complete-commitment-card"

// Comprehensive athlete data with all requested fields
const COMPLETE_ATHLETES = [
  {
    id: "1",
    name: "Colt Campbell",
    highschool: "Cary High School",
    club: "Wolfpack Wrestling Club",
    college: "Appalachian State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "165",
    photoUrl: "/wrestler-Colt-Campbell.png",
    achievements: ["State Runner-Up", "Regional Champion", "Conference Champion"],
  },
  {
    id: "2",
    name: "Lorenzo Alston",
    highschool: "Jack Britt High School",
    club: "Sandhills Wrestling Academy",
    college: "Campbell University",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "184",
    photoUrl: "/wrestler-lorenzo-alston.png",
    achievements: ["State Placer", "Regional Champion", "All-American"],
  },
  {
    id: "3",
    name: "Liam Hickey",
    highschool: "Cardinal Gibbons",
    club: "Team Tar Heel",
    college: "NC State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "157",
    photoUrl: "/wrestler-liam-hickey.png",
    achievements: ["State Champion", "All-American", "Super 32 Placer"],
  },
  {
    id: "4",
    name: "Bentley Sly",
    highschool: "Hough High School",
    club: "Charlotte Wrestling Academy",
    college: "UNC Chapel Hill",
    division: "NCAA D1",
    graduationyear: 2026,
    weightclass: "174",
    photoUrl: "/wrestler-silhouette.png",
    achievements: ["State Qualifier", "Conference Champion", "Regional Finalist"],
  },
  {
    id: "5",
    name: "Jackson Smith",
    highschool: "Laney High School",
    club: "Port City Wrestling",
    college: "Queens University",
    division: "NCAA D2",
    graduationyear: 2025,
    weightclass: "149",
    photoUrl: "/diverse-wrestlers.png",
    achievements: ["State Placer", "Regional Finalist", "Team Captain"],
  },
  {
    id: "6",
    name: "Mason Johnson",
    highschool: "Greensboro High",
    club: "Triad Wrestling Club",
    college: "Belmont Abbey",
    division: "NCAA D2",
    graduationyear: 2026,
    weightclass: "197",
    photoUrl: "/wrestler-profile.png",
    achievements: ["Conference Champion", "Regional Qualifier", "Team MVP"],
  },
]

export function CompleteCommitmentsGrid() {
  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <p className="text-green-800">
          <strong>Complete Commitment Cards</strong> - With flip functionality, NC United logo, and all athlete details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COMPLETE_ATHLETES.map((athlete) => (
          <CompleteCommitmentCard key={athlete.id} athlete={athlete} />
        ))}
      </div>
    </div>
  )
}
