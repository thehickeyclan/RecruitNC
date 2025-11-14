"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"

export default function FixMontreaPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fixMontreat = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/fix-montreat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Failed to update Montreat College")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Fix Montreat College Division</h1>
        <p className="text-gray-600 mb-8">
          This utility will update all Montreat College athletes to have the NAIA division.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fix Montreat College Division</CardTitle>
            <CardDescription>Change all Montreat College athletes from Division I to NAIA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
                <h3 className="font-medium mb-2">How This Works</h3>
                <p className="text-sm mb-2">This utility will:</p>
                <ol className="list-decimal pl-5 text-sm space-y-1">
                  <li>Find all athletes with "Montreat" in their college name</li>
                  <li>Update their division to "NAIA"</li>
                </ol>
              </div>

              <Button onClick={fixMontreat} disabled={isLoading} className="mb-4">
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating Montreat College...
                  </>
                ) : (
                  "Fix Montreat College Division"
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="mt-4" variant={result.success ? "default" : "destructive"}>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Result</AlertTitle>
                <AlertDescription>
                  {result.message}
                  {result.updates && result.updates.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold">Updated entries:</p>
                      <div className="mt-1 max-h-60 overflow-y-auto border rounded-md p-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-1">ID</th>
                              <th className="text-left p-1">Old Division</th>
                              <th className="text-left p-1">New Division</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.updates.map((update: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="p-1">{update.id}</td>
                                <td className="p-1">{update.oldDivision || "None"}</td>
                                <td className="p-1">{update.newDivision}</td>
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
    </AuthGuard>
  )
}
