"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SubmitLiamMatchesPage() {
  const [year, setYear] = useState("2024")
  const [jsonData, setJsonData] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const sampleJson = `[
  {
    "opponent": "John Smith",
    "opponent_school": "Cardinal Gibbons",
    "date": "2024-01-15",
    "tournament": "Cary Invitational",
    "weight_class": "157",
    "result": "W",
    "decision_type": "Pin",
    "time": "2:45",
    "period": 2,
    "score": "12-4"
  },
  {
    "opponent": "Mike Johnson", 
    "opponent_school": "Hough High School",
    "date": "2024-02-10",
    "tournament": "Regional Championships",
    "weight_class": "157",
    "result": "W",
    "decision_type": "Decision",
    "time": "6:00",
    "period": 3,
    "score": "8-3"
  }
]`

  const handleSubmit = async () => {
    if (!jsonData.trim()) {
      setResult({ success: false, error: "Please enter JSON data" })
      return
    }

    try {
      // Validate JSON first
      const parsedData = JSON.parse(jsonData)
      if (!Array.isArray(parsedData)) {
        throw new Error("JSON must be an array of matches")
      }

      setIsSubmitting(true)

      const response = await fetch("/api/admin/submit-liam-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: Number.parseInt(year),
          matches: parsedData,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setJsonData("") // Clear form on success
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Invalid JSON format",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadSample = () => {
    setJsonData(sampleJson)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Submit Liam Hickey Matches</h1>
        <p className="text-gray-600">Upload match data for Liam Hickey by year</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Match Data Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2024"
              min="2020"
              max="2030"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="jsonData">Match Data (JSON)</Label>
              <Button type="button" variant="outline" size="sm" onClick={loadSample}>
                Load Sample Data
              </Button>
            </div>
            <Textarea
              id="jsonData"
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="Paste JSON array of matches here..."
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Matches"}
          </Button>
        </CardContent>
      </Card>

      {/* JSON Format Guide */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>JSON Format Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Each match should include these fields:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              <strong>opponent</strong>: Opponent's name
            </li>
            <li>
              <strong>opponent_school</strong>: Opponent's school
            </li>
            <li>
              <strong>date</strong>: Match date (YYYY-MM-DD)
            </li>
            <li>
              <strong>tournament</strong>: Tournament/event name
            </li>
            <li>
              <strong>weight_class</strong>: Weight class (e.g., "157")
            </li>
            <li>
              <strong>result</strong>: "W" for win, "L" for loss
            </li>
            <li>
              <strong>decision_type</strong>: "Pin", "Decision", "Tech Fall", "Major Decision", etc.
            </li>
            <li>
              <strong>time</strong>: Match time (optional for decisions)
            </li>
            <li>
              <strong>period</strong>: Period number (optional)
            </li>
            <li>
              <strong>score</strong>: Final score (optional)
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Alert className={result.success ? "border-green-500" : "border-red-500"}>
          <AlertDescription>
            {result.success ? (
              <div>
                <p className="font-semibold text-green-700">✅ Success!</p>
                <p>
                  Submitted {result.count} matches for {year}
                </p>
                {result.details && (
                  <pre className="mt-2 text-xs bg-green-50 p-2 rounded">{JSON.stringify(result.details, null, 2)}</pre>
                )}
              </div>
            ) : (
              <div>
                <p className="font-semibold text-red-700">❌ Error</p>
                <p>{result.error}</p>
                {result.details && (
                  <pre className="mt-2 text-xs bg-red-50 p-2 rounded">{JSON.stringify(result.details, null, 2)}</pre>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
