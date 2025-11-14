"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CheckSubmissionsTable() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkTable = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-submissions-table")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Check Submissions Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkTable} disabled={loading}>
            {loading ? "Checking..." : "Check Table Status"}
          </Button>

          {result && (
            <div className="bg-gray-100 p-4 rounded">
              <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
