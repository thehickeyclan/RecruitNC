"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface DebugPageProps {
  params: { id: string }
}

export default function AthleteMatchesDebugPage({ params }: DebugPageProps) {
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDebugData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Fetching debug data for athlete:", params.id)

      const response = await fetch(`/api/athletes/${params.id}/matches?t=${Date.now()}`)
      const data = await response.json()

      console.log("Debug API response:", data)
      setDebugData({
        apiResponse: data,
        athleteId: params.id,
        responseStatus: response.status,
        responseOk: response.ok,
      })

      if (!response.ok) {
        setError(data.error || "API request failed")
      }
    } catch (err) {
      console.error("Error fetching debug data:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchDebugData()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Athlete Matches Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <p>Loading debug data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Athlete Matches Debug</CardTitle>
          <p className="text-sm text-gray-600">Athlete ID: {params.id}</p>
          <Button onClick={fetchDebugData} size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-medium">Error: {error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">API Response Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <strong>Status:</strong> {debugData?.responseStatus}
                  </p>
                  <p>
                    <strong>Success:</strong> {debugData?.apiResponse?.success ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Matches Found:</strong> {debugData?.apiResponse?.matchCount || 0}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Total Records:</strong> {debugData?.apiResponse?.totalRecords || 0}
                  </p>
                  <p>
                    <strong>Processed:</strong> {debugData?.apiResponse?.processedRecords || 0}
                  </p>
                  <p>
                    <strong>Parse Errors:</strong> {debugData?.apiResponse?.parseErrors || 0}
                  </p>
                </div>
              </div>
            </div>

            {debugData?.apiResponse?.athlete && (
              <div>
                <h3 className="font-medium mb-2">Athlete Info</h3>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p>
                    <strong>Name:</strong> {debugData.apiResponse.athlete.name}
                  </p>
                  <p>
                    <strong>First Name:</strong> {debugData.apiResponse.athlete.firstName}
                  </p>
                  <p>
                    <strong>Last Name:</strong> {debugData.apiResponse.athlete.lastName}
                  </p>
                </div>
              </div>
            )}

            {debugData?.apiResponse?.debug?.sampleData && (
              <div>
                <h3 className="font-medium mb-2">Data Structure Analysis</h3>
                <div className="bg-yellow-50 p-3 rounded text-sm space-y-2">
                  {debugData.apiResponse.debug.sampleData.map((sample: any, index: number) => (
                    <div key={index} className="bg-white p-2 rounded">
                      <p>
                        <strong>Record {sample.recordId}:</strong>
                      </p>
                      {sample.error ? (
                        <div className="text-red-600">
                          <p>Parse Error: {sample.error}</p>
                          <p>Raw Data Type: {sample.rawDataType}</p>
                          <p>Raw Data Value: {sample.rawDataValue}</p>
                        </div>
                      ) : (
                        <div className="text-xs space-y-1">
                          <p>Data Type: {sample.dataType}</p>
                          <p>Has Data: {sample.hasData ? "Yes" : "No"}</p>
                          <p>Has Wrestlers: {sample.hasWrestlers ? "Yes" : "No"}</p>
                          <p>Wrestlers Count: {sample.wrestlersCount}</p>
                          <p>Data Keys: {sample.dataKeys?.join(", ")}</p>
                          {sample.firstWrestler && (
                            <p>
                              First Wrestler: {sample.firstWrestler.first_name} {sample.firstWrestler.last_name}
                            </p>
                          )}
                          <details>
                            <summary className="cursor-pointer">Raw Data Sample</summary>
                            <pre className="text-xs mt-1 bg-gray-100 p-2 rounded">{sample.rawDataSample}</pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debugData?.apiResponse?.debug && (
              <div>
                <h3 className="font-medium mb-2">Name Matching Debug</h3>
                <div className="bg-blue-50 p-3 rounded text-sm space-y-2">
                  <p>
                    <strong>Looking for:</strong> "{debugData.apiResponse.debug.athleteName}" or "
                    {debugData.apiResponse.debug.firstName} {debugData.apiResponse.debug.lastName}"
                  </p>

                  {debugData.apiResponse.debug.sampleWrestlerNames &&
                    debugData.apiResponse.debug.sampleWrestlerNames.length > 0 && (
                      <div>
                        <p>
                          <strong>Sample wrestler names found:</strong>
                        </p>
                        <ul className="list-disc list-inside ml-4">
                          {debugData.apiResponse.debug.sampleWrestlerNames.map((name: string, index: number) => (
                            <li key={index}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {debugData.apiResponse.debug.debugInfo && debugData.apiResponse.debug.debugInfo.length > 0 && (
                    <div>
                      <p>
                        <strong>Matching attempts:</strong>
                      </p>
                      {debugData.apiResponse.debug.debugInfo.map((info: any, index: number) => (
                        <div key={index} className="bg-white p-2 rounded mt-2 text-xs">
                          <p>
                            <strong>Record {info.recordId}:</strong> "{info.wrestlerName}" vs "{info.athleteName}"
                          </p>
                          <p>
                            Components: "{info.wrestlerFirst} {info.wrestlerLast}" vs "{info.athleteFirst}{" "}
                            {info.athleteLast}"
                          </p>
                          <p>
                            Exact Match: {info.exactMatch ? "✅" : "❌"} | First+Last Match:{" "}
                            {info.firstLastMatch ? "✅" : "❌"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {debugData?.apiResponse?.athleteMatches && debugData.apiResponse.athleteMatches.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Matches Found ({debugData.apiResponse.athleteMatches.length})</h3>
                <div className="space-y-3">
                  {debugData.apiResponse.athleteMatches.map((match: any, index: number) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium">
                        {match.wrestler.first_name} {match.wrestler.last_name}
                      </h4>
                      <p className="text-sm text-gray-600">High School: {match.wrestler.high_school}</p>
                      <p className="text-sm text-gray-600">Record ID: {match.recordId}</p>
                      <p className="text-sm text-gray-600">Match Type: {match.matchType}</p>

                      {match.wrestler.seasons && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Seasons:</p>
                          {Object.entries(match.wrestler.seasons).map(([seasonKey, seasonData]: [string, any]) => (
                            <div key={seasonKey} className="ml-4 text-sm">
                              <p>
                                {seasonData.grade} - {seasonData.season}: {seasonData.wins}-{seasonData.losses} (
                                {seasonData.total_matches} matches)
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <details>
              <summary className="cursor-pointer font-medium">Full Debug Data</summary>
              <pre className="bg-gray-100 p-4 mt-2 text-xs overflow-auto max-h-96 rounded">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
