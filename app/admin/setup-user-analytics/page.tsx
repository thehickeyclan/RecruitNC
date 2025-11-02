"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SetupUserAnalytics() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const createTable = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/create-user-analytics-table", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message || "Table created successfully" })
      } else {
        setResult({ success: false, message: data.error || "Failed to create table" })
      }
    } catch (error) {
      setResult({ success: false, message: "Network error occurred" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Setup User Analytics</CardTitle>
          <CardDescription>Create the database table needed for tracking user page views and activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            This will create:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>user_analytics table for storing page view data</li>
              <li>Proper indexes for performance</li>
              <li>Row Level Security policies</li>
              <li>Admin-only access permissions</li>
            </ul>
          </div>

          <Button onClick={createTable} disabled={loading} className="w-full">
            {loading ? "Creating Table..." : "Create Analytics Table"}
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          {result?.success && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800">Next Steps:</h3>
              <ul className="list-disc list-inside mt-2 text-sm text-green-700">
                <li>
                  Visit <code>/admin/user-analytics</code> to view analytics dashboard
                </li>
                <li>Page views will be tracked automatically for logged-in users</li>
                <li>
                  Add client-side tracking by calling <code>trackPageView()</code> in components
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
