"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CheckDarkhorseUrlPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkDarkhorseUrl = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/debug/check-darkhorse-url", {
        method: "GET",
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
      <h1 className="text-3xl font-bold mb-6">Check Darkhorse URL</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Darkhorse Wrestling Club Logo Check</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            This will check what URL is currently mapped for the Darkhorse wrestling club logo.
          </p>

          <Button onClick={checkDarkhorseUrl} disabled={loading} className="w-full">
            {loading ? "Checking..." : "Check Darkhorse URL"}
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
            <CardTitle className="text-green-600">Darkhorse URL Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Logo Mapping Details:</h3>
                <pre className="bg-gray-100 p-4 rounded mt-2 text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              {result.logoMapping && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Current Mapping:</h4>
                  <p>
                    <strong>Entity Name:</strong> {result.logoMapping.entity_name}
                  </p>
                  <p>
                    <strong>Entity Type:</strong> {result.logoMapping.entity_type}
                  </p>
                  <p>
                    <strong>Logo URL:</strong> {result.logoMapping.logo_url}
                  </p>
                  <p>
                    <strong>Created:</strong> {new Date(result.logoMapping.created_at).toLocaleString()}
                  </p>

                  {result.logoMapping.logo_url && (
                    <div className="mt-4">
                      <p className="font-semibold mb-2">Logo Preview:</p>
                      <img
                        src={result.logoMapping.logo_url || "/placeholder.svg"}
                        alt="Darkhorse logo"
                        className="w-32 h-32 object-contain border rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg"
                          target.alt = "Failed to load logo"
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {result.athletesUsingDarkhorse && result.athletesUsingDarkhorse.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Athletes using Darkhorse:</h4>
                  <ul className="list-disc list-inside">
                    {result.athletesUsingDarkhorse.map((athlete: any, index: number) => (
                      <li key={index}>
                        {athlete.name} (ID: {athlete.id})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
