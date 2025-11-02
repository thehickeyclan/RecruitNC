"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"

export default function ForceRefreshPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleForceRefresh = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      // Call the API to force refresh
      const response = await fetch("/api/simple-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Successfully refreshed data. Please hard refresh your browser (Ctrl+F5).",
        })
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to refresh data. Please try again.",
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: "An error occurred while refreshing data. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <AdminHeader
        title="Force Refresh"
        description="Force refresh all data to ensure the latest information is displayed"
      />

      <div className="grid gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Force Refresh Data</CardTitle>
            <CardDescription>
              This will force a refresh of all data and clear caches. Use this if you're seeing outdated information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              After refreshing, you should hard refresh your browser (Ctrl+F5 or Cmd+Shift+R) to ensure you're seeing
              the latest data.
            </p>

            {result && (
              <Alert className={result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleForceRefresh} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Force Refresh All Data
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">If you're still seeing outdated data:</h3>
                <ul className="list-disc pl-5 mt-2 text-sm text-gray-600 space-y-1">
                  <li>Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)</li>
                  <li>Try opening the site in an incognito/private window</li>
                  <li>Clear your browser cache completely</li>
                  <li>Try a different browser</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium">Common issues:</h3>
                <ul className="list-disc pl-5 mt-2 text-sm text-gray-600 space-y-1">
                  <li>Incorrect division values on athlete cards</li>
                  <li>Missing or outdated images</li>
                  <li>Incorrect statistics or counts</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
