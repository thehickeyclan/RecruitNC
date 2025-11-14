"use client"

import { useState, useEffect } from "react"
import { CommitmentCard } from "@/components/commitment-card"

export default function TestRealCards() {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAthletes() {
      try {
        const response = await fetch("/api/athletes")
        const data = await response.json()

        // Take first 3 athletes for testing
        setAthletes(data.slice(0, 3))
      } catch (error) {
        console.error("Error fetching athletes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Real Cards with Logos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {athletes.map((athlete) => (
          <CommitmentCard
            key={athlete.id}
            athlete={{
              id: athlete.id,
              name: athlete.name,
              graduation_year: athlete.graduationyear || athlete.graduation_year,
              college: athlete.college,
              division: athlete.division,
              weight_class: athlete.weightclass || athlete.weight_class,
              high_school: athlete.highschool || athlete.high_school,
              club: athlete.wrestlingclub || athlete.wrestling_club || athlete.club,
              image_url: athlete.photourl || athlete.photo_url || athlete.image_url,
              instagram: athlete.instagram,
            }}
            showFlip={false}
          />
        ))}
      </div>
    </div>
  )
}
