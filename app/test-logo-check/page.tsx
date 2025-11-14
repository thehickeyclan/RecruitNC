"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestLogoCheck() {
  const [entityName, setEntityName] = useState("")
  const [entityType, setEntityType] = useState("highschool")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testLogoCheck = async () => {
    if (!entityName.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/check-entity-logos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: [{ name: entityName.trim(), type: entityType }],
        }),
      })

      const data = await response.json()
      setResults(data)
      console.log("Logo check results:", data)
    } catch (error) {
      console.error("Error:", error)
      setResults({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Logo Check System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Entity Name</label>
            <Input
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="e.g., Lumberton, Cardinal Gibbons"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="highschool">High School</option>
              <option value="college">College</option>
              <option value="club">Club</option>
            </select>
          </div>

          <Button onClick={testLogoCheck} disabled={loading || !entityName.trim()}>
            {loading ? "Checking..." : "Check Logo"}
          </Button>

          {results && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Results:</h3>
              <pre className="text-sm overflow-auto">{JSON.stringify(results, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            onClick={() => {
              setEntityName("Lumberton")
              setEntityType("highschool")
            }}
          >
            Test Lumberton High School
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEntityName("The Apprentice School")
              setEntityType("college")
            }}
          >
            Test The Apprentice School
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEntityName("Cardinal Gibbons")
              setEntityType("highschool")
            }}
          >
            Test Cardinal Gibbons (Should Exist)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
