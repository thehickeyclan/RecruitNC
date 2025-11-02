"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SimpleAthletesTest() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)

  const testFetch = async () => {
    setLoading(true)
    setError(null)
    setRawResponse(null)

    try {
      console.log("Fetching athletes...")
      const response = await fetch("/api/athletes")
      const data = await response.json()
      
      console.log("Response:", data)
      setRawResponse(data)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`)
      }

      if (data.success) {
        setAthletes(data.athletes || [])
      } else {
        throw new Error(data.error || "API returned success: false")
      }
    } catch (err) {
      console.error("Fetch error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testFetch()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Simple Athletes Test</CardTitle>
          <CardDescription>
            Direct test of the athletes API without authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testFetch} disabled={loading} className="mb-6">
            {loading ? "Testing..." : "Test Athletes API"}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {rawResponse && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Raw API Response</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">
                {JSON.stringify(rawResponse, null, 2)}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800">Total Athletes</h3>
              <p className="text-2xl font-bold text-blue-600">{athletes.length}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800">With Colleges</h3>
              <p className="text-2xl font-bold text-green-600">
                {athletes.filter(a => a.college && a.college.trim() !== "").length}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800">Loading State</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {loading ? "Loading..." : "Complete"}
              </p>
            </div>
          </div>

          {athletes.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-4">Sample Athletes</h3>
              <div className="space-y-2">
                {athletes.slice(0, 5).map((athlete, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded border">
                    <div className="font-medium">{athlete.name}</div>
                    <div className="text-sm text-gray-600">
                      {athlete.college} • {athlete.highschool || athlete.high_school}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
