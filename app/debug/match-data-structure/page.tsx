"use client"

import { useState, useEffect } from "react"

export default function MatchDataStructurePage() {
  const [matchData, setMatchData] = useState<any>(null)
  const [rawMatchData, setRawMatchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [athleteId, setAthleteId] = useState("1")
  const [athletesList, setAthletesList] = useState<any[]>([])

  useEffect(() => {
    fetchAthletesList()
    fetchRawMatchStructure()
  }, [])

  const fetchAthletesList = async () => {
    try {
      const response = await fetch("/api/admin/athletes-list")
      const data = await response.json()
      setAthletesList(data.athletes || [])
    } catch (error) {
      console.error("Error fetching athletes list:", error)
    }
  }

  const fetchRawMatchStructure = async () => {
    try {
      const response = await fetch("/api/debug/raw-match-structure")
      const data = await response.json()
      setRawMatchData(data)
    } catch (error) {
      console.error("Error fetching raw match structure:", error)
    }
  }

  const fetchMatchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/athletes/${athleteId}/matches`)
      const data = await response.json()
      setMatchData(data)
    } catch (error) {
      console.error("Error fetching match data:", error)
    } finally {
      setLoading(false)
    }
  }

  const liamAthlete = athletesList.find(
    (a) => a.first_name?.toLowerCase() === "liam" && a.last_name?.toLowerCase() === "hickey",
  )

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Match Data Structure Debug</h1>

      {/* Athletes List */}
      <div className="mb-6 bg-blue-50 p-4 rounded">
        <h2 className="font-bold mb-2">Available Athletes (first 10):</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {athletesList.slice(0, 10).map((athlete, index) => (
            <div key={index} className="text-sm">
              ID: {athlete.id} - {athlete.first_name} {athlete.last_name}
              {athlete.first_name?.toLowerCase() === "liam" && athlete.last_name?.toLowerCase() === "hickey" && (
                <span className="text-red-600 font-bold"> ← LIAM</span>
              )}
            </div>
          ))}
        </div>
        {liamAthlete && (
          <div className="mt-2 p-2 bg-yellow-100 rounded">
            <strong>Liam Hickey found: ID = {liamAthlete.id}</strong>
            <button
              onClick={() => setAthleteId(liamAthlete.id.toString())}
              className="ml-2 bg-blue-500 text-white px-2 py-1 rounded text-xs"
            >
              Use This ID
            </button>
          </div>
        )}
      </div>

      {/* Raw Database Structure */}
      <div className="mb-6 bg-gray-50 p-4 rounded">
        <h2 className="font-bold mb-2">Raw Database Match Structure:</h2>
        {rawMatchData && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Sample Match Fields:</h3>
              <div className="text-xs bg-white p-2 rounded">
                {rawMatchData.matchFields?.join(", ") || "No fields found"}
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Sample Match Record:</h3>
              <pre className="text-xs bg-white p-2 rounded overflow-auto">
                {JSON.stringify(rawMatchData.sampleMatch, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Athlete ID:</label>
        <input
          type="text"
          value={athleteId}
          onChange={(e) => setAthleteId(e.target.value)}
          className="border rounded px-3 py-2 mr-2"
        />
        <button onClick={fetchMatchData} className="bg-blue-500 text-white px-4 py-2 rounded">
          Fetch Match Data
        </button>
      </div>

      {loading && <div>Loading match data...</div>}

      {matchData && (
        <div className="space-y-6">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">API Response Debug Info:</h2>
            <pre className="text-xs overflow-auto">{JSON.stringify(matchData.debug, null, 2)}</pre>
          </div>

          <div className="bg-blue-50 p-4 rounded">
            <h2 className="font-bold mb-2">Total Records Found: {matchData.athleteMatches?.length || 0}</h2>
          </div>

          {matchData.athleteMatches?.map((athleteMatch: any, index: number) => (
            <div key={index} className="border rounded p-4">
              <h3 className="font-bold mb-2">Match Record {index + 1}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Wrestler Info:</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(
                      {
                        first_name: athleteMatch.wrestler.first_name,
                        last_name: athleteMatch.wrestler.last_name,
                        high_school: athleteMatch.wrestler.high_school,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Season Data:</h4>
                  {Object.entries(athleteMatch.wrestler.seasons || {}).map(([seasonKey, seasonData]: [string, any]) => (
                    <div key={seasonKey} className="mb-4">
                      <h5 className="font-medium">{seasonKey}:</h5>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(
                          {
                            season: seasonData.season,
                            grade: seasonData.grade,
                            wins: seasonData.wins,
                            losses: seasonData.losses,
                            total_matches: seasonData.total_matches,
                            pins: seasonData.pins,
                            tech_falls: seasonData.tech_falls,
                            decisions: seasonData.decisions,
                            major_decisions: seasonData.major_decisions,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold mb-2">Individual Matches Sample (first 5):</h4>
                {Object.entries(athleteMatch.wrestler.seasons || {}).map(([seasonKey, seasonData]: [string, any]) => (
                  <div key={seasonKey} className="mb-4">
                    <h5 className="font-medium">{seasonKey} Matches:</h5>
                    {seasonData.matches?.slice(0, 5).map((match: any, matchIndex: number) => (
                      <div key={matchIndex} className="bg-yellow-50 p-2 rounded mb-2">
                        <div className="font-semibold text-sm mb-1">Match {matchIndex + 1}:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <strong>Result:</strong> "{match.result}"
                          </div>
                          <div>
                            <strong>Method:</strong> "{match.method}"
                          </div>
                          <div>
                            <strong>Opponent:</strong> {match.opponent_name || match.opponent}
                          </div>
                          <div>
                            <strong>Date:</strong> {match.date}
                          </div>
                        </div>
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer">Full Match Data</summary>
                          <pre className="text-xs overflow-auto mt-1">{JSON.stringify(match, null, 2)}</pre>
                        </details>
                      </div>
                    ))}
                    {seasonData.matches?.length > 5 && (
                      <p className="text-sm text-gray-600">... and {seasonData.matches.length - 5} more matches</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
