"use client"

import { ProfessionalCommitmentCard } from "./professional-commitment-card"

const testAthlete = {
  id: "debug-test",
  name: "Debug Test",
  graduationyear: 2025,
  highschool: "Test High School",
  club: "Test Wrestling Club",
  college: "Test University",
  division: "NCAA D1",
  weightclass: "165",
  city: "Test City",
  photoUrl: "/wrestler-silhouette.png",
  achievements: ["Test Achievement 1", "Test Achievement 2", "Test Achievement 3"],
  commitmentdate: "2024-01-01",
}

export function DebugCardTest() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Debug Card Test - Should have scrolling and flip buttons</h2>
      <div className="max-w-md">
        <ProfessionalCommitmentCard athlete={testAthlete} />
      </div>
    </div>
  )
}
