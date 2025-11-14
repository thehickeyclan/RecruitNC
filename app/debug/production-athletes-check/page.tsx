"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DiagnosticResult {
  step: string
  status: "success" | "error" | "warning"
  message: string
  data?: any
}

export default function ProductionAthletesCheck() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(false)

  const runDiagnostic = async () => {
    setLoading(true)
    setResults([])

    const steps = [
      "Check API Response",
      "Check Authentication",
      "Check Database Connection", 
      "Check Athletes Count",
      "Check Data Structure",
      "Check Filters"
    ]

    for (const step of steps) {
      try {
        const response = await fetch(`/api/debug/production-athletes-check?step=${encodeURIComponent(step)}`)
        const result = await response.json()
        
        setResults(prev => [...prev, {
          step,
          status: result.success ? "success" : "error",
          message: result.message,
          data: result.data
        }])
      } catch (error) {
        setResults(prev => [...prev, {
          step,
          status: "error", 
          message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }])
      }
    }

    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Production Athletes Diagnostic</CardTitle>
          <CardDescription>
            Diagnose why athletes aren't showing in production
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostic} disabled={loading} className="mb-6">
            {loading ? "Running Diagnostic..." : "Run Full Diagnostic"}
          </Button>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === "success"
                    ? "bg-green-50 border-green-200"
                    : result.status === "warning"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      result.status === "success"
                        ? "bg-green-500"
                        : result.status === "warning"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <h3 className="font-semibold">{result.step}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                {result.data && (
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
