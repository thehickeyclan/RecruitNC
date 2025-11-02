"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function FixProfileTypesConsistencyPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runScript = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/fix-profile-types-consistency", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to run script")
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Fix Profile Types Consistency</CardTitle>
          <CardDescription>
            This script will make profile types consistent between the sign-up form and database. It will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Remove "recruiter" (college coaches handle recruiting)</li>
              <li>Convert underscore format to hyphen format</li>
              <li>Update database constraint to match form exactly</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runScript} disabled={isLoading}>
            {isLoading ? "Running..." : "Fix Profile Types Consistency"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>

              {result.before && (
                <div>
                  <h3 className="font-semibold mb-2">Before Migration:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(result.before, null, 2)}</pre>
                </div>
              )}

              {result.after && (
                <div>
                  <h3 className="font-semibold mb-2">After Migration:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(result.after, null, 2)}</pre>
                </div>
              )}

              {result.sql && (
                <div>
                  <h3 className="font-semibold mb-2">Run this SQL manually in Supabase:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">{result.sql}</pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
