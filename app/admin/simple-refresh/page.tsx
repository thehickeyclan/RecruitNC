"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AuthGuard } from "@/components/auth-guard"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function SimpleRefreshPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRefresh = async () => {
    if (!confirm("This will refresh all athlete data. Continue?")) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/simple-refresh", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to refresh athletes")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error("Error refreshing athletes:", err)
      setError(err instanceof Error ? err.message : "Failed to refresh athletes")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Simple Refresh Athletes</h1>
        <p className="text-gray-600 mb-8">
          This page allows you to refresh all athlete data. This can help if you've updated the database but the changes
          aren't showing up in the UI.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Simple Refresh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <p className="text-sm text-gray-600">
                  Click the button below to refresh all athlete data. This will update the timestamp on all athlete
                  records, which can help if you've updated the database but the changes aren't showing up in the UI.
                </p>

                <Button onClick={handleRefresh} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh All Athletes
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Refresh Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6" variant={result.count > 0 ? "default" : "warning"}>
                  {result.count > 0 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{result.count > 0 ? "Success" : "No Records Found"}</AlertTitle>
                  <AlertDescription>
                    {result.count > 0
                      ? `Refreshed ${result.count} athlete records.`
                      : "No athlete records were found to refresh."}
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-gray-600">
                  The refresh operation has completed. You may need to refresh your browser to see the changes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
