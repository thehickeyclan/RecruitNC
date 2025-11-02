"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AdminHeader } from "@/components/admin-header"
import { AuthGuard } from "@/components/auth-guard"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function FixDivisionDataManualPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(false)

  const handleFixDivisionData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/fix-division-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ force: forceUpdate }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fix division data")
      }

      setResult(data)
    } catch (err) {
      console.error("Error fixing division data:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="container mx-auto py-6">
        <AdminHeader title="Fix Division Data" description="Manually fix division data for athletes" />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Fix Division Data</CardTitle>
              <CardDescription>
                This tool will update athlete division data to ensure the counts match the expected values: 10 D1, 10
                D2, 6 D3, 1 NAIA, 1 NJCAA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Switch id="force-update" checked={forceUpdate} onCheckedChange={setForceUpdate} />
                <Label htmlFor="force-update">Force update (apply fixes even if counts already match)</Label>
              </div>

              <Button onClick={handleFixDivisionData} disabled={loading}>
                {loading ? "Fixing..." : "Fix Division Data"}
              </Button>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium">Results</h3>
                  <p className="text-sm text-gray-500 mt-1">{result.message}</p>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium">Current Counts:</h4>
                      <ul className="list-disc pl-6 mt-2">
                        {Object.entries(result.beforeCounts).map(([division, count]) => (
                          <li key={division}>
                            {division}: {count as number}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium">Expected Counts:</h4>
                      <ul className="list-disc pl-6 mt-2">
                        {Object.entries(result.expectedCounts).map(([division, count]) => (
                          <li key={division}>
                            {division}: {count as number}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {result.updates.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium">Updates ({result.updates.length}):</h4>
                      <div className="max-h-60 overflow-y-auto mt-2 border rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Old Division
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                New Division
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {result.updates.map((update: any, index: number) => (
                              <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap">{update.name}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{update.oldDivision}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{update.newDivision}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-500">Errors ({result.errors.length}):</h4>
                      <ul className="list-disc pl-6 max-h-60 overflow-y-auto mt-2">
                        {result.errors.map((error: any, index: number) => (
                          <li key={index}>
                            {error.name}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
