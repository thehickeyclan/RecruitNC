"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function CheckMediaColumnsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const checkColumns = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-media-table-columns")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const addMissingColumns = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/add-missing-columns", { method: "POST" })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Media Table Columns Check</h1>
          <p className="text-gray-600 mt-2">Check what columns exist in the media_items table</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Table Structure Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={checkColumns} disabled={loading}>
                {loading ? "Checking..." : "Check Table Columns"}
              </Button>
              <Button onClick={addMissingColumns} disabled={loading} variant="outline">
                {loading ? "Adding..." : "Add Missing Columns"}
              </Button>
            </div>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                <AlertDescription>
                  <div className="space-y-4">
                    <div>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Error"}
                      </Badge>
                    </div>

                    <p>{result.success ? result.message : result.error}</p>

                    {result.columns && result.columns.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Available Columns:</h4>
                        <div className="flex flex-wrap gap-1">
                          {result.columns.map((column: string) => (
                            <Badge key={column} variant="outline">
                              {column}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.sampleRecord && (
                      <div>
                        <h4 className="font-medium mb-2">Sample Record:</h4>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
                          {JSON.stringify(result.sampleRecord, null, 2)}
                        </pre>
                      </div>
                    )}

                    {result.sql && (
                      <div>
                        <h4 className="font-medium mb-2">SQL Executed:</h4>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">{result.sql}</pre>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
