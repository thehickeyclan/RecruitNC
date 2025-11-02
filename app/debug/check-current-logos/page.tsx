"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw } from "lucide-react"

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
  updated_at: string
}

interface TestResult {
  searchEntity: { name: string; type: string }
  exactMatch: LogoMapping | null
  exactError: string | null
  partialMatches: LogoMapping[]
  partialError: string | null
}

interface DatabaseState {
  success: boolean
  totalMappings: number
  typeCounts: Record<string, number>
  allMappings: LogoMapping[]
  testResults: TestResult[]
  hickoryRidgeMappings: LogoMapping[]
  appalachianStateMappings: LogoMapping[]
}

export default function CheckCurrentLogos() {
  const [data, setData] = useState<DatabaseState | null>(null)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-current-logos")
      const result = await response.json()
      setData(result)
      console.log("Database state:", result)
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin mr-2" />
          <span>Loading database state...</span>
        </div>
      </div>
    )
  }

  if (!data || !data.success) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600">Failed to load database state</p>
            <Button onClick={loadData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Current Logo Database State</h1>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data.totalMappings}</div>
            <div className="text-sm text-gray-600">Total Logo Mappings</div>
          </CardContent>
        </Card>
        {Object.entries(data.typeCounts).map(([type, count]) => (
          <Card key={type}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-gray-600 capitalize">{type} Logos</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hickory Ridge Mappings */}
      <Card>
        <CardHeader>
          <CardTitle>Hickory Ridge Mappings ({data.hickoryRidgeMappings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.hickoryRidgeMappings.length > 0 ? (
            <div className="space-y-2">
              {data.hickoryRidgeMappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <img
                      src={mapping.logo_url || "/placeholder.svg"}
                      alt={mapping.entity_name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                    <div>
                      <div className="font-medium">{mapping.entity_name}</div>
                      <div className="text-sm text-gray-600">{mapping.entity_type}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 max-w-md truncate">{mapping.logo_url}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No Hickory Ridge mappings found</p>
          )}
        </CardContent>
      </Card>

      {/* Appalachian State Mappings */}
      <Card>
        <CardHeader>
          <CardTitle>Appalachian State Mappings ({data.appalachianStateMappings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.appalachianStateMappings.length > 0 ? (
            <div className="space-y-2">
              {data.appalachianStateMappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <img
                      src={mapping.logo_url || "/placeholder.svg"}
                      alt={mapping.entity_name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                    <div>
                      <div className="font-medium">{mapping.entity_name}</div>
                      <div className="text-sm text-gray-600">{mapping.entity_type}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 max-w-md truncate">{mapping.logo_url}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No Appalachian State mappings found</p>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Logo Matching Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.testResults.map((result, index) => (
              <div key={index} className="border rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    {result.searchEntity.type}: "{result.searchEntity.name}"
                  </h3>
                  <Badge variant={result.exactMatch ? "default" : "destructive"}>
                    {result.exactMatch ? "Exact Match Found" : "No Exact Match"}
                  </Badge>
                </div>

                {result.exactMatch && (
                  <div className="mb-3 p-2 bg-green-50 rounded">
                    <div className="flex items-center gap-2">
                      <img
                        src={result.exactMatch.logo_url || "/placeholder.svg"}
                        alt={result.exactMatch.entity_name}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                      <span className="font-medium">{result.exactMatch.entity_name}</span>
                      <span className="text-sm text-gray-600">({result.exactMatch.entity_type})</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{result.exactMatch.logo_url}</div>
                  </div>
                )}

                {result.partialMatches.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium mb-2">Partial Matches ({result.partialMatches.length}):</div>
                    <div className="space-y-1">
                      {result.partialMatches.map((match) => (
                        <div key={match.id} className="flex items-center gap-2 text-sm p-1 bg-yellow-50 rounded">
                          <img
                            src={match.logo_url || "/placeholder.svg"}
                            alt={match.entity_name}
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />
                          <span>{match.entity_name}</span>
                          <span className="text-gray-500">({match.entity_type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.exactError && (
                  <div className="text-red-600 text-sm">Exact Match Error: {result.exactError}</div>
                )}
                {result.partialError && (
                  <div className="text-red-600 text-sm">Partial Match Error: {result.partialError}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Mappings (First 20) */}
      <Card>
        <CardHeader>
          <CardTitle>All Logo Mappings (First 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.allMappings.slice(0, 20).map((mapping) => (
              <div key={mapping.id} className="flex items-center justify-between p-2 border rounded text-sm">
                <div className="flex items-center gap-2">
                  <img
                    src={mapping.logo_url || "/placeholder.svg"}
                    alt={mapping.entity_name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                  <span className="font-medium">{mapping.entity_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {mapping.entity_type}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 max-w-md truncate">{mapping.logo_url}</div>
              </div>
            ))}
            {data.allMappings.length > 20 && (
              <div className="text-center text-gray-500 text-sm">
                ... and {data.allMappings.length - 20} more mappings
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
