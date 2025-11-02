"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CreateMatchesFinal() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const createMatchesTable = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/create-matches-final", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to create matches table",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const testMatchesTable = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/create-matches-final", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to test matches table",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const copySQL = () => {
    if (result?.sql_to_run) {
      navigator.clipboard.writeText(result.sql_to_run)
      alert("SQL copied to clipboard!")
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🎯 Create Matches Table (Final)</CardTitle>
          <CardDescription>
            Now that we're connected to the right database, let's create the matches table properly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-500 bg-green-50">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">✅ Database Connection Validated!</p>
                <p className="text-sm">
                  Your API is now connected to the correct database. Let's create the matches table with sample data.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <Button onClick={createMatchesTable} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
            {loading ? "Checking..." : "🚀 Create Matches Table"}
          </Button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>This will:</p>
            <p>• Check if matches table exists</p>
            <p>• Provide SQL to create it if needed</p>
            <p>• Include sample data for Liam Hickey</p>
            <p>• Set up proper permissions and indexes</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🧪 Test Table Access</CardTitle>
          <CardDescription>After running the SQL, test that everything works</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testMatchesTable} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Test Matches Table Access"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{result.success ? "✅ Success" : "📋 Instructions"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.sql_to_run && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-medium">SQL to run in your dashboard:</p>
                  <Button onClick={copySQL} size="sm" variant="outline">
                    Copy SQL
                  </Button>
                </div>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                  {result.sql_to_run}
                </pre>
              </div>
            )}

            <div className="mt-4">
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
