"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function normalizeAthleteId(value: string): string {
  const trimmed = (value || "").trim()
  // Remove query/hash, split by '/', take the last non-empty segment
  const slug = trimmed.split("?")[0].split("#")[0]
  const parts = slug.split("/").filter(Boolean)
  const candidate = parts.length ? parts[parts.length - 1] : trimmed
  // Extract UUID if present within the candidate
  const uuidMatch = candidate.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)
  return uuidMatch ? uuidMatch[0] : candidate.replace(/^\/+|\/+$/g, "")
}

function isValidUuid(id: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
}

export default function MatchLinkerPage() {
  const [athleteId, setAthleteId] = useState("")
  const [searchResults, setSearchResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [linkingLoading, setLinkingLoading] = useState(false)
  const [normalizedId, setNormalizedId] = useState("")

  const searchMatches = async () => {
    const id = normalizeAthleteId(athleteId)
    if (!id || !isValidUuid(id)) {
      alert("Please enter a valid athlete ID (UUID).")
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`/api/debug/athlete-match-finder/${id}`)
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  const linkMatches = async (matchIds: string[]) => {
    const id = normalizeAthleteId(athleteId)
    if (!id || !isValidUuid(id)) {
      alert("Please enter a valid athlete ID (UUID) before linking matches.")
      return
    }

    setLinkingLoading(true)
    try {
      const response = await fetch("/api/admin/link-athlete-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: id,
          matchIds,
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert("Matches linked successfully!")
        // Refresh the search
        searchMatches()
      } else {
        alert("Error linking matches: " + result.error)
      }
    } catch (error) {
      console.error("Linking error:", error)
      alert("Error linking matches")
    } finally {
      setLinkingLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Match Linker Tool</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search for Athlete Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter Athlete ID"
              value={athleteId}
              onChange={(e) => {
                const v = e.target.value
                setAthleteId(v)
                setNormalizedId(normalizeAthleteId(v))
              }}
              className="flex-1"
            />
            <Button onClick={searchMatches} disabled={loading}>
              {loading ? "Searching..." : "Search Matches"}
            </Button>
          </div>
          {normalizedId && normalizedId !== athleteId && (
            <p className="mt-2 text-xs text-gray-500">Using ID: {normalizedId}</p>
          )}
        </CardContent>
      </Card>

      {searchResults && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Athlete Info</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                <strong>ID:</strong> {searchResults.athlete.id}
              </p>
              <p>
                <strong>Name:</strong> {searchResults.athlete.name}
              </p>
              <p>
                <strong>Parsed:</strong> {searchResults.athlete.firstName} | {searchResults.athlete.lastName}
              </p>
            </CardContent>
          </Card>

          {Object.entries(searchResults.searchResults).map(([strategy, results]) => (
            <Card key={strategy}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Strategy: {strategy}</span>
                  <span className="text-sm text-gray-500">{results.count || 0} matches found</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.error ? (
                  <p className="text-red-500">Error: {results.error}</p>
                ) : results.matches && results.matches.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      {results.matches.map((match) => (
                        <div key={match.id} className="border p-3 rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <p>
                                <strong>
                                  {match.first_name} {match.last_name}
                                </strong>
                              </p>
                              <p className="text-sm text-gray-600">ID: {match.wrestler_id}</p>
                              <p className="text-sm text-gray-600">
                                {match.season} {match.grade} • {match.high_school}
                              </p>
                              <p className="text-sm text-gray-600">
                                Record: {match.wins}-{match.losses} ({match.total_matches} matches)
                              </p>
                            </div>
                            <Button size="sm" onClick={() => linkMatches([match.id])} disabled={linkingLoading}>
                              Link This Match
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {results.matches.length > 1 && (
                      <Button
                        onClick={() => linkMatches(results.matches.map((m) => m.id))}
                        disabled={linkingLoading}
                        className="w-full"
                      >
                        Link All {results.matches.length} Matches
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No matches found with this strategy</p>
                )}
              </CardContent>
            </Card>
          ))}

          {searchResults.similarNames && searchResults.similarNames.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Similar Names Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {searchResults.similarNames.map((name, index) => (
                    <div key={index} className="border p-2 rounded text-sm">
                      <strong>
                        {name.first_name} {name.last_name}
                      </strong>{" "}
                      - {name.wrestler_id}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
