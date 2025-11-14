"use client"
import { useState } from "react"
import { BulletproofFlipCard } from "@/components/bulletproof-flip-card"

export default function BulletproofTest() {
  const [testData] = useState([
    {
      id: "e5a3fb5b-d923-4764-a843-4a077850eaa6",
      name: "Bentley Sly",
      college: "Appalachian State",
      highSchool: "Stuart Cramer",
      division: "NCAA Division I",
      weightClass: "149",
      graduationYear: 2026,
      commitmentDate: "Apr 17, 2025",
      photoUrl: "/wrestler-silhouette.png",
      wrestlingClub: "Darkhorse",
    },
    {
      id: "test-athlete-2",
      name: "Test Athlete 2",
      college: "Test University",
      highSchool: "Test High School",
      division: "NCAA D2",
      weightClass: "165",
      graduationYear: 2025,
      photoUrl: "/wrestler-silhouette.png",
      wrestlingClub: "Test Club",
    },
  ])

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Bulletproof Flip Card Test</h1>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Instructions:</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Click the <strong>FLIP</strong> button on the front of any card
              </li>
              <li>The card should immediately show the back side</li>
              <li>
                Click the <strong>BACK</strong> button to return to front
              </li>
              <li>Try the navigation buttons on the back</li>
              <li>Check browser console for debug logs</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testData.map((athlete) => (
              <BulletproofFlipCard key={athlete.id} athlete={athlete} />
            ))}
          </div>

          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p>If the flip button still doesn't work:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Check browser console for any JavaScript errors</li>
              <li>Try clicking directly on the button text</li>
              <li>Disable any browser extensions</li>
              <li>Try in an incognito window</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
