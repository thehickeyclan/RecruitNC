"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function FixOBXLogoPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runFix = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/debug/obx-fix", {
        method: "POST"
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.result)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🔧 Fix OBX Wrestling Factory Logo</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Auto-Fix Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600">
            This tool will find Everest Ouellette's record and ensure there's a proper logo mapping for OBX Wrestling Factory.
          </p>
          
          <Button onClick={runFix} disabled={loading} className="w-full">
            {loading ? "Fixing..." : "🚀 Fix OBX Logo Issue"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Fix Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold">Everest's Data:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm">
                  {JSON.stringify(result.everest_data, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-bold">Club Name Found:</h3>
                <p className="text-lg">{result.club_name || "❌ No club name"}</p>
              </div>

              <div>
                <h3 className="font-bold">Action Taken:</h3>
                <p className="text-lg font-medium text-green-600">{result.action_taken}</p>
              </div>

              {result.existing_mapping && (
                <div>
                  <h3 className="font-bold">Logo Mapping:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm">
                    {JSON.stringify(result.existing_mapping, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
