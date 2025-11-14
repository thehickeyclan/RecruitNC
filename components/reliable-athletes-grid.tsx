"use client"

import { useState, useEffect } from "react"
import { ProfessionalCommitmentCard } from "./professional-commitment-card"
import { AlertCircle, RefreshCw } from "lucide-react"

// Sample data for fallback
const SAMPLE_ATHLETES = [
  {
    id: "1",
    name: "John Doe",
    graduationyear: 2025,
    highschool: "Central High",
    college: "State University",
    division: "NCAA D1",
  },
  {
    id: "2",
    name: "Jane Smith",
    graduationyear: 2026,
    highschool: "Western High",
    college: "Tech University",
    division: "NCAA D2",
  },
  {
    id: "3",
    name: "Mike Johnson",
    graduationyear: 2025,
    highschool: "Eastern High",
    college: "University College",
    division: "NCAA D1",
  },
]

export function ReliableAthletesGrid() {
  const [athletes, setAthletes] = useState(SAMPLE_ATHLETES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timestamp, setTimestamp] = useState(Date.now())

  // Function to fetch athletes
  const fetchAthletes = async () => {
    try {
      setLoading(true)
      console.log("Fetching athletes...")

      const response = await fetch(`/api/athletes?t=${timestamp}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })

      console.log("API response status:", response.status)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const text = await response.text()
      console.log("Raw API response:", text.substring(0, 100) + "...")

      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error("JSON parse error:", e)
        throw new Error("Failed to parse API response")
      }

      console.log("Parsed data:", data)

      if (Array.isArray(data) && data.length > 0) {
        console.log(`Successfully loaded ${data.length} athletes`)
        setAthletes(data)
        setError(null)
      } else {
        console.log("No athletes found or empty array")
        // Keep using sample data
      }
    } catch (err) {
      console.error("Error fetching athletes:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch athletes on mount
  useEffect(() => {
    fetchAthletes()
  }, [timestamp])

  // Function to retry loading
  const handleRetry = () => {
    setTimestamp(Date.now())
  }

  // Function to show sample data
  const handleShowSample = () => {
    setAthletes(SAMPLE_ATHLETES)
    setError(null)
  }

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-4">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2">Loading athletes...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[500px] rounded-lg border bg-card shadow-sm animate-pulse">
              <div className="h-64 bg-gray-200 rounded-t-lg"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="ml-2 text-lg font-medium text-red-800">Error Loading Athletes</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4 flex space-x-4">
            <button onClick={handleRetry} className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200">
              Try Again
            </button>
            <button
              onClick={handleShowSample}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              Show Sample Data
            </button>
          </div>
        </div>
        {athletes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.map((athlete) => (
              <div key={athlete.id} className="h-full">
                <ProfessionalCommitmentCard athlete={athlete} />
                {athletes === SAMPLE_ATHLETES && (
                  <div className="mt-1 text-xs text-gray-500 text-center">Sample data</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Render athletes grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {athletes.map((athlete) => (
        <div key={athlete.id} className="h-full">
          <ProfessionalCommitmentCard athlete={athlete} />
          {athletes === SAMPLE_ATHLETES && <div className="mt-1 text-xs text-gray-500 text-center">Sample data</div>}
        </div>
      ))}
    </div>
  )
}
