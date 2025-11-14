"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"

export default function RefreshStatsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    timestamp?: string
    error?: string
  } | null>(null)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/refresh-stats")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: "An error occurred while refreshing stats",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Refresh Stats</CardTitle>
          <CardDescription>
            Use this tool to manually refresh the stats on the main page and clear any cached data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            If the stats on the main page are not updating correctly, click the button below to force a refresh.
          </p>
          <Button onClick={handleRefresh} disabled={loading} className="w-full">
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Stats
              </>
            )}
          </Button>
        </CardContent>
        {result && (
          <CardFooter className="flex flex-col items-start">
            <div className={`text-sm ${result.success ? "text-green-600" : "text-red-600"}`}>
              <p className="font-medium">{result.message}</p>
              {result.timestamp && (
                <p className="text-xs text-gray-500">Refreshed at: {new Date(result.timestamp).toLocaleString()}</p>
              )}
              {result.error && <p className="text-xs mt-1">{result.error}</p>}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
