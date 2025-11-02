"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SetupMediaTablePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const setupDatabase = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/create-media-items-table", {
        method: "POST",
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Setup failed",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Setup Media Manager Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This will create the media_items table required for the media manager to function.
          </p>

          <Button onClick={setupDatabase} disabled={loading} size="lg">
            {loading ? "Setting up..." : "Setup Database Table"}
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription>
                {result.success ? (
                  <div>
                    <strong>Success!</strong> {result.message}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <strong>Setup Failed:</strong> {result.error}
                    </div>
                    {result.sql && (
                      <div>
                        <p className="font-medium">Please run this SQL in your Supabase dashboard:</p>
                        <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                          {result.sql}
                        </pre>
                        {result.instructions && <p className="mt-2 text-sm">{result.instructions}</p>}
                      </div>
                    )}
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
