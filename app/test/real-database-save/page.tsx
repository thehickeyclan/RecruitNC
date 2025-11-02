"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export default function RealDatabaseSaveTest() {
  const [testData, setTestData] = useState({
    name: "Test College",
    division: "NCAA Division I",
  })
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const { toast } = useToast()

  const testDatabaseSave = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-database-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      })

      const result = await response.json()

      setResults((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          success: response.ok,
          data: result,
          status: response.status,
        },
      ])

      if (response.ok) {
        toast({
          title: "Database Save Success!",
          description: `Saved: ${testData.name}`,
        })
      } else {
        toast({
          title: "Database Save Failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorResult = {
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      }

      setResults((prev) => [...prev, errorResult])

      toast({
        title: "Network Error",
        description: "Could not connect to database",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Real Database Save Test</h1>
      <p className="text-gray-600 mb-8">
        This will attempt to save data to your actual Supabase database to test the connection.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Test Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">College Name</Label>
              <Input
                id="name"
                value={testData.name}
                onChange={(e) => setTestData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter college name"
              />
            </div>

            <div>
              <Label htmlFor="division">Division</Label>
              <Input
                id="division"
                value={testData.division}
                onChange={(e) => setTestData((prev) => ({ ...prev, division: e.target.value }))}
                placeholder="Enter division"
              />
            </div>

            <Button onClick={testDatabaseSave} disabled={loading} className="w-full">
              {loading ? "Saving to Database..." : "Test Database Save"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Test Results</CardTitle>
            {results.length > 0 && (
              <Button onClick={clearResults} variant="outline" size="sm">
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tests run yet. Click "Test Database Save" to begin.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${result.success ? "bg-green-500" : "bg-red-500"}`}></div>
                      <span className="font-medium">{result.success ? "Success" : "Failed"}</span>
                      <span className="text-sm text-gray-500">{new Date(result.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <div className="text-sm space-y-1">
                      <div>
                        <strong>Status:</strong> {result.status}
                      </div>
                      {result.data && (
                        <div>
                          <strong>Response:</strong> {JSON.stringify(result.data, null, 2)}
                        </div>
                      )}
                      {result.error && (
                        <div className="text-red-600">
                          <strong>Error:</strong> {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">What This Tests:</h3>
        <ul className="text-sm space-y-1">
          <li>• Database connection to Supabase</li>
          <li>• Table creation/access permissions</li>
          <li>• Data insertion capabilities</li>
          <li>• Error handling and reporting</li>
        </ul>
      </div>
    </div>
  )
}
