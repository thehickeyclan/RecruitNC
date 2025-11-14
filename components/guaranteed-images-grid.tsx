"use client"

import { UltraSimpleCard } from "./ultra-simple-card"

// Hardcoded data with absolute paths to images we know exist
const GUARANTEED_ATHLETES = [
  {
    id: "1",
    name: "Colt Campbell",
    highschool: "Cary High School",
    college: "Appalachian State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "165",
    photoUrl: "/wrestler-Colt-Campbell.png", // Absolute path to public folder
  },
  {
    id: "2",
    name: "Lorenzo Alston",
    highschool: "Jack Britt High School",
    college: "Campbell University",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "184",
    photoUrl: "/wrestler-lorenzo-alston.png", // Absolute path to public folder
  },
  {
    id: "3",
    name: "Liam Hickey",
    highschool: "Cardinal Gibbons",
    college: "NC State",
    division: "NCAA D1",
    graduationyear: 2025,
    weightclass: "157",
    photoUrl: "/wrestler-liam-hickey.png", // Absolute path to public folder
  },
  {
    id: "4",
    name: "Wrestler Silhouette",
    highschool: "North High School",
    college: "State University",
    division: "NCAA D2",
    graduationyear: 2026,
    weightclass: "174",
    photoUrl: "/wrestler-silhouette.png", // Absolute path to public folder
  },
  {
    id: "5",
    name: "Diverse Wrestlers",
    highschool: "South High School",
    college: "Tech College",
    division: "NAIA",
    graduationyear: 2025,
    weightclass: "149",
    photoUrl: "/diverse-wrestlers.png", // Absolute path to public folder
  },
  {
    id: "6",
    name: "Wrestler Profile",
    highschool: "East High School",
    college: "Community College",
    division: "NJCAA",
    graduationyear: 2026,
    weightclass: "197",
    photoUrl: "/wrestler-profile.png", // Absolute path to public folder
  },
]

export function GuaranteedImagesGrid() {
  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <p className="text-green-800">
          <strong>Guaranteed Images Grid</strong> - This shows hardcoded data with absolute paths to images
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GUARANTEED_ATHLETES.map((athlete) => (
          <UltraSimpleCard key={athlete.id} athlete={athlete} />
        ))}
      </div>
    </div>
  )
}
