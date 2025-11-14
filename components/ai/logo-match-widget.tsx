"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Zap, Clock, ImageIcon } from "lucide-react"

interface LogoMatch {
  logoPath: string
  confidence: number
  matchType: "exact" | "partial" | "fuzzy" | "abbreviation"
  reasoning: string
}

interface LogoMatchResult {
  query: string
  matches: LogoMatch[]
  processingTime: number
  cached: boolean
}

export function LogoMatchWidget() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LogoMatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchLogos = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ai/logo-match?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) {
        throw new Error("Failed to search logos")
      }

      const result = await response.json()
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchLogos(query)
  }

  const quickSearch = (term: string) => {
    setQuery(term)
    searchLogos(term)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800"
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return "🟢"
    if (confidence >= 60) return "🟡"
    return "🔴"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Logo Matching
        </CardTitle>
        <CardDescription>AI-powered logo search with confidence scoring</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for organization (e.g., UNC, Cardinal Gibbons, NC United)"
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !query.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Search Buttons */}
          <div className="flex flex-wrap gap-2">
            {["UNC", "NC State", "App State", "Campbell", "Cardinal Gibbons", "NC United"].map((term) => (
              <Button key={term} variant="outline" size="sm" onClick={() => quickSearch(term)} disabled={loading}>
                {term}
              </Button>
            ))}
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>{results.matches.length} matches found</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {results.processingTime}ms
                </div>
                {results.cached && (
                  <Badge variant="secondary" className="text-xs">
                    Cached
                  </Badge>
                )}
              </div>
            </div>

            {/* Match Results */}
            {results.matches.length > 0 ? (
              <div className="space-y-3">
                {results.matches.map((match, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={match.logoPath || "/placeholder.svg"}
                          alt="Logo"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                            target.nextElementSibling?.classList.remove("hidden")
                          }}
                        />
                        <ImageIcon className="h-6 w-6 text-gray-400 hidden" />
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getConfidenceIcon(match.confidence)}</span>
                        <span className="font-medium truncate">{match.logoPath.split("/").pop()}</span>
                        <Badge className={`text-xs ${getConfidenceColor(match.confidence)}`}>{match.confidence}%</Badge>
                        <Badge variant="outline" className="text-xs">
                          {match.matchType}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{match.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No logos found for "{results.query}"</p>
                <p className="text-sm">Try a different search term or abbreviation</p>
              </div>
            )}
          </div>
        )}

        {/* Feature Info */}
        {!results && !loading && (
          <div className="p-4 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">🎯 Smart Logo Matching</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Exact matches for known organizations</li>
              <li>• Fuzzy search with confidence scoring</li>
              <li>• Abbreviation recognition (UNC, NCSU, etc.)</li>
              <li>• 24-hour intelligent caching for performance</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
