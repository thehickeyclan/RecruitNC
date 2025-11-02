"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AddEventDataColumn() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runScript = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/add-event-data-to-user-analytics", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to run script")
        return
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Add Event Data Column</CardTitle>
          <CardDescription>
            This will add an event_data JSONB column to the user_analytics table for storing additional event
            information like athlete card views.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold">What this adds:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• event_data JSONB column for flexible event data storage</li>
              <li>• GIN index on event_data for fast JSON queries</li>
              <li>• Index on event_type for better filtering performance</li>
              <li>• Support for tracking card views, clicks, and interactions</li>
            </ul>
          </div>

          <Button onClick={runScript} disabled={loading}>
            {loading ? "Running..." : "Add Event Data Column"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
