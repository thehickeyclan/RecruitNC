"use client"

import { useEffect, useState } from "react"
import { CommitmentCardRebuilt } from "@/components/commitment-card-rebuilt"

interface Athlete {
  id: string
  name: string
  graduationyear: number
  college: string
  division: string
  weightclass: number
  highschool: string
  wrestlingClub?: string
  photourl?: string
  achievements?: string[]
}

export default function TestRebuiltCards() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAthletes() {
      try {
        const response = await fetch("/api/athletes")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        console.log("Raw API Response:", data)

        // Handle the response - it should be an array
        let athletesList: Athlete[] = []

        if (Array.isArray(data)) {
          athletesList = data
        } else if (data.athletes && Array.isArray(data.athletes)) {
          athletesList = data.athletes
        } else if (data.data && Array.isArray(data.data)) {
          athletesList = data.data
        } else {
          console.error("Unexpected data structure:", data)
          throw new Error("Invalid data structure received")
        }

        console.log("Processed athletes:", athletesList.length)
        setAthletes(athletesList)
      } catch (error) {
        console.error("Failed to fetch athletes:", error)
        setError(error instanceof Error ? error.message : "Failed to load athletes")
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Rebuilt Commitment Cards</h1>
            <p className="text-gray-600 text-lg">Loading athletes...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Rebuilt Commitment Cards</h1>
          <p className="text-gray-600 text-lg">Testing the rebuilt cards with proper logo integration</p>
          <p className="text-gray-500">Showing {athletes.length} athletes with logos from Logo Manager Pro</p>
        </div>

        {athletes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No athletes found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {athletes.map((athlete) => (
              <CommitmentCardRebuilt key={athlete.id} athlete={athlete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
