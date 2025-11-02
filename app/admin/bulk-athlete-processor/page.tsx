"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Users, CheckCircle, AlertTriangle } from "lucide-react"

export default function BulkAthleteProcessor() {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState("")

  const handleFixColt = async () => {
    setProcessing(true)
    setError("")
    setResults(null)

    try {
      const response = await fetch("/api/debug/fix-colt-campbell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        setResults(data)
      } else {
        setError(data.error || "Failed to fix Colt Campbell")
      }
    } catch (err) {
      setError("Network error while fixing Colt Campbell")
      console.error("Error fixing Colt:", err)
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkProcess = async () => {
    setProcessing(true)
    setError("")
    setResults(null)

    try {
      const response = await fetch("/api/admin/bulk-process-athletes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        setResults(data)
      } else {
        setError(data.error || "Failed to process athletes")
      }
    } catch (err) {
      setError("Network error while processing athletes")
      console.error("Error processing athletes:", err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bulk Athlete Processor</h1>
        <p className="text-gray-600">
          Fix individual athlete data or process all athletes missing match records at once.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Results */}
      {results && results.success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="text-green-800">
              <p className="font-semibold">{results.message}</p>
              {results.breakdown && (
                <div className="mt-2 text-sm">
                  <p>Season Breakdown:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>Freshman: {results.breakdown.freshman}</li>
                    <li>Sophomore: {results.breakdown.sophomore}</li>
                    <li>Junior: {results.breakdown.junior}</li>
                    <li>Senior: {results.breakdown.senior}</li>
                  </ul>
                </div>
              )}
              {results.totals && (
                <div className="mt-2 text-sm">
                  <p>
                    Career Totals: {results.totals.record} ({results.totals.totalMatches} matches)
                  </p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Fix Colt Campbell */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Fix Colt Campbell Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Clean and fix Colt Campbell's match data to show the correct 4-year breakdown:
            </p>
            <ul className="text-sm text-gray-600 mb-4 space-y-1">
              <li>• Freshman (2021-22): 48-14, 23 pins, 0 TF</li>
              <li>• Sophomore (2022-23): 60-5, 26 pins, 3 TF</li>
              <li>• Junior (2023-24): 61-0, 40 pins, 2 TF</li>
              <li>• Senior (2024-25): 60-0, 43 pins, 12 TF</li>
            </ul>
            <Button onClick={handleFixColt} disabled={processing} className="bg-red-600 hover:bg-red-700">
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing Colt...
                </>
              ) : (
                "Fix Colt Campbell Only"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Bulk Process All Athletes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk Process All Athletes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Generate realistic 4-year wrestling careers for all athletes who don't have match data yet. This creates
              separate, clean records for each athlete.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This will only process athletes who don't already have match records, ensuring no
                data mixing between athletes.
              </p>
            </div>
            <Button onClick={handleBulkProcess} disabled={processing} className="bg-blue-600 hover:bg-blue-700">
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Athletes...
                </>
              ) : (
                "Process All Missing Athletes"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Debug Information */}
      {results && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Processing Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
