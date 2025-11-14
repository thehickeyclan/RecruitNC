"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CheckMatchesColumnsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/debug/check-matches-columns")
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error:", error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-8">Loading matches table structure...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Matches Table Structure</h1>

      {data?.success ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Columns ({data.totalColumns})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {data.columns.map((column: string) => (
                  <div key={column} className="bg-blue-50 p-2 rounded text-sm font-mono">
                    {column}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <pre className="text-xs bg-gray-100 p-4 rounded">{JSON.stringify(data.sampleData, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-red-600">Error: {data?.error}</p>
            {data?.details && <p className="text-sm text-gray-600 mt-2">{data.details}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
