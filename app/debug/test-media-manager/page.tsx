"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function TestMediaManagerPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testMediaManager = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/test-media-update", { method: "POST" })
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
          <h1 className="text-3xl font-bold">Test Media Manager</h1>
          <p className="text-gray-600 mt-2">Test media manager database operations</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Database Operations Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testMediaManager} disabled={loading}>
              {loading ? "Testing..." : "Test Media Manager"}
            </Button>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                <AlertDescription>
                  <div className="space-y-4">
                    <div>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "✅ Test Successful!" : "❌ Test Failed"}
                      </Badge>
                    </div>

                    <p>{result.success ? result.message : result.error}</p>

                    {result.action && (
                      <p>
                        <strong>Action:</strong> {result.action}
                      </p>
                    )}

                    {result.originalRecord && (
                      <div>
                        <h4 className="font-medium mb-2">Original Record:</h4>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(result.originalRecord, null, 2)}
                        </pre>
                      </div>
                    )}

                    {result.updatedRecord && (
                      <div>
                        <h4 className="font-medium mb-2">Updated Record:</h4>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(result.updatedRecord, null, 2)}
                        </pre>
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
