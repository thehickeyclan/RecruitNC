"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CreateMatchesInCorrectDB() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const createMatchesTable = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/create-matches-correct-db", {
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
      const response = await fetch("/api/debug/create-matches-correct-db", {
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

  const uploadSampleData = async () => {
    setLoading(true)
    try {
      const sampleData = {
        wrestler_id: "liam_hickey_2025",
        first_name: "Liam",
        last_name: "Hickey",
        season: "2024-25",
        grade: "12",
        high_school: "Cardinal Gibbons",
        total_matches: 25,
        wins: 22,
        losses: 3,
        pins: 15,
        tech_falls: 4,
        decisions: 3,
        major_decisions: 0,
        forfeits_won: 0,
        pin_percentage: 68.18,
        tf_percentage: 18.18,
        finishing_percentage: 86.36,
        matches: [
          {
            date: "2024-12-01",
            opponent: "John Smith",
            opponent_school: "Test High School",
            result: "Win",
            method: "Pin",
            time: "2:15",
            weight: 157,
            venue: "Cardinal Gibbons Duals",
            win_loss: "W",
            opponent_percentage: "75.5%",
          },
          {
            date: "2024-11-15",
            opponent: "Mike Johnson",
            opponent_school: "Another High School",
            result: "Win",
            method: "Tech Fall",
            time: "4:30",
            weight: 157,
            venue: "Regional Tournament",
            win_loss: "W",
            opponent_percentage: "82.3%",
          },
        ],
      }

      const response = await fetch("/api/debug/create-matches-correct-db", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sampleData),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to upload sample data",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🎯 Create Matches Table in Correct Database</CardTitle>
          <CardDescription>
            Since your app is connected to a different database, let's create the matches table directly through your
            API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-500 bg-blue-50">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Smart Solution:</p>
                <p className="text-sm">
                  Instead of moving databases around, we'll create the matches table directly in the database your app
                  is connected to. This ensures everything works perfectly together.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <Button onClick={createMatchesTable} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
            {loading ? "Creating..." : "🚀 Create Matches Table in App Database"}
          </Button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>This will:</p>
            <p>• Create the matches table with proper structure</p>
            <p>• Set up all necessary permissions and policies</p>
            <p>• Make it immediately accessible to your API</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🧪 Test the New Table</CardTitle>
          <CardDescription>Verify the matches table was created successfully</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testMatchesTable} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Test Matches Table Access"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📊 Upload Sample Data</CardTitle>
          <CardDescription>Add Liam Hickey's sample wrestling data to test everything works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={uploadSampleData} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
            {loading ? "Uploading..." : "Upload Liam Hickey Sample Data"}
          </Button>

          {result && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">{result.success ? "✅ Success" : "❌ Failed"}</div>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
