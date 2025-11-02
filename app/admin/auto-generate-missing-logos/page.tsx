"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

export default function AutoGenerateMissingLogos() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/auto-generate-missing-logos", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || "Failed to generate logo mappings")
      }
    } catch (err) {
      setError("Network error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Auto-Generate Missing Logo Mappings</CardTitle>
          <CardDescription>
            This will scan all athletes and create generic logo mappings for any high schools, colleges, or clubs that
            don't already have logos mapped. This ensures all entities show a generic logo instead of broken images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Logo Mappings...
              </>
            ) : (
              "Generate Missing Logo Mappings"
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {result.message}
                {result.mappings && result.mappings.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">New mappings created:</p>
                    <ul className="list-disc list-inside mt-1 text-sm">
                      {result.mappings.slice(0, 10).map((mapping: any, index: number) => (
                        <li key={index}>
                          {mapping.entity_type}: {mapping.entity_name}
                        </li>
                      ))}
                      {result.mappings.length > 10 && <li>... and {result.mappings.length - 10} more</li>}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
