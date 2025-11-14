"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface MatchData {
  success: boolean
  matches: any[]
  matchesBySeason: Record<string, any[]>
  careerTotals: {
    totalMatches: number
    wins: number
    losses: number
    pins: number
    techFalls: number
    decisions: number
    majorDecisions: number
    forfeitsWon: number
    pinPercentage: number
    tfPercentage: number
    finishingPercentage: number
  }
  seasons: string[]
  message: string
}

export default function ImprovedAthleteProfilePage({ params }: { params: { id: string } }) {
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadTime, setLoadTime] = useState<number>(0)

  useEffect(() => {
    const fetchMatchData = async () => {
      const startTime = Date.now()
      try {
        const response = await fetch(`/api/athletes/${params.id}/matches-direct`)
        const data = await response.json()
        const endTime = Date.now()

        setLoadTime(endTime - startTime)
        setMatchData(data)

        if (!data.success) {
          setError(data.error || "Failed to load match data")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchMatchData()
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🆕 Improved Athlete Profile</h1>
          <p className="text-gray-600">Testing the new direct match data system</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge variant="outline" className="bg-green-50">
              ⚡ Loaded in {loadTime}ms
            </Badge>
            <Link href="/test/match-system/links">
              <Button variant="outline" size="sm">
                ← Back to Tests
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Alert>
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {matchData && matchData.success && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Career Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{matchData.careerTotals.totalMatches}</div>
                    <div className="text-sm text-gray-600">Total Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{matchData.careerTotals.wins}</div>
                    <div className="text-sm text-gray-600">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{matchData.careerTotals.losses}</div>
                    <div className="text-sm text-gray-600">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{matchData.careerTotals.pins}</div>
                    <div className="text-sm text-gray-600">Pins</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold">{matchData.careerTotals.pinPercentage}%</div>
                    <div className="text-sm text-gray-600">Pin Percentage</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold">{matchData.careerTotals.tfPercentage}%</div>
                    <div className="text-sm text-gray-600">Tech Fall %</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold">{matchData.careerTotals.finishingPercentage}%</div>
                    <div className="text-sm text-gray-600">Finishing %</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Season Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {matchData.seasons.map((season) => {
                    const seasonMatches = matchData.matchesBySeason[season] || []
                    const seasonTotals = seasonMatches.reduce(
                      (totals, match) => ({
                        matches: totals.matches + (match.total_matches || 0),
                        wins: totals.wins + (match.wins || 0),
                        losses: totals.losses + (match.losses || 0),
                        pins: totals.pins + (match.pins || 0),
                      }),
                      { matches: 0, wins: 0, losses: 0, pins: 0 },
                    )

                    return (
                      <div key={season} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{season}</h3>
                          <Badge variant="outline">{seasonMatches.length} records</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <div className="font-medium">{seasonTotals.matches}</div>
                            <div className="text-gray-600">Matches</div>
                          </div>
                          <div>
                            <div className="font-medium text-green-600">{seasonTotals.wins}</div>
                            <div className="text-gray-600">Wins</div>
                          </div>
                          <div>
                            <div className="font-medium text-red-600">{seasonTotals.losses}</div>
                            <div className="text-gray-600">Losses</div>
                          </div>
                          <div>
                            <div className="font-medium text-blue-600">{seasonTotals.pins}</div>
                            <div className="text-gray-600">Pins</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {matchData && !matchData.success && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600">{matchData.message || "No match data available"}</p>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            🎉 This profile uses the new direct athlete_id system for instant loading!
          </p>
        </div>
      </div>
    </div>
  )
}
