"use client"
import { useEffect, useState } from "react"
import { SimpleWorkingFlipCard } from "@/components/simple-working-flip-card"

export default function TestSimpleWorkingCard() {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        console.log("Fetching athletes...")
        const response = await fetch("/api/athletes")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Raw API response:", data)
        console.log("Type of data:", typeof data)
        console.log("Is array:", Array.isArray(data))

        // Handle different response structures
        let athletesArray = []

        if (Array.isArray(data)) {
          athletesArray = data
        } else if (data && Array.isArray(data.athletes)) {
          athletesArray = data.athletes
        } else if (data && Array.isArray(data.data)) {
          athletesArray = data.data
        } else if (data && typeof data === "object") {
          // If it's an object, try to extract athletes from common property names
          const possibleArrays = ["athletes", "data", "results", "items"]
          for (const prop of possibleArrays) {
            if (Array.isArray(data[prop])) {
              athletesArray = data[prop]
              break
            }
          }
        }

        console.log("Processed athletes array:", athletesArray)
        console.log("Athletes array length:", athletesArray.length)

        if (!Array.isArray(athletesArray)) {
          throw new Error("No valid athletes array found in response")
        }

        // Take first 3 athletes for testing
        const limitedAthletes = athletesArray.slice(0, 3)
        console.log("Limited athletes for display:", limitedAthletes)

        setAthletes(limitedAthletes)
      } catch (error) {
        console.error("Error fetching athletes:", error)
        setError(error instanceof Error ? error.message : "Unknown error occurred")

        // Fallback: create mock data for testing
        const mockAthletes = [
          {
            id: "01935c8c-b8b8-7c5e-b6b8-b1b8b8b8b8b8",
            name: "Test Athlete 1",
            firstName: "Test",
            lastName: "Athlete 1",
            college: "Test University",
            highSchool: "Test High School",
            division: "NCAA D1",
            weightClass: "165",
            graduationYear: 2024,
            commitmentDate: "2024-01-15",
            photoUrl: "/wrestler-silhouette.png",
          },
          {
            id: "test-id-2",
            name: "Test Athlete 2",
            firstName: "Test",
            lastName: "Athlete 2",
            college: "Another University",
            highSchool: "Another High School",
            division: "NCAA D2",
            weightClass: "174",
            graduationYear: 2025,
            commitmentDate: "2024-02-20",
            photoUrl: "/wrestler-silhouette.png",
          },
          {
            id: "test-id-3",
            name: "Test Athlete 3",
            firstName: "Test",
            lastName: "Athlete 3",
            college: "Third University",
            highSchool: "Third High School",
            division: "NCAA D3",
            weightClass: "184",
            graduationYear: 2024,
            commitmentDate: "2024-03-10",
            photoUrl: "/wrestler-silhouette.png",
          },
        ]

        console.log("Using mock data:", mockAthletes)
        setAthletes(mockAthletes)
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading athletes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Simple Working Card Test</h1>
          <p className="text-center text-gray-600 mb-8">
            Testing simplified flip cards with multiple navigation methods
          </p>

          {error && (
            <div className="mb-8 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p>
                <strong>API Error:</strong> {error}
              </p>
              <p className="text-sm mt-2">Using mock data for testing purposes.</p>
            </div>
          )}

          {athletes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No athletes found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {athletes.map((athlete: any, index: number) => (
                <div key={athlete.id || `athlete-${index}`}>
                  <SimpleWorkingFlipCard athlete={athlete} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Navigation Test Instructions:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Click the flip button (top-left on front, top-right on back) to flip the card</li>
              <li>On the back of the card, you'll see 4 different navigation buttons:</li>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>
                  <strong>Blue:</strong> Next.js Link component
                </li>
                <li>
                  <strong>Green:</strong> Regular HTML anchor tag
                </li>
                <li>
                  <strong>Red:</strong> JavaScript window.location
                </li>
                <li>
                  <strong>Purple:</strong> Test button with alert (shows URL before navigating)
                </li>
              </ul>
              <li>Try each button to see which one works</li>
              <li>Check the browser console for debug information</li>
            </ol>

            <div className="mt-6 p-4 bg-gray-100 rounded">
              <h3 className="font-bold mb-2">Debug Information:</h3>
              <p>
                <strong>Athletes loaded:</strong> {athletes.length}
              </p>
              <p>
                <strong>Error occurred:</strong> {error ? "Yes" : "No"}
              </p>
              <p>
                <strong>Using mock data:</strong> {error ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
