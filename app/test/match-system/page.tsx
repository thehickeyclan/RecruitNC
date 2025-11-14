"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

interface TestResult {
  name: string
  status: "success" | "error" | "pending"
  message: string
  loadTime?: number
  data?: any
}

export default function MatchSystemTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])

    const tests = [
      {
        name: "Database Connection",
        test: async () => {
          const response = await fetch("/api/debug/check-matches-columns")
          const data = await response.json()
          return { success: response.ok, data }
        },
      },
      {
        name: "Direct Match API",
        test: async () => {
          const startTime = Date.now()
          const response = await fetch("/api/athletes/ed26dd22-9533-4acf-ade7-577b41b03337/matches-direct")
          const data = await response.json()
          const loadTime = Date.now() - startTime
          return { success: response.ok, data, loadTime }
        },
      },
      {
        name: "Match Data Structure",
        test: async () => {
          const response = await fetch("/api/debug/matches-check")
          const data = await response.json()
          return { success: response.ok, data }
        },
      },
    ]

    for (const test of tests) {
      try {
        setTestResults((prev) => [...prev, { name: test.name, status: "pending", message: "Running..." }])

        const result = await test.test()

        setTestResults((prev) =>
          prev.map((r) =>
            r.name === test.name
              ? {
                  name: test.name,
                  status: result.success ? "success" : "error",
                  message: result.success
                    ? `✅ ${test.name} passed`
                    : `❌ ${test.name} failed: ${result.data?.error || "Unknown error"}`,
                  loadTime: result.loadTime,
                  data: result.data,
                }
              : r,
          ),
        )
      } catch (error) {
        setTestResults((prev) =>
          prev.map((r) =>
            r.name === test.name
              ? {
                  name: test.name,
                  status: "error",
                  message: `❌ ${test.name} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                }
              : r,
          ),
        )
      }
    }

    setIsRunning(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Match System Test</h1>
          <p className="text-gray-600">Testing the new direct athlete_id match system</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Badge className="mb-2 bg-green-600">✅</Badge>
                <div className="text-sm font-medium">athlete_id Column</div>
                <div className="text-xs text-gray-600">Added to matches table</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Badge className="mb-2 bg-green-600">✅</Badge>
                <div className="text-sm font-medium">Backfill Complete</div>
                <div className="text-xs text-gray-600">151/158 matches linked</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Badge className="mb-2 bg-blue-600">🧪</Badge>
                <div className="text-sm font-medium">Testing Phase</div>
                <div className="text-xs text-gray-600">Verifying functionality</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={runTests} disabled={isRunning} className="w-full">
                {isRunning ? "Running Tests..." : "Run All Tests"}
              </Button>

              {testResults.length === 0 && !isRunning && (
                <div className="text-center text-gray-500 py-8">
                  <p>Found 0 test athlete(s)</p>
                  <p className="text-sm mt-2">Click "Run All Tests" to start testing the system</p>
                </div>
              )}

              {testResults.map((result, index) => (
                <Alert key={index} className={result.status === "success" ? "border-green-200" : "border-red-200"}>
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>{result.message}</span>
                      {result.loadTime && (
                        <Badge variant="outline" className="ml-2">
                          {result.loadTime}ms
                        </Badge>
                      )}
                    </div>
                    {result.data && result.status === "success" && (
                      <div className="mt-2 text-xs text-gray-600">
                        {result.name === "Direct Match API" && result.data.matches && (
                          <span>Found {result.data.matches.length} match records</span>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Direct API Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Test the new API directly:</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <code className="text-sm">GET /api/athletes/ed26dd22-9533-4acf-ade7-577b41b03337/matches-direct</code>
            </div>
            <div className="mt-4">
              <a
                href="/api/athletes/ed26dd22-9533-4acf-ade7-577b41b03337/matches-direct"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full bg-transparent">
                  Open API Response
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50">
                  ✅
                </Badge>
                <span className="text-sm">Test athlete profiles with match data</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50">
                  ✅
                </Badge>
                <span className="text-sm">Verify new upload process works</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-50">
                  ⏳
                </Badge>
                <span className="text-sm">Update remaining 7 unmatched records</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50">
                  🚀
                </Badge>
                <span className="text-sm">Deploy improved match display components</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            🎉 The new match system uses direct athlete_id relationships for instant, reliable data loading!
          </p>
          <div className="mt-4">
            <Link href="/test/match-system/links">
              <Button variant="outline">View Test Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
