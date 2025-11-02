"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function MatchesUploadDirect() {
  const [jsonInput, setJsonInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
    details?: any
  } | null>(null)

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
      console.log("Parsed data:", parsedData)

      const response = await fetch("/api/matches/upload-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedData),
      })

      const result = await response.json()
      console.log("Upload result:", result)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        setJsonInput("") // Clear the input
      } else {
        setMessage({
          type: "error",
          text: result.error || "Upload failed",
          details: result,
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      if (error instanceof SyntaxError) {
        setMessage({ type: "error", text: "Invalid JSON format. Please check your data." })
      } else {
        setMessage({
          type: "error",
          text: "Failed to upload match data",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    } finally {
      setIsUploading(false)
    }
  }

  const createTable = async () => {
    setIsUploading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/create-matches-table-final", {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: "success", text: "Table created successfully! Now you can upload your data." })
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to create table",
          details: result,
        })
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to create table",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const sampleData = `{
  "wrestler_info": {
    "first_name": "Liam",
    "last_name": "Hickey",
    "season": "2023-24",
    "grade": "12",
    "high_school": "Example High School"
  },
  "season_summary": {
    "total_matches": 25,
    "wins": 20,
    "losses": 5,
    "pins": 12,
    "tech_falls": 3,
    "decisions": 4,
    "major_decisions": 1,
    "forfeits_won": 0,
    "pin_percentage": 60.0,
    "tf_percentage": 15.0,
    "finishing_percentage": 75.0
  },
  "matches": [
    {
      "date": "2023-12-01",
      "opponent": "John Doe",
      "result": "Win",
      "method": "Pin"
    }
  ]
}`

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Direct Match Upload</h1>
        <p className="text-gray-600">Upload directly to the matches table</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Create Table</CardTitle>
          <CardDescription>First, create the matches table</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={createTable} disabled={isUploading} className="w-full">
            {isUploading ? "Creating Table..." : "Create Matches Table"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 2: Upload Match Data</CardTitle>
          <CardDescription>After creating the table, paste your JSON data and upload it</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4">
            <Button variant="outline" onClick={() => setJsonInput(sampleData)} className="mb-2">
              Load Sample Data
            </Button>
            <p className="text-sm text-gray-500">Click to load sample data format</p>
          </div>

          <Textarea
            placeholder="Paste your JSON data here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />

          <Button onClick={handleUpload} disabled={isUploading || !jsonInput.trim()} className="w-full">
            {isUploading ? "Uploading..." : "Upload Match Data"}
          </Button>
        </CardContent>
      </Card>

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
            <p className="font-medium">{message.text}</p>
            {message.details && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(message.details, null, 2)}
              </pre>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
