"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CheckDatabaseStructure() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-database-structure")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error checking database:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkDatabase()
  }, [])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Database Structure Check</h1>

      <Button onClick={checkDatabase} disabled={loading} className="mb-4">
        {loading ? "Checking..." : "Refresh Check"}
      </Button>

      {data && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {data.availableColumns?.map((col: string) => (
                  <div key={col} className="bg-gray-100 p-2 rounded text-sm">
                    {col}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Athlete Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(data.sampleAthlete, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Division Values in Database</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.uniqueDivisions?.map((division: string) => (
                  <div key={division} className="bg-gray-100 p-2 rounded text-sm">
                    "{division}"
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
