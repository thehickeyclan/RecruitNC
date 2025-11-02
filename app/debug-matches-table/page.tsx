"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugMatchesTable() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const response = await fetch("/api/debug-matches-table")
        const data = await response.json()
        setDebugInfo(data)
      } catch (error) {
        console.error("Failed to fetch debug info:", error)
        setDebugInfo({ error: "Failed to fetch debug info" })
      } finally {
        setLoading(false)
      }
    }

    fetchDebugInfo()
  }, [])

  if (loading) {
    return <div className="p-6">Loading debug info...</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Debug Matches Table</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test 1: Direct Table Query</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo?.test1_direct_query, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test 2: SQL Check for Matches Table</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo?.test2_sql_check, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test 3: All Tables in Public Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo?.test3_all_tables, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {debugInfo?.error && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-red-50 p-4 rounded text-sm overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
