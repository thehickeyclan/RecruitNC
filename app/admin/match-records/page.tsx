"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Eye, RefreshCw } from "lucide-react"

interface Match {
  opponent: string
  result: string
  method: string
  date?: string
  tournament?: string
  weight?: string
}

interface SeasonData {
  season: string
  grade: string
  high_school: string
  total_matches: number
  wins: number
  losses: number
  pins: number
  tech_falls: number
  decisions: number
  major_decisions: number
  forfeits_won: number
  pin_percentage: number
  tf_percentage: number
  win_percentage: number
  matches: Match[]
  created_at: string
}

interface CareerTotals {
  total_matches: number
  wins: number
  losses: number
  pins: number
  tech_falls: number
  decisions: number
  major_decisions: number
  forfeits_won: number
  pin_percentage: string
  tf_percentage: string
  win_percentage: string
}

interface WrestlerData {
  first_name: string
  last_name: string
  high_school: string
  seasons: { [key: string]: SeasonData }
  career_totals: CareerTotals
}

interface ApiResponse {
  wrestlers: WrestlerData[]
  total_records: number
  processed_wrestlers: number
  debug?: {
    sample_names: string[]
    total_career_matches: number
  }
  error?: string
  message?: string
}

export default function MatchRecordsPage() {
  const [wrestlers, setWrestlers] = useState<WrestlerData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [expandedWrestlers, setExpandedWrestlers] = useState<Set<string>>(new Set())
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadMatchRecords()
  }, [])

  const loadMatchRecords = async () => {
    try {
      setLoading(true)
      setError("")
      console.log("Loading match records...")

      const response = await fetch("/api/match-records")
      const data: ApiResponse = await response.json()

      console.log("API Response:", data)

      if (data.error) {
        setError(data.error)
        setDebugInfo(data)
      } else {
        setWrestlers(data.wrestlers || [])
        setDebugInfo(data.debug)
        console.log(`Loaded ${data.wrestlers?.length || 0} wrestlers`)
      }
    } catch (err) {
      setError("Failed to load match records")
      console.error("Error loading match records:", err)
    } finally {
      setLoading(false)
    }
  }

  const toggleWrestlerExpansion = (wrestlerKey: string) => {
    const newExpanded = new Set(expandedWrestlers)
    if (newExpanded.has(wrestlerKey)) {
      newExpanded.delete(wrestlerKey)
    } else {
      newExpanded.add(wrestlerKey)
    }
    setExpandedWrestlers(newExpanded)
  }

  const toggleSeasonExpansion = (seasonKey: string) => {
    const newExpanded = new Set(expandedSeasons)
    if (newExpanded.has(seasonKey)) {
      newExpanded.delete(seasonKey)
    } else {
      newExpanded.add(seasonKey)
    }
    setExpandedSeasons(newExpanded)
  }

  const getWrestlerKey = (wrestler: WrestlerData) => `${wrestler.first_name}_${wrestler.last_name}`.toLowerCase()

  const getSeasonKey = (wrestlerKey: string, season: string) => `${wrestlerKey}_${season}`

  const getResultDisplay = (result: string) => {
    // Handle both W/L format and method format
    if (result === "W" || result === "Win") {
      return { display: "W", isWin: true }
    } else if (result === "L" || result === "Loss") {
      return { display: "L", isWin: false }
    } else {
      // For methods like "Fall", "Dec", etc. - assume these are wins
      const methodLower = result?.toLowerCase() || ""
      if (
        methodLower.includes("fall") ||
        methodLower.includes("pin") ||
        methodLower.includes("dec") ||
        methodLower.includes("decision") ||
        methodLower.includes("tech") ||
        methodLower.includes("tf") ||
        methodLower.includes("major") ||
        methodLower.includes("forfeit")
      ) {
        return { display: "W", isWin: true }
      }
      return { display: "L", isWin: false }
    }
  }

  const getMethodBadgeClass = (method: string) => {
    const methodLower = method?.toLowerCase() || ""
    if (methodLower.includes("fall") || methodLower.includes("pin")) {
      return "bg-blue-50 text-blue-700 border-blue-200"
    } else if (methodLower.includes("tech") || methodLower === "tf") {
      return "bg-purple-50 text-purple-700 border-purple-200"
    } else if (methodLower.includes("major")) {
      return "bg-green-50 text-green-700 border-green-200"
    } else if (methodLower.includes("forfeit")) {
      return "bg-orange-50 text-orange-700 border-orange-200"
    } else {
      return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Match Records</h1>
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading match records...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Match Records</h1>
        <Alert className="border-red-500 mb-6">
          <AlertDescription>
            <p className="font-semibold text-red-700">Error loading match records</p>
            <p>{error}</p>
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                <strong>Debug Info:</strong>
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </AlertDescription>
        </Alert>
        <div className="space-x-4">
          <Button onClick={loadMatchRecords}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <a href="/debug/match-data-raw" className="text-blue-600 hover:underline">
            Debug Raw Data
          </a>
        </div>
      </div>
    )
  }

  if (wrestlers.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Match Records</h1>
        <Alert className="mb-6">
          <AlertDescription>
            <p>No match records found. The database might be empty or there could be a processing issue.</p>
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                <strong>Debug Info:</strong>
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </AlertDescription>
        </Alert>
        <div className="space-x-4">
          <Button onClick={loadMatchRecords}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <a href="/admin/match-manager" className="text-blue-600 hover:underline">
            Go to Match Manager
          </a>
          <a href="/debug/match-data-raw" className="text-blue-600 hover:underline">
            Debug Raw Data
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Match Records</h1>
        <p className="text-gray-600">Wrestling match statistics and records</p>
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-sm text-gray-500">
              Found {wrestlers.length} wrestler{wrestlers.length !== 1 ? "s" : ""} with match data
            </p>
            {debugInfo && (
              <p className="text-xs text-blue-500">Total career matches: {debugInfo.total_career_matches}</p>
            )}
          </div>
          <div className="space-x-4">
            <Button onClick={loadMatchRecords} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <a href="/debug/match-data-raw" className="text-blue-600 hover:underline text-sm">
              🔍 Debug Raw Data
            </a>
            <a href="/admin/match-manager" className="text-green-600 hover:underline text-sm">
              📊 Match Manager
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wrestler
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                High School
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Career Record
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pins</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tech Falls
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {wrestlers.map((wrestler, index) => {
              const wrestlerKey = getWrestlerKey(wrestler)
              const isExpanded = expandedWrestlers.has(wrestlerKey)

              return (
                <React.Fragment key={index}>
                  {/* Main Career Row */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleWrestlerExpansion(wrestlerKey)}
                          className="mr-2 p-1 hover:bg-gray-200 rounded"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {wrestler.first_name} {wrestler.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {Object.keys(wrestler.seasons).length} season
                            {Object.keys(wrestler.seasons).length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{wrestler.high_school}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {wrestler.career_totals.wins}-{wrestler.career_totals.losses}
                      </div>
                      <div className="text-sm text-gray-500">{wrestler.career_totals.total_matches} matches</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">{wrestler.career_totals.pins}</div>
                      <div className="text-sm text-gray-500">{wrestler.career_totals.pin_percentage}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-purple-600">{wrestler.career_totals.tech_falls}</div>
                      <div className="text-sm text-gray-500">{wrestler.career_totals.tf_percentage}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {wrestler.career_totals.win_percentage}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleWrestlerExpansion(wrestlerKey)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {isExpanded ? "Hide" : "View"} Seasons
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Season Rows */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900 mb-3">Season Breakdown</h4>

                          {Object.values(wrestler.seasons)
                            .sort((a, b) => {
                              const gradeOrder = { Freshman: 1, Sophomore: 2, Junior: 3, Senior: 4 }
                              return (
                                (gradeOrder[a.grade as keyof typeof gradeOrder] || 5) -
                                (gradeOrder[b.grade as keyof typeof gradeOrder] || 5)
                              )
                            })
                            .map((season, seasonIndex) => {
                              const seasonKey = getSeasonKey(wrestlerKey, season.season)
                              const isSeasonExpanded = expandedSeasons.has(seasonKey)

                              return (
                                <div key={seasonIndex} className="border rounded-lg bg-white">
                                  {/* Season Header */}
                                  <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                      <button
                                        onClick={() => toggleSeasonExpansion(seasonKey)}
                                        className="p-1 hover:bg-gray-200 rounded"
                                      >
                                        {isSeasonExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </button>
                                      <div>
                                        <h5 className="font-medium text-gray-900">
                                          {season.grade} Year ({season.season})
                                        </h5>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-6 text-sm">
                                      <span className="text-gray-600">
                                        Record:{" "}
                                        <span className="font-medium">
                                          {season.wins}-{season.losses}
                                        </span>
                                      </span>
                                      <span className="text-blue-600">
                                        Pins: <span className="font-medium">{season.pins}</span>
                                      </span>
                                      <span className="text-purple-600">
                                        TF: <span className="font-medium">{season.tech_falls}</span>
                                      </span>
                                      <span className="text-green-600">
                                        Win%: <span className="font-medium">{season.win_percentage.toFixed(1)}%</span>
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleSeasonExpansion(seasonKey)}
                                        className="ml-4"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        {isSeasonExpanded ? "Hide" : "View"} Matches
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Individual Matches */}
                                  {isSeasonExpanded && season.matches && season.matches.length > 0 && (
                                    <div className="p-4">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="border-b">
                                              <th className="text-left py-2 px-3">Date</th>
                                              <th className="text-left py-2 px-3">Opponent</th>
                                              <th className="text-left py-2 px-3">Result</th>
                                              <th className="text-left py-2 px-3">Method</th>
                                              <th className="text-left py-2 px-3">Venue/Tournament</th>
                                              <th className="text-left py-2 px-3">Weight</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {season.matches.map((match, matchIndex) => {
                                              const resultInfo = getResultDisplay(match.result)
                                              return (
                                                <tr key={matchIndex} className="border-b hover:bg-gray-50">
                                                  <td className="py-2 px-3">{match.date || "N/A"}</td>
                                                  <td className="py-2 px-3 font-medium">
                                                    {match.opponent || "Unknown"}
                                                  </td>
                                                  <td className="py-2 px-3">
                                                    <div
                                                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white ${
                                                        resultInfo.isWin ? "bg-green-500" : "bg-red-500"
                                                      }`}
                                                    >
                                                      {resultInfo.display}
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-3">
                                                    <Badge
                                                      variant="outline"
                                                      className={`text-xs ${getMethodBadgeClass(match.method)}`}
                                                    >
                                                      {match.method || "Decision"}
                                                    </Badge>
                                                  </td>
                                                  <td className="py-2 px-3 text-gray-600">
                                                    {match.tournament || "N/A"}
                                                  </td>
                                                  <td className="py-2 px-3 text-gray-600">{match.weight || "N/A"}</td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {isSeasonExpanded && (!season.matches || season.matches.length === 0) && (
                                    <div className="p-4 text-center text-gray-500">
                                      No individual match data available for this season
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
