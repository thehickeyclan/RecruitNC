"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface MatchData {
  success: boolean
  totalMatches: number
  sampleMatches: any[]
  liamMatches: any[]
  liamSearchResults: any[]
  tableStructure: string[]
  uniqueWrestlerNames: string[]
  error?: string
}

export default function MatchesCheckPage() {
  const [data, setData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/debug/matches-check")
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error("Error fetching matches data:", error)
        setData({
          success: false,
          totalMatches: 0,
          sampleMatches: [],
          liamMatches: [],
          liamSearchResults: [],
          tableStructure: [],
          uniqueWrestlerNames: [],
          error: "Failed to fetch",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Matches Database Check</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Matches Database Check</h1>
        <p>No data available</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Matches Database Check</h1>

      {data.error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{data.error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Database Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Total Matches:</p>
              <p className="text-2xl font-bold text-blue-600">{data.totalMatches}</p>
            </div>
            <div>
              <p className="font-medium">Liam Hickey Matches:</p>
              <p className="text-2xl font-bold text-green-600">{data.liamMatches.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.tableStructure.map((column) => (
              <Badge key={column} variant="outline">
                {column}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liam Hickey Search Results</CardTitle>
        </CardHeader>
        <CardContent>
          {data.liamSearchResults.map((result, index) => (
            <div key={index} className="mb-4">
              <h4 className="font-medium mb-2">
                {result.strategy}: {result.count} matches
              </h4>
              {result.matches.slice(0, 3).map((match: any, matchIndex: number) => (
                <div key={matchIndex} className="text-sm bg-gray-50 p-2 rounded mb-1">
                  {match.wrestler_id} - {match.first_name} {match.last_name}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Wrestler Names</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            {data.uniqueWrestlerNames.map((name: string, index: number) => (
              <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                {name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Matches (First 10)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.sampleMatches.length === 0 ? (
            <p>No sample matches available</p>
          ) : (
            <div className="space-y-4">
              {data.sampleMatches.map((match, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Wrestler ID:</strong> {match.wrestler_id}
                    </div>
                    <div>
                      <strong>Name:</strong> {match.first_name} {match.last_name}
                    </div>
                    <div>
                      <strong>Date:</strong> {match.date || "N/A"}
                    </div>
                    <div>
                      <strong>Result:</strong> {match.result || "N/A"}
                    </div>
                    <div>
                      <strong>Opponent:</strong> {match.opponent_name || "N/A"}
                    </div>
                    <div>
                      <strong>Tournament:</strong> {match.tournament || "N/A"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
