"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { fixAthleteData } from "@/lib/athlete-data-fixer"

export default function FixAthletesPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Known athlete IDs that need fixing
  const athleteIds = [
    // Liam Hickey
    "ed26dd22-9533-4acf-ade7-577b41b03337",
    // Hayden Litten (replace with actual ID)
    "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  ]

  const fixAllAthletes = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    setResults([])

    try {
      const fixResults = []

      for (const id of athleteIds) {
        const result = await fixAthleteData(id)
        fixResults.push({ id, ...result })
      }

      setResults(fixResults)
      setSuccess(true)
    } catch (err: any) {
      console.error("Error fixing athletes:", err)
      setError(err.message || "Failed to fix athlete data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Fix Athletes Data</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fix Missing Fields for All Athletes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This tool will fix missing fields and ensure proper data formatting for all athletes, with special handling
            for Liam Hickey and Hayden Litten.
          </p>

          <Button onClick={fixAllAthletes} disabled={loading} className="mb-4">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fixing Athletes...
              </>
            ) : (
              "Fix All Athletes"
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">All athletes have been fixed successfully</AlertDescription>
            </Alert>
          )}

          {results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Results</h3>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-md p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Athlete ID: {result.id}</h4>
                      <span className={result.success ? "text-green-600" : "text-red-600"}>
                        {result.success ? "Success" : "Failed"}
                      </span>
                    </div>
                    <p>{result.message || result.error}</p>
                    {result.updates && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Fields Updated:</p>
                        <pre className="bg-gray-100 p-2 rounded-md text-xs mt-1 overflow-auto max-h-[100px]">
                          {JSON.stringify(result.updates, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <a href="/debug/athlete-data">View Athlete Data</a>
        </Button>
      </div>
    </div>
  )
}
