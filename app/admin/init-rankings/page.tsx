"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function InitRankingsPage() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const initializeRankings = async () => {
    setIsInitializing(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/init-rankings")
      const data = await response.json()

      setResult({
        success: data.success,
        message: data.success
          ? "Rankings database initialized successfully!"
          : data.error || "Failed to initialize rankings database",
      })
    } catch (error) {
      setResult({
        success: false,
        message: "An error occurred while initializing the rankings database",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Initialize Rankings Database</CardTitle>
          <CardDescription>Set up the necessary database tables for the prospect rankings system.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600">This will create the following database structures:</p>
          <ul className="mb-6 list-inside list-disc space-y-1 text-sm text-gray-600">
            <li>
              The <code>prospect_rankings</code> table to store ranking data
            </li>
            <li>
              Additional fields in the <code>athletes</code> table for prospect profiles
            </li>
            <li>Necessary indexes for optimal performance</li>
            <li>Helper functions for database operations</li>
          </ul>

          {result && (
            <Alert className={result.success ? "bg-green-50" : "bg-red-50"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={initializeRankings} disabled={isInitializing} className="w-full">
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              "Initialize Rankings Database"
            )}
          </Button>
        </CardFooter>
      </Card>

      {result?.success && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-inside list-decimal space-y-2 text-gray-600">
                <li>Go to the Admin section to add prospect rankings</li>
                <li>Add rankings for different graduation years (2025-2028)</li>
                <li>Visit the Rankings page to see your rankings in action</li>
              </ol>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button onClick={() => (window.location.href = "/rankings")}>View Rankings Page</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
