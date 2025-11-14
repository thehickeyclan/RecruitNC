"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react"

export default function FixMontreatOnlyPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFix = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/fix-montreat-only", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || "Failed to fix Montreat division")
      }
    } catch (err) {
      setError("Network error occurred")
      console.error("Error fixing Montreat:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Documentation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Process Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Exact Process for Single College Division Fix:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  <strong>Target Specific College:</strong> Use <code>ilike("college", "%montreat%")</code> to match
                  only Montreat
                </li>
                <li>
                  <strong>Update Division Only:</strong> Set <code>division: "NAIA"</code> and <code>updated_at</code>
                </li>
                <li>
                  <strong>Verify Changes:</strong> Query again to confirm only Montreat was affected
                </li>
                <li>
                  <strong>Log Everything:</strong> Track before/after records for safety
                </li>
              </ol>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">SQL Equivalent:</h3>
              <code className="text-sm bg-white p-2 rounded block">
                UPDATE athletes SET division = 'NAIA', updated_at = NOW() WHERE college ILIKE '%montreat%';
              </code>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">To Fix Other Colleges:</h3>
              <p className="text-sm">
                1. Copy this API route
                <br />
                2. Change "montreat" to the college name
                <br />
                3. Change "NAIA" to the correct division
                <br />
                4. Test on a single college at a time
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fix Action Card */}
        <Card>
          <CardHeader>
            <CardTitle>Fix Montreat College Division</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              This will change ONLY Montreat College from Division I to NAIA. No other colleges will be affected.
            </p>

            <Button onClick={handleFix} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing Montreat Division...
                </>
              ) : (
                "Fix Montreat to NAIA"
              )}
            </Button>

            {result && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Success!</strong> {result.message}
                    </p>
                    <p>Records updated: {result.updatedCount}</p>
                    {result.updatedRecords && result.updatedRecords.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold">Updated Athletes:</p>
                        <ul className="list-disc list-inside text-sm">
                          {result.updatedRecords.map((athlete: any) => (
                            <li key={athlete.id}>
                              {athlete.name} - {athlete.college} → {athlete.division}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Error: {error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
