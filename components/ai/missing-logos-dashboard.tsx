"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RefreshCw, Users, Search, Clock } from "lucide-react"

interface MissingLogoEntity {
  name: string
  type: "college" | "high_school" | "club"
  wrestlerCount: number
  priority: "high" | "medium" | "low"
  searchSuggestions: string[]
  sampleWrestlers: string[]
}

interface MissingLogosResult {
  entities: MissingLogoEntity[]
  totalMissing: number
  totalWrestlersAffected: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  processingTime: number
  lastUpdated: string
}

export function MissingLogosDashboard() {
  const [data, setData] = useState<MissingLogosResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMissingLogos = async (refresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ai/missing-logos?refresh=${refresh}`)
      if (!response.ok) {
        throw new Error("Failed to fetch missing logos")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMissingLogos()
  }, [])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return "🔴"
      case "medium":
        return "🟡"
      case "low":
        return "⚪"
      default:
        return "⚪"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "college":
        return "College"
      case "high_school":
        return "High School"
      case "club":
        return "Wrestling Club"
      default:
        return type
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Missing Logos
        </CardTitle>
        <CardDescription>Organizations without logos, prioritized by wrestler count</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {data && (
              <>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {data.totalMissing} missing
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {data.totalWrestlersAffected} affected
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {data.processingTime}ms
                </div>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchMissingLogos(true)} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-md">
              <div className="text-xl font-bold text-red-600">{data.highPriority}</div>
              <div className="text-xs text-red-600">High Priority</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-md">
              <div className="text-xl font-bold text-yellow-600">{data.mediumPriority}</div>
              <div className="text-xs text-yellow-600">Medium Priority</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <div className="text-xl font-bold text-gray-600">{data.lowPriority}</div>
              <div className="text-xs text-gray-600">Low Priority</div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}

        {/* Missing Logos List */}
        {data && data.entities && data.entities.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.entities.map((entity, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getPriorityIcon(entity.priority)}</span>
                      <h4 className="font-medium">{entity.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(entity.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {entity.wrestlerCount} wrestler{entity.wrestlerCount !== 1 ? "s" : ""}
                      </div>
                      <Badge className={`text-xs ${getPriorityColor(entity.priority)}`}>
                        {entity.priority} priority
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Sample Wrestlers */}
                {entity.sampleWrestlers && entity.sampleWrestlers.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Affected wrestlers:</p>
                    <p className="text-sm text-gray-700">
                      {entity.sampleWrestlers.join(", ")}
                      {entity.wrestlerCount > entity.sampleWrestlers.length &&
                        ` and ${entity.wrestlerCount - entity.sampleWrestlers.length} more`}
                    </p>
                  </div>
                )}

                {/* Search Suggestions */}
                {entity.searchSuggestions && entity.searchSuggestions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Search suggestions:</p>
                    <div className="flex flex-wrap gap-1">
                      {entity.searchSuggestions.map((suggestion, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          <Search className="h-2 w-2 mr-1" />
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : data && data.entities ? (
          <div className="text-center py-6 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No missing logos found!</p>
            <p className="text-sm">All organizations have logos assigned</p>
          </div>
        ) : null}

        {/* Feature Info */}
        {!data && !loading && (
          <div className="p-4 bg-orange-50 rounded-md">
            <h4 className="font-medium text-orange-900 mb-2">🔍 Missing Logo Detection</h4>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>• Scans all athletes to find organizations without logos</li>
              <li>• Prioritizes by wrestler count (High: 5+, Medium: 2-4, Low: 1)</li>
              <li>• Provides search suggestions and abbreviations</li>
              <li>• Updates every 30 minutes with intelligent caching</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
