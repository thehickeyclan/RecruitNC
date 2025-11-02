"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EntityLogo } from "@/components/entity-logo"
import { FixedEntityLogo } from "@/components/fixed-entity-logo"
import { CommitmentCard } from "@/components/commitment-card"
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface TestResult {
  entity: string
  type: string
  searchedTypes: string[]
  exactMatch: any
  partialMatch: any
  broadMatch: any
  error: string | null
}

interface TestData {
  success: boolean
  results: TestResult[]
  stats: {
    totalMappings: number
    byType: Record<string, number>
  }
  timestamp: string
}

export default function LogoMatchingTest() {
  const [data, setData] = useState<TestData | null>(null)
  const [loading, setLoading] = useState(false)
  const [apiTests, setApiTests] = useState<Record<string, any>>({})

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/logo-matching-test")
      const result = await response.json()
      setData(result)
      console.log("Logo matching test results:", result)
    } catch (error) {
      console.error("Failed to load test data:", error)
    } finally {
      setLoading(false)
    }
  }

  const testApiDirectly = async (type: string, name: string) => {
    try {
      const response = await fetch(`/api/logo-mappings/${type}/${encodeURIComponent(name)}`)
      const result = await response.json()
      setApiTests((prev) => ({
        ...prev,
        [`${type}:${name}`]: result,
      }))
      return result
    } catch (error) {
      console.error(`API test failed for ${type}:${name}`, error)
      return { success: false, error: "Network error" }
    }
  }

  useEffect(() => {
    loadData()

    // Test key APIs directly
    const testEntities = [
      { type: "college", name: "Appalachian State" },
      { type: "college", name: "Appalachian State University" },
      { type: "highschool", name: "Hickory Ridge" },
      { type: "highschool", name: "Cardinal Gibbons" },
    ]

    testEntities.forEach((entity) => {
      testApiDirectly(entity.type, entity.name)
    })
  }, [])

  const getResultIcon = (result: TestResult) => {
    if (result.exactMatch || result.partialMatch || result.broadMatch) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  const getMatchInfo = (result: TestResult) => {
    if (result.exactMatch) {
      return {
        type: "Exact Match",
        data: result.exactMatch,
        color: "bg-green-50 text-green-700 border-green-200",
      }
    }
    if (result.partialMatch) {
      return {
        type: "Partial Match",
        data: result.partialMatch,
        color: "bg-yellow-50 text-yellow-700 border-yellow-200",
      }
    }
    if (result.broadMatch) {
      return {
        type: "Broad Match",
        data: result.broadMatch,
        color: "bg-blue-50 text-blue-700 border-blue-200",
      }
    }
    return null
  }

  // Sample athlete data for testing cards
  const sampleAthletes = [
    {
      id: "test-1",
      name: "Test Athlete 1",
      graduation_year: 2025,
      college: "Appalachian State University",
      division: "Division I",
      weight_class: 165,
      high_school: "Hickory Ridge",
      club: "NC United Wrestling",
      image_url: "/wrestler-profile.png",
    },
    {
      id: "test-2",
      name: "Test Athlete 2",
      graduation_year: 2025,
      college: "Appalachian State",
      division: "Division I",
      weight_class: 174,
      high_school: "Cardinal Gibbons",
      club: "Triangle Wrestling Club",
      image_url: "/wrestler-profile.png",
    },
  ]

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin mr-2" />
          <span>Running logo matching tests...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Logo Matching Test</h1>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Tests
        </Button>
      </div>

      {/* Database Stats */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Database Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.stats.totalMappings}</div>
                <div className="text-sm text-gray-600">Total Mappings</div>
              </div>
              {Object.entries(data.stats.byType).map(([type, count]) => (
                <div key={type} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600 capitalize">{type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>API Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(apiTests).map(([key, result]) => {
              const [type, name] = key.split(":")
              return (
                <div key={key} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">
                      {type}: {name}
                    </div>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "✅ Found" : "❌ Not Found"}
                    </Badge>
                  </div>
                  {result.success && result.logo_url && (
                    <div className="text-sm text-gray-600">
                      <div>URL: {result.logo_url}</div>
                      <div>
                        Matched: {result.matched_name} ({result.matched_type})
                      </div>
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer">Raw API Response</summary>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Database Query Results */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Database Query Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.results.map((result, index) => {
                const matchInfo = getMatchInfo(result)
                return (
                  <div key={index} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getResultIcon(result)}
                        <div>
                          <div className="font-medium">{result.entity}</div>
                          <div className="text-sm text-gray-600">Type: {result.type}</div>
                        </div>
                      </div>
                      {matchInfo && <Badge className={matchInfo.color}>{matchInfo.type}</Badge>}
                    </div>

                    {matchInfo && (
                      <div className="bg-gray-50 rounded p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={matchInfo.data.logo_url || "/placeholder.svg"}
                            alt={matchInfo.data.entity_name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />
                          <span className="font-medium">{matchInfo.data.entity_name}</span>
                          <span className="text-sm text-gray-600">({matchInfo.data.entity_type})</span>
                        </div>
                        <div className="text-xs text-gray-500">{matchInfo.data.logo_url}</div>
                      </div>
                    )}

                    <div className="text-sm text-gray-600">
                      <div>Searched types: {result.searchedTypes.join(", ")}</div>
                      {result.error && <div className="text-red-600 mt-1">Error: {result.error}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Logo Component Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">EntityLogo Component</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 border rounded">
                  <EntityLogo entityType="college" entityName="Appalachian State" size="md" />
                  <span>Appalachian State (college)</span>
                </div>
                <div className="flex items-center gap-3 p-2 border rounded">
                  <EntityLogo entityType="college" entityName="Appalachian State University" size="md" />
                  <span>Appalachian State University (college)</span>
                </div>
                <div className="flex items-center gap-3 p-2 border rounded">
                  <EntityLogo entityType="highschool" entityName="Hickory Ridge" size="md" />
                  <span>Hickory Ridge (highschool)</span>
                </div>
                <div className="flex items-center gap-3 p-2 border rounded">
                  <EntityLogo entityType="highschool" entityName="Cardinal Gibbons" size="md" />
                  <span>Cardinal Gibbons (highschool)</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">FixedEntityLogo Component</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 border rounded">
                  <FixedEntityLogo entityType="college" entityName="Appalachian State" size="md" />
                  <span>Appalachian State (college)</span>
                </div>
                <div className="flex items-center gap-3 p-2 border rounded">
                  <FixedEntityLogo entityType="college" entityName="Appalachian State University" size="md" />
                  <span>Appalachian State University (college)</span>
                </div>
                <div className="flex items-center gap-3 p-2 border rounded">
                  <FixedEntityLogo entityType="highschool" entityName="Hickory Ridge" size="md" />
                  <span>Hickory Ridge (highschool)</span>
                </div>
                <div className="flex items-center gap-3 p-2 border rounded">
                  <FixedEntityLogo entityType="highschool" entityName="Cardinal Gibbons" size="md" />
                  <span>Cardinal Gibbons (highschool)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Commitment Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sampleAthletes.map((athlete) => (
              <div key={athlete.id} className="max-w-sm">
                <CommitmentCard athlete={athlete} showFlip={false} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Test completed at {new Date(data.timestamp).toLocaleString()}. Check the console for detailed logging
            information.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
