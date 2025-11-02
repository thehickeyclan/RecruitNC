"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CheckCardinalGibbonsDatabase() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-cardinal-gibbons-database")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: "Failed to fetch data" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Cardinal Gibbons Database Check</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Investigation</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkDatabase} disabled={loading}>
            {loading ? "Checking..." : "Check Database"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Database Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">All Cardinal Gibbons Entries:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(result.cardinalGibbonsEntries, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">All High School Entity Types:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(result.highSchoolTypes, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Sample High School Entries:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(result.sampleHighSchools, null, 2)}
                </pre>
              </div>

              {result.error && (
                <div className="text-red-600">
                  <h3 className="font-semibold mb-2">Error:</h3>
                  <p>{result.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
