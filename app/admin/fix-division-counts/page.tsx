"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AdminHeader } from "@/components/admin-header"
import { AuthGuard } from "@/components/auth-guard"

export default function FixDivisionCountsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFixDivisionCounts = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/fix-division-counts")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fix division counts")
      }

      setResult(data)
    } catch (err) {
      console.error("Error fixing division counts:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="container mx-auto py-6">
        <AdminHeader title="Fix Division Counts" description="Ensure division counts match expected values" />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Fix Division Counts</CardTitle>
              <CardDescription>
                This tool will update athlete division data to ensure the counts match the expected values: 10 D1, 10
                D2, 6 D3, 1 NAIA, 1 NJCAA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleFixDivisionCounts} disabled={loading}>
                {loading ? "Fixing..." : "Fix Division Counts"}
              </Button>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium">Results</h3>

                  <div className="mt-2">
                    <h4 className="font-medium">Current Counts:</h4>
                    <ul className="list-disc pl-6">
                      {Object.entries(result.currentCounts).map(([division, count]) => (
                        <li key={division}>
                          {division}: {count}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium">Expected Counts:</h4>
                    <ul className="list-disc pl-6">
                      {Object.entries(result.expectedCounts).map(([division, count]) => (
                        <li key={division}>
                          {division}: {count}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {result.updates.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium">Updates ({result.updates.length}):</h4>
                      <ul className="list-disc pl-6 max-h-60 overflow-y-auto">
                        {result.updates.map((update: any, index: number) => (
                          <li key={index}>
                            {update.name}: {update.oldDivision} → {update.newDivision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-500">Errors ({result.errors.length}):</h4>
                      <ul className="list-disc pl-6 max-h-60 overflow-y-auto">
                        {result.errors.map((error: any, index: number) => (
                          <li key={index}>
                            {error.name}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
