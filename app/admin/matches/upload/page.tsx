"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function MatchesUpload() {
  const [jsonInput, setJsonInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
    sql?: string
    instructions?: string[]
    action?: string
  } | null>(null)
  const [uploadHistory, setUploadHistory] = useState<string[]>([])

  const setupDatabase = async () => {
    setIsSettingUp(true)
    setMessage(null)

    try {
      const response = await fetch("/api/matches/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: "success", text: result.message })
      } else {
        setMessage({
          type: "error",
          text: result.error || "Setup failed",
          sql: result.sql,
          instructions: result.instructions,
        })
      }
    } catch (error) {
      console.error("Setup error:", error)
      setMessage({ type: "error", text: "Failed to setup database" })
    } finally {
      setIsSettingUp(false)
    }
  }

  const handleUpload = async () => {
    if (!jsonInput.trim()) {
      setMessage({ type: "error", text: "Please paste JSON data first" })
      return
    }

    setIsUploading(true)
    setMessage(null)

    try {
      // Parse JSON to validate it
      const parsedData = JSON.parse(jsonInput)

      const response = await fetch("/api/matches/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedData),
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        setUploadHistory((prev) => [...prev, `${result.wrestler_id} - ${result.total_matches} matches`])
        setJsonInput("") // Clear the input for next upload
      } else {
        setMessage({
          type: "error",
          text: result.error || "Upload failed",
          action: result.action,
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      if (error instanceof SyntaxError) {
        setMessage({ type: "error", text: "Invalid JSON format. Please check your data." })
      } else {
        setMessage({ type: "error", text: "Failed to upload match data" })
      }
    } finally {
      setIsUploading(false)
    }
  }

  const clearInput = () => {
    setJsonInput("")
    setMessage(null)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Wrestling Match Data Upload</h1>
        <p className="text-gray-600">
          Upload wrestling match data for Class of 2025 graduates. Paste JSON data for each season (Freshman, Sophomore,
          Junior, Senior).
        </p>
      </div>

      {/* Setup Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Setup</CardTitle>
          <CardDescription>First-time setup: Create the matches table in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={setupDatabase} disabled={isSettingUp} className="w-full">
            {isSettingUp ? "Setting up..." : "Setup Database"}
          </Button>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Match Data</CardTitle>
          <CardDescription>
            Paste the JSON data for one wrestler's season (e.g., Liam Hickey Freshman year)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste JSON data here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={isUploading || !jsonInput.trim()} className="flex-1">
              {isUploading ? "Uploading..." : "Upload Match Data"}
            </Button>
            <Button onClick={clearInput} variant="outline" disabled={!jsonInput.trim()}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message Display */}
      {message && (
        <Alert
          className={`mb-6 ${
            message.type === "error"
              ? "border-red-500 bg-red-50"
              : message.type === "success"
                ? "border-green-500 bg-green-50"
                : "border-blue-500 bg-blue-50"
          }`}
        >
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{message.text}</p>

              {message.action && <p className="text-sm font-semibold text-blue-600">{message.action}</p>}

              {message.sql && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">Please run this SQL in your Supabase dashboard:</p>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                    {message.sql}
                  </pre>
                </div>
              )}

              {message.instructions && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {message.instructions.map((instruction, index) => (
                      <li key={index} className="text-sm">
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>Recently uploaded match data ({uploadHistory.length} uploads)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadHistory
                .slice(-10)
                .reverse()
                .map((upload, index) => (
                  <div key={index} className="p-2 bg-green-50 rounded text-sm">
                    ✅ {upload}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example JSON */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Expected JSON Format</CardTitle>
          <CardDescription>Your JSON should match this structure</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap">
            {`{
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
    // ... more matches
  ]
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
