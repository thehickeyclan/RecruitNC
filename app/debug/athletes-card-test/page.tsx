"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"

export default function AthletesCardTestPage() {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        // Get the same athletes from the athletes API
        const response = await fetch("/api/athletes")
        const data = await response.json()

        console.log("🏠 Athletes API data:", data)
        setAthletes(data.athletes?.slice(0, 6) || [])
      } catch (error) {
        console.error("Error fetching athletes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Athletes Card Test</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p>Found {athletes.length} athletes</p>
            <p>Check browser console for detailed data</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {athletes.map((athlete, index) => {
          console.log(`🃏 Card ${index + 1} data:`, athlete)
          return (
            <div key={athlete.id || index}>
              <ProfessionalCommitmentCard
                athlete={{
                  id: athlete.id,
                  name: athlete.name,
                  highSchool: athlete.highschool || athlete.high_school,
                  college: athlete.college,
                  division: athlete.division,
                  graduationYear: athlete.graduationyear || athlete.graduation_year,
                  photoUrl: athlete.photourl || athlete.image_url,
                  weightClass: athlete.weightclass || athlete.weight_class,
                  wrestlingClub: athlete.wrestlingclub || athlete.club,
                  achievements: athlete.achievements || [],
                  gender: athlete.gender,
                }}
              />
              <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
                <div><strong>Name:</strong> {athlete.name}</div>
                <div><strong>College:</strong> {athlete.college}</div>
                <div><strong>High School:</strong> {athlete.highschool || athlete.high_school}</div>
                <div><strong>Club:</strong> {athlete.wrestlingclub || athlete.club}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
