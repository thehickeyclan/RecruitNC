"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function FixNJCAAPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fixNJCAAData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/fix-njcaa-athlete")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fix NJCAA athlete data")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Fix NJCAA Athlete Data</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fix NJCAA Athlete Data</CardTitle>
          <CardDescription>
            This utility will ensure there is at least one athlete with NJCAA division in the database. It will check
            for athletes with known NJCAA schools and update their division if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fixNJCAAData} disabled={isLoading} className="mb-4">
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Fixing NJCAA data...
              </>
            ) : (
              "Fix NJCAA Data"
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className="mt-4" variant="default">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Result</AlertTitle>
              <AlertDescription>
                {result.message}
                {result.athlete && (
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    <p>
                      <strong>Name:</strong> {result.athlete.name}
                    </p>
                    <p>
                      <strong>College:</strong> {result.athlete.college}
                    </p>
                    <p>
                      <strong>Division:</strong> {result.athlete.division}
                    </p>
                  </div>
                )}
                {result.athletes && result.athletes.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">NJCAA Athletes:</p>
                    <div className="mt-1 max-h-60 overflow-y-auto border rounded-md p-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-1">Name</th>
                            <th className="text-left p-1">College</th>
                            <th className="text-left p-1">Division</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.athletes.map((athlete: any, index: number) => (
                            <tr key={index} className="border-b">
                              <td className="p-1">{athlete.name}</td>
                              <td className="p-1">{athlete.college}</td>
                              <td className="p-1">{athlete.division}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
