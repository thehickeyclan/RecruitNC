"use client"

import { CommitmentCardFixed } from "@/components/commitment-card-fixed"

const sampleAthlete = {
  id: "e5a3fb5b-d923-4764-a843-4a077850eaa6",
  name: "Bentley Sly",
  graduationyear: 2026,
  college: "Appalachian State",
  division: "NCAA Division I",
  weightclass: 149,
  highschool: "Stuart Cramer",
  wrestlingClub: "Darkhorse",
  photourl: "/wrestler-bentley-sly.png"
}

export default function TestFixedProductionCards() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Fixed Production Cards Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CommitmentCardFixed athlete={sampleAthlete} />
        </div>
      </div>
    </div>
  )
}
