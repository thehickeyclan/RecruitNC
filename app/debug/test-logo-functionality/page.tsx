"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface TestResult {
  testCase: { type: string; name: string }
  found: boolean
  data: any
  error: string | null
}

interface TestResponse {
  success: boolean
  totalMappings: number
  testResults: TestResult[]
  error?: string
  details?: string
}

export default function TestLogoFunctionality() {
  const [testResults, setTestResults] = useState<TestResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-logo-functionality")
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      setTestResults({
        success: false,
        totalMappings: 0,
        testResults: [],
        error: "Failed to run test",
        details: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runTest()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Logo Functionality Test</h1>

      <Button onClick={runTest} disabled={loading} className="mb-6">
        {loading ? "Testing..." : "Run Test Again"}
      </Button>

      {testResults && (
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Overall Status</h2>
            <p className="text-sm">
              <strong>Success:</strong> {testResults.success ? "✅ Yes" : "❌ No"}
            </p>
            <p className="text-sm">
              <strong>Total Logo Mappings:</strong> {testResults.totalMappings || "Unknown"}
            </p>
            {testResults.error && (
              <p className="text-sm text-red-600">
                <strong>Error:</strong> {testResults.error}
              </p>
            )}
            {testResults.details && (
              <p className="text-sm text-red-600">
                <strong>Details:</strong> {testResults.details}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Test Results</h2>
            <div className="space-y-2">
              {testResults.testResults.map((result, index) => (
                <div key={index} className="border-l-4 border-gray-200 pl-4">
                  <p className="font-medium">
                    {result.testCase.type} - {result.testCase.name}
                  </p>
                  <p className="text-sm">
                    <strong>Found:</strong> {result.found ? "✅ Yes" : "❌ No"}
                  </p>
                  {result.data && (
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Entity:</strong> {result.data.entity_name}
                      </p>
                      <p>
                        <strong>Type:</strong> {result.data.entity_type}
                      </p>
                      <p>
                        <strong>Logo URL:</strong> {result.data.logo_url}
                      </p>
                    </div>
                  )}
                  {result.error && (
                    <p className="text-sm text-red-600">
                      <strong>Error:</strong> {result.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
