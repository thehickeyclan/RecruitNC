"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function FixNathanMcCartneyGradesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")

  const handleFix = async () => {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/admin/fix-nathan-mccartney-grades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fix grades")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Fix Nathan McCartney Grade Labels</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Grade Correction Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-700">
                Nathan McCartney's match data has incorrect grade labels. This will correct them to:
              </p>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Correct Grade Mapping:</h3>
                <ul className="space-y-1 text-sm">
                  <li>
                    <strong>2022-23:</strong> Sophomore Year (currently showing as Freshman)
                  </li>
                  <li>
                    <strong>2023-24:</strong> Junior Year (correct)
                  </li>
                  <li>
                    <strong>2024-25:</strong> Senior Year (currently showing as Junior)
                  </li>
                </ul>
              </div>

              <Button onClick={handleFix} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Fixing Grades...
                  </>
                ) : (
                  "Fix Nathan McCartney's Grades"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-6 border-red-500">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Grade Correction Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{result.summary.updated}</div>
                    <div className="text-sm text-green-700">Records Updated</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.summary.noChange}</div>
                    <div className="text-sm text-blue-700">Already Correct</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{result.summary.errors}</div>
                    <div className="text-sm text-red-700">Errors</div>
                  </div>
                </div>

                {result.updates && result.updates.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Detailed Updates:</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {result.updates.map((update: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                          {update.status === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {update.status === "error" && <XCircle className="h-4 w-4 text-red-600" />}
                          {update.status === "no_change" && <AlertCircle className="h-4 w-4 text-blue-600" />}

                          <span>
                            <strong>{update.season}:</strong>
                            {update.status === "success" && ` Updated from "${update.from}" to "${update.to}"`}
                            {update.status === "error" && ` Error: ${update.error}`}
                            {update.status === "no_change" && ` Already correct (${update.current})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Alert className="border-green-500">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nathan McCartney's grade labels have been corrected! The changes will be visible on his public
                    profile immediately.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
