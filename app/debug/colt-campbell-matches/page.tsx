"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ColtCampbellMatchesDebug() {
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [athleteData, setAthleteData] = useState<any>(null)

  const fetchColtData = async () => {
    setLoading(true)
    try {
      // First get Colt's athlete data
      const athleteResponse = await fetch("/api/debug/find-colt-campbell")
      const athleteResult = await athleteResponse.json()
      setAthleteData(athleteResult)

      if (athleteResult.athlete) {
        // Then get his match data
        const matchResponse = await fetch(`/api/athletes/${athleteResult.athlete.id}/matches`)
        const matchResult = await matchResponse.json()
        setDebugData(matchResult)
      }
    } catch (error) {
      console.error("Error:", error)
      setDebugData({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const fixColtData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/fix-colt-campbell", {
        method: "POST",
      })
      const result = await response.json()
      setDebugData(result)
    } catch (error) {
      console.error("Error:", error)
      setDebugData({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Colt Campbell Match Data Debug</CardTitle>
          <p className="text-sm text-gray-600">
            Expected: 248 matches, 229-19 record, 132 pins, 17 tech falls from Hickory Ridge HS
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={fetchColtData} disabled={loading}>
              {loading ? "Loading..." : "Debug Colt Campbell Matches"}
            </Button>
            <Button onClick={fixColtData} disabled={loading} variant="destructive">
              Fix Colt Campbell Data (248 matches)
            </Button>
          </div>

          {athleteData && (
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-bold mb-2">Athlete Data:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <strong>Found Athletes:</strong> {athleteData.allCandidates?.length || 0}
                  </p>
                  <p>
                    <strong>Match Records Found:</strong> {athleteData.sampleMatchRecords?.length || 0}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Selected Athlete:</strong> {athleteData.athlete?.name || "None"}
                  </p>
                  <p>
                    <strong>High School:</strong> {athleteData.athlete?.highschool || "Unknown"}
                  </p>
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">Full Athlete Data</summary>
                <pre className="text-xs overflow-auto max-h-32 mt-1 bg-white p-2 rounded">
                  {JSON.stringify(athleteData, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {debugData && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-bold mb-2">Match Debug Data:</h3>
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <p>
                    <strong>Success:</strong> {debugData.success ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Total Records:</strong> {debugData.totalRecords || debugData.insertedMatches || 0}
                  </p>
                  <p>
                    <strong>Matches Found:</strong> {debugData.athleteMatches?.length || 0}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Career Record:</strong> {debugData.careerRecord || "Unknown"}
                  </p>
                  <p>
                    <strong>Total Matches:</strong> {debugData.totalCareerMatches || 0}
                  </p>
                  <p>
                    <strong>Parse Errors:</strong> {debugData.parseErrors || 0}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Athlete Name:</strong> {debugData.debug?.athleteName || "Colt Campbell"}
                  </p>
                  <p>
                    <strong>Message:</strong> {debugData.message || "No message"}
                  </p>
                </div>
              </div>

              {debugData.debug?.searchStrategies && (
                <div className="mb-4">
                  <p className="font-medium">Search Strategies Used:</p>
                  <ul className="list-disc list-inside text-sm">
                    {debugData.debug.searchStrategies.map((strategy: string, index: number) => (
                      <li key={index}>{strategy}</li>
                    ))}
                  </ul>
                </div>
              )}

              {debugData.sampleMatches && (
                <div className="mb-4">
                  <p className="font-medium">Sample Match Records Created:</p>
                  <div className="text-xs bg-white p-2 rounded max-h-32 overflow-auto">
                    {debugData.sampleMatches.map((match: any, index: number) => (
                      <div key={index} className="mb-2 border-b pb-1">
                        <p>
                          <strong>Date:</strong> {match.match_date}
                        </p>
                        <p>
                          <strong>Season:</strong> {match.season} ({match.grade})
                        </p>
                        <p>
                          <strong>Result:</strong> {match.result} by {match.win_type || match.loss_type}
                        </p>
                        <p>
                          <strong>Weight:</strong> {match.weight_class}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer font-medium">Full Debug Data</summary>
                <pre className="text-xs overflow-auto max-h-96 mt-2 bg-white p-2 rounded">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
