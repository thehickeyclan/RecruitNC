"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CheckMatchesTable() {
  const [tableInfo, setTableInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkTable = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/check-matches-table")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to check table")
      }

      setTableInfo(data)
    } catch (err) {
      console.error("Error checking matches table:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkTable()
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Checking matches table...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Matches Table Status</h1>
        <p className="text-gray-600">Check the current state of the matches table</p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-500 bg-red-50">
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {tableInfo && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Table Structure</CardTitle>
              <CardDescription>Current columns in the matches table</CardDescription>
            </CardHeader>
            <CardContent>
              {tableInfo.columns && tableInfo.columns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Column</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Nullable</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableInfo.columns.map((col: any, index: number) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-4 py-2 font-mono">{col.column_name}</td>
                          <td className="border border-gray-300 px-4 py-2">{col.data_type}</td>
                          <td className="border border-gray-300 px-4 py-2">{col.is_nullable}</td>
                          <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                            {col.column_default || "NULL"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No column information available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Table Data</CardTitle>
              <CardDescription>Current records in the matches table</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p>
                    <strong>Total Records:</strong> {tableInfo.count || 0}
                  </p>
                  <Button onClick={checkTable} variant="outline" size="sm">
                    Refresh
                  </Button>
                </div>

                {tableInfo.sampleData && tableInfo.sampleData.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Sample Records:</h4>
                    <div className="bg-gray-100 p-4 rounded overflow-x-auto">
                      <pre className="text-sm">{JSON.stringify(tableInfo.sampleData, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {tableInfo.count === 0 && (
                  <Alert>
                    <AlertDescription>
                      The matches table exists but is empty. You can now upload match data.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>Since the matches table already exists, you can:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>
                    Go to <code>/admin/matches/upload</code> to upload match data
                  </li>
                  <li>
                    Use the bulk upload feature at <code>/admin/matches/bulk-upload</code>
                  </li>
                  <li>
                    Check existing matches at <code>/api/matches</code>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
