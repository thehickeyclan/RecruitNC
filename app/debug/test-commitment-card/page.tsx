"use client"

import { CommitmentCard } from "@/components/commitment-card"

export default function TestCommitmentCard() {
  const testAthlete = {
    id: "test-123",
    name: "Test Athlete",
    graduation_year: 2025,
    college: "NC State University",
    division: "NCAA D1",
    weight_class: 165,
    high_school: "Cardinal Gibbons High School",
    club: "NC United Wrestling",
    image_url: "/wrestler-silhouette.png",
    instagram: "@testathleteig",
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Test Commitment Card</h1>

      <div className="max-w-md mx-auto">
        <CommitmentCard athlete={testAthlete} showFlip={true} />
      </div>

      <div className="mt-8 bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-bold mb-2">Expected Results:</h2>
        <ul className="text-sm space-y-1">
          <li>✅ NC State logo should appear for college</li>
          <li>✅ Cardinal Gibbons logo should appear for high school</li>
          <li>✅ NC United logo should appear for club</li>
          <li>🔄 Card should flip on hover to show back with all logos</li>
        </ul>
      </div>
    </div>
  )
}
