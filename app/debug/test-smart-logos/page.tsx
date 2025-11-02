"use client"

import { SmartLogo } from "@/components/smart-logo"
import { SmartFlipCard } from "@/components/smart-flip-card"

const testAthletes = [
  {
    id: "1",
    name: "Test Athlete 1",
    college: "UNC Chapel Hill",
    highschool: "Cardinal Gibbons High School",
    wrestlingclub: "Dark Horse Wrestling Club",
    graduationyear: 2024,
    weightclass: "165",
    division: "NCAA D1",
    gender: "Male",
    photourl: "/wrestler-profile.png",
  },
  {
    id: "2",
    name: "Test Athlete 2",
    college: "NC State",
    highschool: "Cary High School",
    wrestlingclub: "Triangle Wrestling Club",
    graduationyear: 2025,
    weightclass: "157",
    division: "NCAA D1",
    gender: "Male",
    photourl: "/wrestler-profile.png",
  },
]

export default function TestSmartLogos() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Smart Logo System Test</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Individual Logo Tests</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">College Logos</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SmartLogo
                  entityName="UNC Chapel Hill"
                  entityType="college"
                  fallbackSrc="/generic-college-logo.png"
                  alt="UNC logo"
                  width={32}
                  height={32}
                  showMatchInfo={true}
                />
                <span>UNC Chapel Hill</span>
              </div>
              <div className="flex items-center gap-2">
                <SmartLogo
                  entityName="NC State"
                  entityType="college"
                  fallbackSrc="/generic-college-logo.png"
                  alt="NC State logo"
                  width={32}
                  height={32}
                  showMatchInfo={true}
                />
                <span>NC State</span>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">High School Logos</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SmartLogo
                  entityName="Cardinal Gibbons High School"
                  entityType="highschool"
                  fallbackSrc="/high-school-logo.png"
                  alt="Cardinal Gibbons logo"
                  width={32}
                  height={32}
                  showMatchInfo={true}
                />
                <span>Cardinal Gibbons</span>
              </div>
              <div className="flex items-center gap-2">
                <SmartLogo
                  entityName="Cary High School"
                  entityType="highschool"
                  fallbackSrc="/high-school-logo.png"
                  alt="Cary High logo"
                  width={32}
                  height={32}
                  showMatchInfo={true}
                />
                <span>Cary High</span>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">Wrestling Club Logos</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SmartLogo
                  entityName="Dark Horse Wrestling Club"
                  entityType="club"
                  fallbackSrc="/wrestling-club-logo.png"
                  alt="Dark Horse logo"
                  width={32}
                  height={32}
                  showMatchInfo={true}
                />
                <span>Dark Horse Wrestling</span>
              </div>
              <div className="flex items-center gap-2">
                <SmartLogo
                  entityName="Triangle Wrestling Club"
                  entityType="club"
                  fallbackSrc="/wrestling-club-logo.png"
                  alt="Triangle Wrestling logo"
                  width={32}
                  height={32}
                  showMatchInfo={true}
                />
                <span>Triangle Wrestling</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Smart Flip Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testAthletes.map((athlete) => (
            <SmartFlipCard key={athlete.id} athlete={athlete} />
          ))}
        </div>
      </div>
    </div>
  )
}
