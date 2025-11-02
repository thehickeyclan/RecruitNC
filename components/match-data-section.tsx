"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { CareerSummaryTable } from "./career-summary-table"
import { MatchResultsByYear } from "./match-results-by-year"

interface MatchDataSectionProps {
  athleteId: string
  athleteName: string
}

export function MatchDataSection({ athleteId, athleteName }: MatchDataSectionProps) {
  const [matchData, setMatchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true)
        setError(null)

        console.log(`Fetching matches for athlete: ${athleteName} (ID: ${athleteId})`)

        const response = await fetch(`/api/athletes/${athleteId}/matches`)
        const data = await response.json()

        console.log(`Match data response for ${athleteName}:`, data)
        setMatchData(data)

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch matches")
        }
      } catch (err) {
        console.error(`Error fetching matches for ${athleteName}:`, err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    if (athleteId && athleteName) {
      fetchMatches()
    }
  }, [athleteId, athleteName])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <p>Loading match records for {athleteName}...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">Error loading match records for {athleteName}</p>
              <p className="text-red-700">{error}</p>
            </div>

            <Button variant="outline" onClick={() => setShowDebug(!showDebug)}>
              {showDebug ? "Hide" : "Show"} Debug Info
            </Button>

            {showDebug && (
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium mb-2">Debug Information for {athleteName}:</h4>
                <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(matchData, null, 2)}</pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const athleteMatches = matchData?.athleteMatches || []

  // Extract seasons for THIS SPECIFIC ATHLETE only
  const athleteSeasons: any[] = []
  athleteMatches.forEach((match: any) => {
    if (match.wrestler && match.wrestler.seasons) {
      Object.entries(match.wrestler.seasons).forEach(([seasonKey, seasonData]: [string, any]) => {
        const yearMatch = seasonData.season?.match(/\d{4}/)
        const year = yearMatch ? yearMatch[0] : null

        athleteSeasons.push({
          ...seasonData,
          year,
          seasonKey, // Add season key for debugging
          athleteSpecific: true, // Mark as belonging to this athlete
        })
      })
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Match Records for {athleteName}
          {matchData?.success && (
            <div className="text-sm font-normal text-gray-600 mt-2">
              Found {athleteMatches.length} season records for {athleteName}
              <br />
              Extracted {athleteSeasons.length} seasons from match data
              <br />
              Searched {matchData.totalRecords} total records in database
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)}>
              {showDebug ? "Hide" : "Show"} Debug Info
            </Button>

            {matchData?.debug && (
              <div className="text-sm text-gray-600">
                Matches found: {matchData.debug.matchesFound} | Seasons extracted: {matchData.debug.seasonsExtracted}
              </div>
            )}
          </div>

          {showDebug && matchData && (
            <div className="bg-gray-50 p-4 rounded space-y-2">
              <h4 className="font-medium">Debug Information for {athleteName}:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <strong>Athlete ID:</strong> {matchData.debug?.athleteId}
                  </p>
                  <p>
                    <strong>Athlete Name:</strong> {matchData.debug?.athleteName}
                  </p>
                  <p>
                    <strong>First Name:</strong> {matchData.debug?.firstName}
                  </p>
                  <p>
                    <strong>Last Name:</strong> {matchData.debug?.lastName}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Total Records:</strong> {matchData.totalRecords}
                  </p>
                  <p>
                    <strong>Processed Records:</strong> {matchData.processedRecords}
                  </p>
                  <p>
                    <strong>Parse Errors:</strong> {matchData.parseErrors}
                  </p>
                  <p>
                    <strong>Matches Found:</strong> {athleteMatches.length}
                  </p>
                  <p>
                    <strong>Seasons Extracted:</strong> {athleteSeasons.length}
                  </p>
                </div>
              </div>

              {matchData.debug?.debugSamples && matchData.debug.debugSamples.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium">Sample Records from Database:</p>
                  <div className="text-xs bg-white p-2 rounded max-h-32 overflow-auto">
                    {matchData.debug.debugSamples.map((sample: any, index: number) => (
                      <div key={index} className="mb-2 border-b pb-1">
                        <p>
                          <strong>Name:</strong> {sample.firstName} {sample.lastName}
                        </p>
                        <p>
                          <strong>Wrestler ID:</strong> {sample.wrestlerId}
                        </p>
                        <p>
                          <strong>School:</strong> {sample.highSchool}
                        </p>
                        <p>
                          <strong>Season:</strong> {sample.season} ({sample.grade})
                        </p>
                        <p>
                          <strong>Record:</strong> {sample.wins}-{sample.losses} ({sample.totalMatches} matches)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {athleteSeasons.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium">Extracted Seasons for {athleteName}:</p>
                  <div className="text-xs bg-white p-2 rounded max-h-32 overflow-auto">
                    {athleteSeasons.map((season: any, index: number) => (
                      <div key={index} className="mb-2 border-b pb-1">
                        <p>
                          <strong>Grade:</strong> {season.grade} | <strong>Season:</strong> {season.season}
                        </p>
                        <p>
                          <strong>Record:</strong> {season.wins}-{season.losses} ({season.total_matches} matches)
                        </p>
                        <p>
                          <strong>School:</strong> {season.high_school}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2">
                <p className="text-sm">
                  <strong>Search Strategies Used:</strong>
                </p>
                <ul className="text-xs list-disc list-inside">
                  {matchData.debug?.searchStrategies?.map((strategy: string, index: number) => (
                    <li key={index}>{strategy}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {athleteMatches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">No match records found for {athleteName}</p>
              <p className="text-sm text-gray-500">
                {matchData?.totalRecords > 0
                  ? `Searched ${matchData.totalRecords} match records in the database.`
                  : "No match records exist in the database yet."}
              </p>
              {matchData?.debug && (
                <p className="text-xs text-gray-400 mt-2">
                  Searched for: "{matchData.debug.athleteName}" and "{matchData.debug.firstName}{" "}
                  {matchData.debug.lastName}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Career Summary Table - Pass only this athlete's seasons */}
              <CareerSummaryTable seasons={athleteSeasons} athleteName={athleteName} />

              {/* Match Results by Year - Pass only this athlete's seasons */}
              <MatchResultsByYear seasons={athleteSeasons} athleteName={athleteName} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
