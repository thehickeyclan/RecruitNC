"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function MatchesBulkUpload() {
  const [jsonData, setJsonData] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  const setupDatabase = async () => {
    try {
      setIsUploading(true)
      const response = await fetch("/api/matches/setup", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        setResult({ message: "Database setup complete!" })
        setError("")
      } else {
        setError(data.error || "Setup failed")
      }
    } catch (err) {
      setError("Setup failed: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setIsUploading(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!jsonData.trim()) {
      setError("Please paste JSON data")
      return
    }

    try {
      setIsUploading(true)
      setError("")

      // Parse JSON data
      const matchDataArray = JSON.parse(jsonData)

      // Ensure it's an array
      const dataToUpload = Array.isArray(matchDataArray) ? matchDataArray : [matchDataArray]

      const response = await fetch("/api/matches/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matchDataArray: dataToUpload }),
      })

      const result = await response.json()

      if (result.success) {
        setResult(result)
        setJsonData("") // Clear the textarea
      } else {
        setError(result.error || "Upload failed")
      }
    } catch (err) {
      setError("Upload failed: " + (err instanceof Error ? err.message : "Invalid JSON"))
    } finally {
      setIsUploading(false)
    }
  }

  const exampleData = `[
  {
    "wrestler_info": {
      "first_name": "Liam",
      "last_name": "Hickey",
      "season": "2021-22",
      "grade": "Freshman",
      "high_school": "Cardinal Gibbons"
    },
    "season_summary": {
      "total_matches": 47,
      "wins": 44,
      "losses": 3,
      "pins": 37,
      "tech_falls": 0,
      "decisions": 1,
      "major_decisions": 1,
      "forfeits_won": 5,
      "pin_percentage": 78.72,
      "tf_percentage": 0.0,
      "finishing_percentage": 78.72
    },
    "matches": [
      {
        "date": "2021-11-20",
        "weight": 120,
        "opponent": "JT Erle",
        "opponent_school": "Union Pines",
        "result": "Fall",
        "venue": "The 2021 Viking Invitational",
        "win_loss": "W",
        "opponent_percentage": "0.00%"
      }
    ]
  }
]`

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Wrestling Match Data - Bulk Upload</h1>
          <p className="text-muted-foreground">Upload match history for 100+ wrestlers at high speed</p>
        </div>
        <Button onClick={setupDatabase} disabled={isUploading}>
          {isUploading ? "Setting up..." : "Setup Database"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">{result.message}</p>
              {result.wrestlerCounts && (
                <div>
                  <p className="text-sm font-medium">Records created per wrestler:</p>
                  <ul className="text-sm">
                    {Object.entries(result.wrestlerCounts).map(([name, count]) => (
                      <li key={name}>
                        • {name}: {count} seasons
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>JSON Data Input</CardTitle>
            <CardDescription>Paste your match data JSON here. Can handle single objects or arrays.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="Paste your JSON match data here..."
              className="min-h-[400px] font-mono text-sm"
            />
            <Button onClick={handleBulkUpload} disabled={isUploading || !jsonData.trim()} className="w-full">
              {isUploading ? "Uploading..." : "Upload Match Data"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Example Format</CardTitle>
            <CardDescription>Expected JSON structure for match data</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[400px]">{exampleData}</pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Speed Optimizations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>
              ✅ <strong>Bulk Insert:</strong> Upload multiple wrestlers at once
            </li>
            <li>
              ✅ <strong>JSONB Storage:</strong> Individual matches stored as JSON for speed
            </li>
            <li>
              ✅ <strong>Upsert:</strong> Automatically handles duplicates
            </li>
            <li>
              ✅ <strong>Indexed:</strong> Fast queries by wrestler, season, school
            </li>
            <li>
              ✅ <strong>No Profile Integration:</strong> Standalone records for now
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
