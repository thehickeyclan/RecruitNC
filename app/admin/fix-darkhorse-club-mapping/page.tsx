"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function FixDarkhorseClubMappingPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFix = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/fix-darkhorse-club-mapping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || "Unknown error occurred")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Fix Darkhorse Club Mapping</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Fix for Darkhorse Club</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            This will update Boedi Kirkland and Jackson Rowling's wrestling club to "Darkhorse" and ensure the logo
            mapping exists in the database.
          </p>

          <Button onClick={handleFix} disabled={loading} className="w-full">
            {loading ? "Fixing..." : "Fix Darkhorse Club Mapping"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Success!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Updates Made:</h3>
                <pre className="bg-gray-100 p-4 rounded mt-2 text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              <Alert>
                <AlertDescription>
                  The database has been updated. The Darkhorse logo should now appear on Boedi and Jackson's commitment
                  cards.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
