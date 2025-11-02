"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function MatchesUploadFinal() {
  const [jsonInput, setJsonInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
    details?: any
  } | null>(null)

  const checkTable = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/create-matches-table-working", {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message,
          details: result,
        })
      } else {
        setMessage({
          type: "error",
          text: result.error,
          details: result,
        })
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to check table",
        details: error,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!jsonInput.trim()) {
      setMessage({ type: "error", text: "Please paste JSON data first" })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const parsedData = JSON.parse(jsonInput)

      const response = await fetch("/api/matches/upload-final", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedData),
      })

      const result = await response.json()

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message,
          details: result,
        })
        setJsonInput("")
      } else {
        setMessage({
          type: "error",
          text: result.error || "Upload failed",
          details: result,
        })
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        setMessage({ type: "error", text: "Invalid JSON format. Please check your data." })
      } else {
        setMessage({
          type: "error",
          text: "Upload failed",
          details: error,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("SQL copied to clipboard!")
  }

  const sampleData = {
    wrestler_info: {
      first_name: "Liam",
      last_name: "Hickey",
      season: "2023-24",
      grade: "12",
      high_school: "Cardinal Gibbons",
    },
    season_summary: {
      total_matches: 45,
      wins: 42,
      losses: 3,
      pins: 25,
      tech_falls: 8,
      decisions: 7,
      major_decisions: 2,
      forfeits_won: 0,
      pin_percentage: 59.52,
      tf_percentage: 19.05,
      finishing_percentage: 78.57,
    },
    matches: [
      {
        date: "2023-11-15",
        opponent: "John Smith",
        result: "Win",
        method: "Pin",
        time: "1:45",
      },
      {
        date: "2023-11-22",
        opponent: "Mike Johnson",
        result: "Win",
        method: "Tech Fall",
        time: "4:30",
      },
    ],
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Final Match Upload</h1>
        <p className="text-gray-600">Upload Liam Hickey's match data to the matches table</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Check/Create Table</CardTitle>
          <CardDescription>Verify the matches table exists and is accessible</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkTable} disabled={isLoading} className="w-full">
            {isLoading ? "Checking..." : "Check Matches Table"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 2: Upload Match Data</CardTitle>
          <CardDescription>Paste your Liam Hickey JSON data here</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your Liam Hickey JSON data here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={isLoading || !jsonInput.trim()} className="flex-1">
              {isLoading ? "Uploading..." : "Upload Match Data"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setJsonInput(JSON.stringify(sampleData, null, 2))}
              disabled={isLoading}
            >
              Use Sample Data
            </Button>
          </div>
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
            {message.details?.sql_to_run_manually && (
              <div className="mt-4">
                <p className="text-sm mb-2">{message.details.instructions}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(message.details.sql_to_run_manually)}
                >
                  Copy SQL
                </Button>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {message.details.sql_to_run_manually}
                </pre>
              </div>
            )}
            {message.details && !message.details.sql_to_run_manually && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">View Details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(message.details, null, 2)}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
