"use client"

import { useState, useEffect } from "react"
import { CommitmentCardWorking } from "@/components/commitment-card-working"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestWorkingCards() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAthletes()
  }, [])

  const loadAthletes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/athletes")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Athletes data:", data)

      // Get first 12 athletes for testing
      const testAthletes = (data.athletes || []).slice(0, 12)
      setAthletes(testAthletes)
    } catch (error) {
      console.error("Error loading athletes:", error)
      setError(error instanceof Error ? error.message : "Failed to load athletes")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading working cards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Athletes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadAthletes}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Working Commitment Cards</h1>
              <p className="text-gray-600 mt-1">Cards with working flip and view profile link</p>
            </div>
            <Button onClick={loadAthletes} variant="outline">
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="container mx-auto px-4 py-8">
        {athletes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {athletes.map((athlete) => (
              <div key={athlete.id} className="flex justify-center">
                <CommitmentCardWorking athlete={athlete} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🤼</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Athletes Found</h3>
            <p className="text-gray-500">No athlete data available to display.</p>
            <Button onClick={loadAthletes} className="mt-4">
              Try Loading Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
