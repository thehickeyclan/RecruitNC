"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CountTables() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const countTables = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/count-tables")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to count tables",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Database Table Count</CardTitle>
          <CardDescription>Let's see how many tables are in your app's database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={countTables} disabled={loading} className="w-full">
            {loading ? "Counting..." : "Count Tables in App Database"}
          </Button>

          {result && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">{result.success ? "✅ Success" : "❌ Failed"}</div>

              {result.success && (
                <div className="space-y-4">
                  <div className="text-lg font-bold">Total Tables: {result.table_count}</div>

                  {result.tables && result.tables.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">All Tables:</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {result.tables.map((table: string, index: number) => (
                          <div key={index} className="bg-gray-100 p-2 rounded text-sm">
                            {table}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 mt-4">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
