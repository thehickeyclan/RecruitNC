"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

const STANDARD_DIVISIONS = ["Division I", "Division II", "Division III", "NAIA", "NJCAA"]

export default function CollegeMappingsTestPage() {
  const [collegeName, setCollegeName] = useState("")
  const [division, setDivision] = useState("Division I")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testInsert = async () => {
    if (!collegeName.trim()) {
      setError("College name is required")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🧪 Testing insert with:", { collegeName, division })

      const response = await fetch("/api/debug/college-mappings-insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          college_name: collegeName,
          division: division,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("❌ Response not OK:", data)
        setError(`${data.error}: ${data.details} (Step: ${data.step})`)
        return
      }

      console.log("✅ Success:", data)
      setResult(data)
      setCollegeName("")
    } catch (err) {
      console.error("💥 Network error:", err)
      setError(err instanceof Error ? err.message : "Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-4">College Mappings Insert Test</h1>
      <p className="text-gray-600 mb-8">Debug tool to test college mapping inserts and identify issues.</p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            {result.message}
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">{JSON.stringify(result.data, null, 2)}</pre>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test College Insert</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">College Name</label>
              <Input
                placeholder="Enter college name"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Division</label>
              <Select value={division} onValueChange={setDivision} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_DIVISIONS.map((div) => (
                    <SelectItem key={div} value={div}>
                      {div}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={testInsert} disabled={loading || !collegeName.trim()}>
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Testing Insert..." : "Test Insert"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
