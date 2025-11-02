"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface MatchCheckResult {
  id: string
  name: string
  hasMatches: boolean
  matchCount: number
  seasons?: string[]
  error?: string
}

interface MatchCheckResponse {
  success: boolean
  summary: {
    totalAthletes: number
    athletesWithMatches: number
    athletesWithoutMatches: number
    percentageWithMatches: string
  }
  athletesWithMatches: MatchCheckResult[]
  athletesWithoutMatches: MatchCheckResult[]
  allResults: MatchCheckResult[]
}

export default function CheckAllAthleteMatches() {
  const [results, setResults] = useState<MatchCheckResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const checkMatches = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-all-athlete-matches")
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error checking matches:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Match Data Coverage Check</h1>

      <Button onClick={checkMatches} disabled={loading} className="mb-6">
        {loading ? "Checking..." : "Check All Athlete Match Data"}
      </Button>

      {results && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{results.summary.totalAthletes}</div>
                <div className="text-sm text-gray-600">Total Athletes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{results.summary.athletesWithMatches}</div>
                <div className="text-sm text-gray-600">With Match Data</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{results.summary.athletesWithoutMatches}</div>
                <div className="text-sm text-gray-600">Without Match Data</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{results.summary.percentageWithMatches}%</div>
                <div className="text-sm text-gray-600">Coverage Rate</div>
              </div>
            </div>
          </div>

          {/* Athletes WITH Match Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600">
              Athletes WITH Match Data ({results.athletesWithMatches.length})
            </h2>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-2">
                {results.athletesWithMatches.map((athlete) => (
                  <div key={athlete.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <div>
                      <span className="font-medium">{athlete.name}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({athlete.matchCount} records, {athlete.seasons?.length || 0} seasons)
                      </span>
                    </div>
                    <a
                      href={`/athletes/${athlete.id}`}
                      className="text-blue-600 hover:underline text-sm"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Profile
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Athletes WITHOUT Match Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-600">
              Athletes WITHOUT Match Data ({results.summary.athletesWithoutMatches})
            </h2>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-2">
                {results.athletesWithoutMatches.map((athlete) => (
                  <div key={athlete.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <div>
                      <span className="font-medium">{athlete.name}</span>
                      {athlete.error && <span className="text-sm text-red-600 ml-2">Error: {athlete.error}</span>}
                    </div>
                    <a
                      href={`/athletes/${athlete.id}`}
                      className="text-blue-600 hover:underline text-sm"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Profile
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
