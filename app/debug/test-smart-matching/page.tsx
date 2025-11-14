"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

export default function TestSmartMatching() {
  const [entityName, setEntityName] = useState("")
  const [entityType, setEntityType] = useState("club")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    if (!entityName.trim()) {
      setError("Please enter an entity name")
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      console.log("Testing smart matching for:", { entityName, entityType })

      const response = await fetch("/api/logo-mappings/smart-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityName: entityName.trim(),
          entityType,
        }),
      })

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Non-JSON response:", text)
        throw new Error(`Expected JSON response, got: ${contentType}. Response: ${text.substring(0, 200)}...`)
      }

      const data = await response.json()
      console.log("Smart matching response:", data)

      setResults(data)

      if (!data.success) {
        setError(data.error || "No match found")
      }
    } catch (err) {
      console.error("Smart matching test error:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const testCases = [
    { name: "Darkhorse Wrestling Club", type: "club" },
    { name: "darkhorse", type: "club" },
    { name: "Dark Horse", type: "club" },
    { name: "RAW Wrestling Club", type: "club" },
    { name: "raw", type: "club" },
    { name: "Cardinal Gibbons", type: "highschool" },
    { name: "UNC Chapel Hill", type: "college" },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>🧠 Smart Logo Matching Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Test the smart logo matching system. It uses fuzzy matching, aliases, and partial matches to find the best
            logo for any entity name.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="entity-name">Entity Name</Label>
              <Input
                id="entity-name"
                placeholder="e.g., Darkhorse, RAW, Cardinal Gibbons"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleTest()}
              />
            </div>

            <div>
              <Label htmlFor="entity-type">Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="club">Wrestling Club</SelectItem>
                  <SelectItem value="highschool">High School</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleTest} disabled={loading} className="w-full">
                {loading ? "Testing..." : "Test Match"}
              </Button>
            </div>
          </div>

          {/* Quick Test Cases */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Quick Test Cases:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {testCases.map((testCase, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEntityName(testCase.name)
                    setEntityType(testCase.type)
                  }}
                >
                  {testCase.name} ({testCase.type})
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">❌ {error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Results for "{entityName}" ({entityType})
              {results.success ? (
                <Badge className="bg-green-500">Match Found</Badge>
              ) : (
                <Badge variant="destructive">No Match</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.success && results.match ? (
              <div className="space-y-4">
                {/* Logo Display */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Image
                      src={results.match.logoUrl || "/placeholder.svg"}
                      alt={results.match.entityName}
                      width={64}
                      height={64}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{results.match.entityName}</h3>
                    <p className="text-sm text-gray-600">{results.match.reasoning}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{results.match.matchType}</Badge>
                      <Badge className="bg-blue-500">{results.match.confidence}% confidence</Badge>
                    </div>
                  </div>
                </div>

                {/* Match Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Match Type</Label>
                    <p className="text-sm text-gray-600 capitalize">{results.match.matchType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Confidence Score</Label>
                    <p className="text-sm text-gray-600">{results.match.confidence}%</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Matched Entity</Label>
                    <p className="text-sm text-gray-600">{results.match.entityName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Logo URL</Label>
                    <p className="text-sm text-gray-600 truncate">{results.match.logoUrl}</p>
                  </div>
                </div>

                {/* Reasoning */}
                <div>
                  <Label className="text-sm font-medium">Match Reasoning</Label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{results.match.reasoning}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No matching logo found for "{entityName}"</p>
                <p className="text-sm text-gray-400 mt-2">
                  Try a different spelling or check if the logo mapping exists in the database.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
