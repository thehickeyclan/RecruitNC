"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy } from "lucide-react"

interface MatchResult {
  id: string
  opponent_name: string
  result: "Win" | "Loss"
  method: string
  tournament_name?: string
  date: string
  year: number
}

interface MatchResultsByYearProps {
  athleteId: string
  athleteName: string
  graduationYear?: number
}

export function MatchResultsByYear({ athleteId, athleteName, graduationYear }: MatchResultsByYearProps) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number | "career">("career")

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch(`/api/athletes/${athleteId}/matches-direct`)
        if (response.ok) {
          const data = await response.json()
          setMatches(data.matches || [])
        }
      } catch (error) {
        console.error("Error fetching matches:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [athleteId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>High School Career Match Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>High School Career Match Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No match results available.</p>
        </CardContent>
      </Card>
    )
  }

  // Filter matches based on selected year
  const filteredMatches = selectedYear === "career" ? matches : matches.filter((match) => match.year === selectedYear)

  // Calculate statistics - FIXED CALCULATION
  const wins = filteredMatches.filter((match) => match.result === "Win").length
  const losses = filteredMatches.filter((match) => match.result === "Loss").length
  const totalMatches = wins + losses

  // FIXED: Correct win percentage calculation
  const winPercentage = totalMatches > 0 ? (wins / totalMatches) * 100 : 0

  // Count pins and tech falls
  const pins = filteredMatches.filter(
    (match) =>
      match.result === "Win" &&
      (match.method?.toLowerCase().includes("pin") || match.method?.toLowerCase().includes("fall")),
  ).length

  const techFalls = filteredMatches.filter(
    (match) =>
      match.result === "Win" &&
      (match.method?.toLowerCase().includes("tech") || match.method?.toLowerCase().includes("technical")),
  ).length

  // Get available years
  const availableYears = [...new Set(matches.map((match) => match.year))].sort((a, b) => b - a)

  const getYearsOfHighSchool = () => {
    if (selectedYear === "career") {
      const yearsCount = availableYears.length
      if (yearsCount === 0) return "High School Wrestling"
      if (yearsCount === 1) return "One Year of Championship Wrestling"
      if (yearsCount === 2) return "Two Years of Championship Wrestling"
      if (yearsCount === 3) return "Three Years of Championship Wrestling"
      if (yearsCount === 4) return "Four Years of Championship Wrestling"
      return `${yearsCount} Years of Championship Wrestling`
    }
    return "Season Performance"
  }

  return (
    <div className="space-y-6">
      {/* Year Selection */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedYear("career")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedYear === "career" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Career
        </button>
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedYear === year ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Statistics Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">
              {selectedYear === "career" ? "HIGH SCHOOL CAREER EXCELLENCE" : `${selectedYear} SEASON RESULTS`}
            </h2>
            <p className="text-red-100">{getYearsOfHighSchool()}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {/* Career Record */}
            <div>
              <div className="text-4xl font-bold mb-2">
                {wins}-{losses}
              </div>
              <div className="text-red-100">Career Record</div>
            </div>

            {/* Win Percentage - FIXED DISPLAY */}
            <div>
              <div className="text-4xl font-bold mb-2 text-yellow-300">{winPercentage.toFixed(1)}%</div>
              <div className="text-red-100">Win Percentage</div>
            </div>

            {/* Pins */}
            <div>
              <div className="text-4xl font-bold mb-2">{pins}</div>
              <div className="text-red-100">Pins</div>
            </div>

            {/* Tech Falls */}
            <div>
              <div className="text-4xl font-bold mb-2">{techFalls}</div>
              <div className="text-red-100">Tech Falls</div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <Badge className="bg-blue-800 text-white px-4 py-2 text-lg">{totalMatches} Total Matches</Badge>
            {graduationYear && (
              <Badge className="bg-yellow-600 text-white px-4 py-2 text-lg">Class of {graduationYear}</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Detailed Match Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {selectedYear === "career" ? "All Match Results" : `${selectedYear} Match Results`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredMatches.length === 0 ? (
              <p className="text-gray-600">No matches found for the selected period.</p>
            ) : (
              filteredMatches
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((match) => (
                  <div
                    key={match.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      match.result === "Win" ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            className={match.result === "Win" ? "bg-green-600 text-white" : "bg-red-600 text-white"}
                          >
                            {match.result}
                          </Badge>
                          <span className="font-medium">vs {match.opponent_name}</span>
                        </div>
                        <p className="text-sm text-gray-600">Method: {match.method || "Not specified"}</p>
                        {match.tournament_name && (
                          <p className="text-sm text-gray-600">Tournament: {match.tournament_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{new Date(match.date).toLocaleDateString()}</p>
                        <p className="text-sm font-medium text-gray-700">{match.year}</p>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
