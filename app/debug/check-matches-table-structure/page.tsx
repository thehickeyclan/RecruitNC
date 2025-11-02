"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CheckMatchesTableStructurePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkTableStructure = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-matches-table-structure")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to check table structure",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Check Matches Table Structure</h1>
        <p className="text-gray-600">Debug the matches table structure to understand the schema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Table Structure Check</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkTableStructure} disabled={loading} className="w-full">
            {loading ? "Checking..." : "Check Matches Table Structure"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Alert className={result.success ? "border-green-500 mt-4" : "border-red-500 mt-4"}>
          <AlertDescription>
            {result.success ? (
              <div>
                <p className="font-semibold text-green-700">✅ Table Structure Check Complete</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-semibold">Table Exists:</h4>
                    <p>{result.tableExists ? "Yes" : "No"}</p>
                  </div>

                  {result.sampleData && (
                    <div>
                      <h4 className="font-semibold">Sample Data Structure:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(result.sampleData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.schema && (
                    <div>
                      <h4 className="font-semibold">Schema Information:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(result.schema, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-red-700">❌ Error</p>
                <p>{result.error}</p>
                {result.details && (
                  <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
