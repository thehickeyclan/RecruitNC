"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2Icon } from "lucide-react"
import AthleteImage from "@/components/athlete-image"

export default function RestoreHaydenPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRestore = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/restore-hayden-image")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore Hayden's image")
      }

      setResult(data)
    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Restore Hayden's Original Image</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Restore Original Image</CardTitle>
          <CardDescription>
            This will attempt to find and restore Hayden's original uploaded image from the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This process will:</p>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Look for the original data URL in the database</li>
            <li>Convert it to a file and upload it to Vercel Blob storage</li>
            <li>Update Hayden's record to use the new Blob URL</li>
          </ol>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRestore} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Restoring...
              </>
            ) : (
              "Restore Original Image"
            )}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Restoration Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium mb-2">Previous Image</h3>
                {result.previous_url ? (
                  <div className="mb-2">
                    <AthleteImage photoUrl={result.previous_url} name="Hayden Haynes" size="lg" />
                  </div>
                ) : (
                  <p className="text-muted-foreground">No previous image</p>
                )}
                <p className="text-sm text-muted-foreground break-all">{result.previous_url}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">New Image</h3>
                {result.new_url && (
                  <div className="mb-2">
                    <AthleteImage photoUrl={result.new_url} name="Hayden Haynes" size="lg" />
                  </div>
                )}
                <p className="text-sm text-muted-foreground break-all">{result.new_url}</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-md">
              <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
