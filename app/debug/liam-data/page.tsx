"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface LiamAnalysis {
  id: string
  wrestler_id: string
  season: string
  grade: string
  created_at: string
  storedTotals: any
  calculatedTotals: any
  hasMismatch: boolean
  sampleMatches: any[]
  totalMatches: number
  error?: string
}

interface DuplicateInfo {
  key: string
  records: Array<{
    id: string
    created_at: string
    wrestler_id: string
  }>
}

export default function LiamDataDebug() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadLiamData()
  }, [])

  const loadLiamData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/debug/liam-data")
      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        setData(result)
      }
    } catch (err) {
      setError("Failed to load Liam data")
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const cleanupDuplicates = async () => {
    try {
      setCleanupLoading(true)
      const response = await fetch("/api/admin/cleanup-liam-duplicates", {
        method: "POST",
      })
      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        alert(`Cleanup complete! Deleted ${result.deletedCount} duplicate records.`)
        loadLiamData() // Reload data
      }
    } catch (err) {
      setError("Failed to cleanup duplicates")
      console.error("Error:", err)
    } finally {
      setCleanupLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Liam Data Debug</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Liam Data Debug</h1>
        <Alert className="border-red-500">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Liam Data Debug</h1>
        <p className="text-gray-600">This shows stored totals vs calculated totals from individual matches</p>
        <p className="text-sm text-gray-500">
          If stored totals don't match calculated totals, that's the source of the error
        </p>
      </div>

      {data?.hasDuplicates && (
        <Alert className="mb-6 border-orange-500 bg-orange-50">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-orange-700">⚠️ Duplicate Records Detected!</p>
                <p className="text-orange-600">
                  Found {data.duplicates.length} duplicate season(s). This is causing incorrect career totals.
                </p>
              </div>
              <Button
                onClick={cleanupDuplicates}
                disabled={cleanupLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {cleanupLoading ? "Cleaning..." : "🧹 Cleanup Duplicates"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <p className="text-lg font-semibold">Found {data?.totalRecords || 0} record(s) for Liam</p>
      </div>

      <div className="space-y-6">
        {data?.analysis?.map((season: LiamAnalysis, index: number) => (
          <div key={index} className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {season.grade} Year ({season.season})
              </h3>
              <div className="text-sm text-gray-500">ID: {season.wrestler_id}</div>
            </div>

            {season.error ? (
              <Alert className="border-red-500">
                <AlertDescription>{season.error}</AlertDescription>
              </Alert>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Stored Totals */}
                <div>
                  <h4 className="font-medium mb-2">Stored Totals (from database)</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      Total Matches: <span className="font-medium">{season.storedTotals?.total_matches}</span>
                    </p>
                    <p>
                      Wins: <span className="font-medium">{season.storedTotals?.wins}</span>
                    </p>
                    <p>
                      Losses: <span className="font-medium">{season.storedTotals?.losses}</span>
                    </p>
                    <p>
                      Pins: <span className="font-medium">{season.storedTotals?.pins}</span>
                    </p>
                    <p>
                      Record: <span className="font-medium">{season.storedTotals?.record}</span>
                    </p>
                  </div>
                </div>

                {/* Calculated Totals */}
                <div>
                  <h4 className="font-medium mb-2">Calculated from Individual Matches</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      Total Matches: <span className="font-medium">{season.calculatedTotals?.total_matches}</span>
                    </p>
                    <p>
                      Wins: <span className="font-medium">{season.calculatedTotals?.wins}</span>
                    </p>
                    <p>
                      Losses: <span className="font-medium">{season.calculatedTotals?.losses}</span>
                    </p>
                    <p>
                      Pins: <span className="font-medium">{season.calculatedTotals?.pins}</span>
                    </p>
                    <p>
                      Record: <span className="font-medium">{season.calculatedTotals?.record}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {season.hasMismatch && (
              <Alert className="mt-4 border-yellow-500 bg-yellow-50">
                <AlertDescription>
                  <p className="font-semibold text-yellow-700">⚠️ Data Mismatch Detected!</p>
                  <p className="text-yellow-600">
                    The stored totals don't match the calculated totals from individual matches.
                  </p>
                  <p className="text-yellow-600">
                    This explains why the career totals are wrong in the match records page.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Sample Matches */}
            {season.sampleMatches && season.sampleMatches.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Sample Individual Matches (first 3):</h4>
                <div className="space-y-2">
                  {season.sampleMatches.map((match: any, matchIndex: number) => (
                    <div key={matchIndex} className="text-sm bg-gray-50 p-2 rounded">
                      <p>
                        Opponent: <span className="font-medium">{match.opponent}</span>
                      </p>
                      <p>
                        Result: <Badge variant={match.result === "W" ? "default" : "destructive"}>{match.result}</Badge>
                      </p>
                      <p>
                        Method: <span className="font-medium">{match.method}</span>
                      </p>
                      <p>
                        Date: <span className="font-medium">{match.date}</span>
                      </p>
                      {match.venue && (
                        <p>
                          Venue: <span className="font-medium">{match.venue}</span>
                        </p>
                      )}
                      {match.weight && (
                        <p>
                          Weight: <span className="font-medium">{match.weight}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Total individual matches in this season: {season.totalMatches}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Summary</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Career Totals (from stored data):</h4>
            <div className="space-y-1 text-sm">
              <p>
                Wins: <span className="font-medium">{data?.careerFromStored?.wins}</span>
              </p>
              <p>
                Losses: <span className="font-medium">{data?.careerFromStored?.losses}</span>
              </p>
              <p>
                Pins: <span className="font-medium">{data?.careerFromStored?.pins}</span>
              </p>
              <p>
                Record:{" "}
                <span className="font-medium">
                  {data?.careerFromStored?.wins}-{data?.careerFromStored?.losses}
                </span>
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Career Totals (calculated from individual matches):</h4>
            <div className="space-y-1 text-sm">
              <p>
                Wins: <span className="font-medium">{data?.careerFromMatches?.wins}</span>
              </p>
              <p>
                Losses: <span className="font-medium">{data?.careerFromMatches?.losses}</span>
              </p>
              <p>
                Pins: <span className="font-medium">{data?.careerFromMatches?.pins}</span>
              </p>
              <p>
                Record:{" "}
                <span className="font-medium">
                  {data?.careerFromMatches?.wins}-{data?.careerFromMatches?.losses}
                </span>
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4">Total Database Records: {data?.totalRecords}</p>
      </div>
    </div>
  )
}
