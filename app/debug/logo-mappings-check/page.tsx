"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
}

export default function LogoMappingsCheck() {
  const [mappings, setMappings] = useState<LogoMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchMappings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/debug/logo-mappings-detailed")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch mappings")
      }

      console.log("Fetched data:", data)

      // Ensure we have an array
      const mappingsArray = Array.isArray(data.all_mappings) ? data.all_mappings : []
      setMappings(mappingsArray)
    } catch (error) {
      console.error("Error fetching mappings:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const testSpecificLogos = async () => {
    const testCases = [
      { type: "college", name: "UNC Chapel Hill" },
      { type: "college", name: "NC State" },
      { type: "college", name: "Appalachian State" },
      { type: "highschool", name: "Cardinal Gibbons" },
      { type: "highschool", name: "Cary High School" },
      { type: "club", name: "NC United" },
    ]

    const results = []
    for (const testCase of testCases) {
      try {
        const response = await fetch(
          `/api/logo-mappings/by-entity/${testCase.type}/${encodeURIComponent(testCase.name)}`,
        )
        const data = await response.json()
        results.push({
          ...testCase,
          success: data.success,
          logo_url: data.logo_url,
          error: data.error,
          matched_entity_type: data.matched_entity_type,
          tried_types: data.tried_types,
        })
      } catch (error) {
        results.push({
          ...testCase,
          success: false,
          error: error.message,
        })
      }
    }
    setTestResults(results)
  }

  useEffect(() => {
    fetchMappings()
  }, [])

  // Safely group mappings
  const groupedMappings = Array.isArray(mappings)
    ? mappings.reduce(
        (acc, mapping) => {
          if (!acc[mapping.entity_type]) {
            acc[mapping.entity_type] = []
          }
          acc[mapping.entity_type].push(mapping)
          return acc
        },
        {} as Record<string, LogoMapping[]>,
      )
    : {}

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Logo Mappings Debug</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">
              <h3 className="font-bold">Error:</h3>
              <p>{error}</p>
            </div>
            <Button onClick={fetchMappings} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Logo Mappings Debug</h1>

      <div className="mb-6">
        <Button onClick={testSpecificLogos} className="mr-4">
          Test Specific Logos
        </Button>
        <Button onClick={fetchMappings} disabled={loading}>
          {loading ? "Loading..." : "Refresh Mappings"}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Total mappings found: {mappings.length}</p>
          <p>Entity types: {Object.keys(groupedMappings).join(", ") || "None"}</p>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className={`p-2 rounded ${result.success ? "bg-green-100" : "bg-red-100"}`}>
                  <strong>
                    {result.type} - {result.name}:
                  </strong>
                  {result.success ? (
                    <div className="text-green-600 ml-2">
                      ✅ Found: {result.logo_url}
                      <br />
                      <small>Matched type: {result.matched_entity_type}</small>
                    </div>
                  ) : (
                    <div className="text-red-600 ml-2">
                      ❌ {result.error}
                      <br />
                      <small>Tried types: {result.tried_types?.join(", ")}</small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {Object.entries(groupedMappings).map(([entityType, typeMappings]) => (
          <Card key={entityType}>
            <CardHeader>
              <CardTitle>
                {entityType} ({typeMappings.length} mappings)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {typeMappings.slice(0, 10).map((mapping) => (
                  <div key={mapping.id} className="flex items-center space-x-4 p-2 border rounded">
                    <img
                      src={mapping.logo_url || "/placeholder.svg"}
                      alt={mapping.entity_name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=32&width=32"
                      }}
                    />
                    <div>
                      <div className="font-medium">{mapping.entity_name}</div>
                      <div className="text-sm text-gray-500">{mapping.logo_url}</div>
                    </div>
                  </div>
                ))}
                {typeMappings.length > 10 && (
                  <div className="text-sm text-gray-500">... and {typeMappings.length - 10} more</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Raw Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(
              {
                total_mappings: mappings.length,
                entity_types: Object.keys(groupedMappings),
                sample_data: mappings.slice(0, 3),
              },
              null,
              2,
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
