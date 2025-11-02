"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Lightbulb, TrendingUp, TrendingDown, Brain, CheckCircle, X } from "lucide-react"
import { toast } from "sonner"
import { AdminHeader } from "@/components/admin-header"

interface RankingSuggestion {
  athlete_id: string
  athlete_name: string
  current_ranking: number | null
  suggested_ranking: number
  confidence_score: number
  reasoning: string[]
  match_performance: any
  academic_metrics: any
}

export default function RankingSuggestionsPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2025")
  const [selectedGender, setSelectedGender] = useState<string>("Male")
  const [suggestions, setSuggestions] = useState<RankingSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)

  const availableYears = ["2025", "2026", "2027", "2028"]
  const genderOptions = ["Male", "Female"]

  useEffect(() => {
    fetchSuggestions()
  }, [selectedYear, selectedGender])

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/rankings/suggestions?year=${selectedYear}&gender=${selectedGender}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      toast.error("Failed to load ranking suggestions")
    } finally {
      setLoading(false)
    }
  }

  const applySuggestion = async (suggestion: RankingSuggestion) => {
    try {
      setApplying(suggestion.athlete_id)

      // Apply the suggested ranking
      const response = await fetch("/api/admin/prospects/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rankings: [
            {
              id: suggestion.athlete_id,
              prospect_ranking: suggestion.suggested_ranking,
            },
          ],
          year: selectedYear,
          gender: selectedGender,
        }),
      })

      if (response.ok) {
        toast.success(`Applied ranking #${suggestion.suggested_ranking} for ${suggestion.athlete_name}`)
        fetchSuggestions() // Refresh suggestions
      } else {
        throw new Error("Failed to apply suggestion")
      }
    } catch (error) {
      console.error("Error applying suggestion:", error)
      toast.error("Failed to apply ranking suggestion")
    } finally {
      setApplying(null)
    }
  }

  const getRankingChangeIcon = (current: number | null, suggested: number) => {
    if (!current) return <TrendingUp className="h-4 w-4 text-blue-500" />
    if (suggested < current) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (suggested > current) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <CheckCircle className="h-4 w-4 text-gray-500" />
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-100"
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Analyzing prospects and generating suggestions...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            AI Ranking Suggestions
          </h1>
          <p className="text-gray-600">
            Automated ranking suggestions based on match performance, academic metrics, and achievements
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      Class of {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={fetchSuggestions} variant="outline">
                Refresh Suggestions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions */}
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No significant ranking suggestions found</p>
                <p className="text-sm text-gray-400 mt-2">
                  Current rankings appear to be well-aligned with performance data
                </p>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((suggestion) => (
              <Card key={suggestion.athlete_id}>
                <CardContent className="py-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{suggestion.athlete_name}</h3>
                        <div className="flex items-center gap-2">
                          {getRankingChangeIcon(suggestion.current_ranking, suggestion.suggested_ranking)}
                          <span className="text-sm text-gray-600">
                            {suggestion.current_ranking ? `#${suggestion.current_ranking}` : "Unranked"} →{" "}
                            <span className="font-semibold">#{suggestion.suggested_ranking}</span>
                          </span>
                        </div>
                        <Badge className={`text-xs ${getConfidenceColor(suggestion.confidence_score)}`}>
                          {(suggestion.confidence_score * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">Confidence Score:</span>
                          <Progress value={suggestion.confidence_score * 100} className="w-32 h-2" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Analysis:</h4>
                        <ul className="space-y-1">
                          {suggestion.reasoning.map((reason, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Performance Metrics */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                        {suggestion.match_performance && (
                          <div>
                            <h5 className="font-medium text-xs text-gray-700 mb-1">Match Performance</h5>
                            <p className="text-xs text-gray-600">
                              Record: {suggestion.match_performance.wins}-{suggestion.match_performance.losses}
                              {suggestion.match_performance.pin_percentage && (
                                <span> • {suggestion.match_performance.pin_percentage.toFixed(1)}% pins</span>
                              )}
                            </p>
                          </div>
                        )}
                        {suggestion.academic_metrics.gpa && (
                          <div>
                            <h5 className="font-medium text-xs text-gray-700 mb-1">Academic</h5>
                            <p className="text-xs text-gray-600">
                              GPA: {suggestion.academic_metrics.gpa.toFixed(2)}
                              {suggestion.academic_metrics.sat && (
                                <span> • SAT: {suggestion.academic_metrics.sat}</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => applySuggestion(suggestion)}
                        disabled={applying === suggestion.athlete_id}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {applying === suggestion.athlete_id ? "Applying..." : "Apply"}
                      </Button>
                      <Button variant="outline" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
