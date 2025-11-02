"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function RunLiamSQLPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResults = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Running SQL debug queries...")

      const response = await fetch(`/api/debug/run-liam-sql?t=${Date.now()}`)
      const data = await response.json()

      console.log("SQL Debug results:", data)
      setResults(data)

      if (!response.ok) {
        setError(data.error || "API request failed")
      }
    } catch (err) {
      console.error("Error running SQL debug:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>SQL Debug for Liam Hickey Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <p>Searching matches table for Liam Hickey data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const res = results?.results

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SQL Debug Results for Liam Hickey</CardTitle>
          <Button onClick={fetchResults} size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Results
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-medium">Error: {error}</p>
            </div>
          )}

          {results?.success === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-medium">API Error: {results.details}</p>
              {results.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Stack Trace</summary>
                  <pre className="text-xs mt-1 bg-gray-100 p-2 rounded overflow-auto">{results.stack}</pre>
                </details>
              )}
            </div>
          )}

          {results?.success && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{res?.totalMatches || 0}</div>
                  <div className="text-sm text-blue-800">Total Match Records</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{res?.liamMatches?.length || 0}</div>
                  <div className="text-sm text-green-800">Liam Hickey Matches</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{res?.sampleWrestlers?.length || 0}</div>
                  <div className="text-sm text-purple-800">Sample Wrestlers</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{res?.similarNames?.length || 0}</div>
                  <div className="text-sm text-yellow-800">Similar Names</div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  {res?.totalMatches > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Matches Table Accessible</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!res?.debug?.sampleError ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Sample Data Query</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!res?.debug?.liamError ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span>Liam Search Query</span>
                </div>
              </div>

              {/* Table Structure */}
              {res?.debug?.tableStructure && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-700">✅ Matches Table Structure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                      {res.debug.tableStructure.map((column: string, index: number) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          {column}
                        </div>
                      ))}
                    </div>
                    {res.debug.sampleRecord && (
                      <details className="mt-3">
                        <summary className="cursor-pointer font-medium">Sample Record</summary>
                        <pre className="text-xs mt-2 bg-white p-3 rounded overflow-auto max-h-40">
                          {JSON.stringify(res.debug.sampleRecord, null, 2)}
                        </pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Liam Hickey Results */}
              {res?.liamMatches && res.liamMatches.length > 0 ? (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-700 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />🎉 Found Liam Hickey Matches! ({res.liamMatches.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {res.liamMatches.map((match: any, index: number) => (
                        <div key={index} className="bg-white border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-lg">
                            {match.first_name} {match.last_name}
                          </h4>
                          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                            <div>
                              <p>
                                <strong>High School:</strong> {match.high_school || "Not specified"}
                              </p>
                              <p>
                                <strong>Season:</strong> {match.season}
                              </p>
                              <p>
                                <strong>Grade:</strong> {match.grade}
                              </p>
                            </div>
                            <div>
                              <p>
                                <strong>Record:</strong> {match.wins}W-{match.losses}L
                              </p>
                              <p>
                                <strong>Total Matches:</strong> {match.total_matches}
                              </p>
                              <p>
                                <strong>Pins:</strong> {match.pins}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-gray-600">
                            <p>
                              <strong>Wrestler ID:</strong> {match.wrestler_id}
                            </p>
                            <p>
                              <strong>Database ID:</strong> {match.id}
                            </p>
                          </div>
                          {match.matches_data && (
                            <details className="mt-3">
                              <summary className="cursor-pointer text-sm font-medium">
                                Individual Matches Data (
                                {Array.isArray(match.matches_data) ? match.matches_data.length : 0} matches)
                              </summary>
                              <pre className="text-xs mt-2 bg-gray-100 p-3 rounded overflow-auto max-h-40">
                                {JSON.stringify(match.matches_data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-700 flex items-center">
                      <XCircle className="h-5 w-5 mr-2" />
                      No Exact Liam Hickey Matches Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-600">
                      No wrestlers found with name containing "Liam" and "Hickey". The 185 matches may not have been
                      uploaded yet.
                    </p>
                    {res?.debug?.liamError && (
                      <p className="text-xs text-red-600 mt-2">Search Error: {String(res.debug.liamError)}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Similar Names */}
              {res?.similarNames && res.similarNames.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Similar Names Found ({res.similarNames.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {res.similarNames.map((name: any, index: number) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="font-medium">{name.full_name}</p>
                          <p className="text-sm text-gray-600">High School: {name.high_school || "Unknown"}</p>
                          <p className="text-sm text-gray-600">Season: {name.season}</p>
                          <p className="text-xs text-gray-500">Wrestler ID: {name.wrestler_id}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sample Wrestlers */}
              {res?.sampleWrestlers && res.sampleWrestlers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Wrestler Names in Database ({res.sampleWrestlers.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {res.sampleWrestlers.map((wrestler: any, index: number) => (
                        <div key={index} className="bg-blue-50 p-2 rounded">
                          <p className="font-medium">{wrestler.full_name}</p>
                          <p className="text-xs text-gray-600">{wrestler.high_school}</p>
                          <p className="text-xs text-gray-500">{wrestler.season}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sample Data Structure */}
              {res?.sampleData && res.sampleData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Match Records Structure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {res.sampleData.map((sample: any, index: number) => (
                        <div key={index} className="bg-gray-50 border rounded p-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p>
                                <strong>Name:</strong> {sample.first_name} {sample.last_name}
                              </p>
                              <p>
                                <strong>Season:</strong> {sample.season}
                              </p>
                              <p>
                                <strong>Wrestler ID:</strong> {sample.wrestler_id}
                              </p>
                            </div>
                            <div>
                              <p>
                                <strong>Database ID:</strong> {sample.id}
                              </p>
                              <p>
                                <strong>Matches Count:</strong> {sample.matches_count}
                              </p>
                              <p>
                                <strong>Created:</strong> {new Date(sample.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium">Matches Data Preview</summary>
                            <pre className="text-xs mt-1 bg-white p-2 rounded overflow-auto max-h-32">
                              {sample.matches_preview}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Debug Information */}
              {res?.debug && Object.keys(res.debug).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Debug Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {Object.entries(res.debug)
                        .filter(([key]) => !["tableStructure", "sampleRecord"].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className="bg-gray-50 p-2 rounded">
                            <strong>{key}:</strong> {String(value)}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Full Results */}
              <details>
                <summary className="cursor-pointer font-medium">Full Debug Results</summary>
                <pre className="bg-gray-100 p-4 mt-2 text-xs overflow-auto max-h-96 rounded">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
