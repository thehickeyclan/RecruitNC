"use client"

import { FixedEntityLogo } from "@/components/fixed-entity-logo"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SimpleCardTest() {
  // Simple test data - no API calls
  const testAthlete = {
    id: "1",
    name: "Test Athlete",
    graduationyear: 2025,
    college: "UNC Chapel Hill",
    division: "NCAA D1",
    weightclass: 165,
    highschool: "Cardinal Gibbons High School",
    wrestlingClub: "RAW",
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Simple Card Test</h1>

      <div className="max-w-sm">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            {/* Athlete Name */}
            <h3 className="font-bold text-lg text-gray-900 mb-2">{testAthlete.name}</h3>

            {/* Weight Class and Graduation Year */}
            <div className="flex justify-between items-center mb-3">
              <Badge variant="outline" className="text-sm">
                {testAthlete.weightclass} lbs
              </Badge>
              <Badge variant="outline" className="text-sm">
                Class of {testAthlete.graduationyear}
              </Badge>
            </div>

            {/* College with Logo */}
            <div className="flex items-center mb-2">
              <FixedEntityLogo
                entityType="college"
                entityName={testAthlete.college}
                size="sm"
                className="mr-2 rounded"
              />
              <span className="text-sm font-medium text-gray-700">{testAthlete.college}</span>
            </div>

            {/* High School with Logo */}
            <div className="flex items-center mb-2">
              <FixedEntityLogo
                entityType="highschool"
                entityName={testAthlete.highschool}
                size="sm"
                className="mr-2 rounded"
              />
              <span className="text-sm text-gray-600">{testAthlete.highschool}</span>
            </div>

            {/* Wrestling Club with Logo */}
            <div className="flex items-center">
              <FixedEntityLogo
                entityType="club"
                entityName={testAthlete.wrestlingClub}
                size="sm"
                className="mr-2 rounded"
              />
              <span className="text-sm text-gray-500">{testAthlete.wrestlingClub}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
