"use client"

import { SimpleWorkingCard } from "./simple-working-card"

// Hardcoded data that definitely works
const WORKING_ATHLETES = [
  {
    id: "1",
    name: "Colt Campbell",
    highschool: "Cary High School",
    college: "Appalachian State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "165",
    photoUrl: "/wrestler-Colt-Campbell.png",
    achievements: ["State Runner-Up", "Regional Champion"],
  },
  {
    id: "2",
    name: "Lorenzo Alston",
    highschool: "Jack Britt High School",
    college: "Campbell University",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "184",
    photoUrl: "/wrestler-lorenzo-alston.png",
    achievements: ["State Placer", "Regional Champion"],
  },
  {
    id: "3",
    name: "Liam Hickey",
    highschool: "Cardinal Gibbons",
    college: "NC State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "157",
    photoUrl: "/wrestler-liam-hickey.png",
    achievements: ["State Champion", "All-American"],
  },
  {
    id: "4",
    name: "Sample Wrestler 1",
    highschool: "North High School",
    college: "State University",
    division: "NCAA D2",
    graduationyear: 2026,
    weightclass: "174",
    photoUrl: "/wrestler-silhouette.png",
    achievements: ["Conference Champion", "State Qualifier"],
  },
  {
    id: "5",
    name: "Sample Wrestler 2",
    highschool: "South High School",
    college: "Tech College",
    division: "NAIA",
    graduationyear: 2025,
    weightclass: "149",
    photoUrl: "/wrestler-silhouette.png",
    achievements: ["Regional Qualifier", "District Champion"],
  },
  {
    id: "6",
    name: "Sample Wrestler 3",
    highschool: "East High School",
    college: "Community College",
    division: "NJCAA",
    graduationyear: 2026,
    weightclass: "197",
    photoUrl: "/wrestler-silhouette.png",
    achievements: ["State Qualifier", "Conference Runner-Up"],
  },
]

export function WorkingAthletesGrid() {
  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800">
          <strong>Working Athletes Grid</strong> - This shows hardcoded data with working flip cards
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {WORKING_ATHLETES.map((athlete) => (
          <SimpleWorkingCard key={athlete.id} athlete={athlete} />
        ))}
      </div>
    </div>
  )
}
