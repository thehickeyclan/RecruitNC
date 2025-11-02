"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Database, Plus } from "lucide-react"

export default function SimpleCollegeTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [collegeName, setCollegeName] = useState("Test College")
  const [division, setDivision] = useState("Division I")

  const checkTable = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/college-mappings")
      const data = await response.json()
      setResult({ type: "check", data })
    } catch (error) {
      setResult({ type: "error", data: { error: "Network error", details: error } })
    } finally {
      setLoading(false)
    }
  }

  const testInsert = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/college-mappings-insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college_name: collegeName,
          division: division,
        }),
      })
      const data = await response.json()
      setResult({ type: "insert", data, status: response.status })
    } catch (error) {
      setResult({ type: "error", data: { error: "Network error", details: error } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Simple College Mapping Test</h1>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Check Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={checkTable} disabled={loading} className="w-full">
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Check Table Status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Test Insert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input placeholder="College name" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} />
              <Input placeholder="Division" value={division} onChange={(e) => setDivision(e.target.value)} />
              <Button onClick={testInsert} disabled={loading || !collegeName} className="w-full">
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Test Insert
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result ({result.type})</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
