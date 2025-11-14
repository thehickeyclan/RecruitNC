"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LogoMappingsSaveTest() {
  const [readResult, setReadResult] = useState<any>(null)
  const [saveResult, setSaveResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testRead = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-logo-read")
      const data = await response.json()
      setReadResult({ status: response.status, data })
      console.log("Read result:", data)
    } catch (error) {
      setReadResult({ status: "error", data: { error: error instanceof Error ? error.message : "Unknown error" } })
    }
    setLoading(false)
  }

  const testSave = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-logo-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_name: "Test College",
          entity_type: "college",
          logo_url: "https://example.com/test-logo.png",
        }),
      })
      const data = await response.json()
      setSaveResult({ status: response.status, data })
      console.log("Save result:", data)
    } catch (error) {
      setSaveResult({ status: "error", data: { error: error instanceof Error ? error.message : "Unknown error" } })
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Logo Mappings Database Test</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Database Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={testRead} disabled={loading}>
                Test Logo Read
              </Button>
              <Button onClick={testSave} disabled={loading}>
                Test Logo Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {readResult && (
          <Card>
            <CardHeader>
              <CardTitle className={readResult.status === 200 ? "text-green-600" : "text-red-600"}>
                {readResult.status === 200 ? "✅ Read Success" : "❌ Read Error"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Status: {readResult.status}</p>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(readResult.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {saveResult && (
          <Card>
            <CardHeader>
              <CardTitle className={saveResult.status === 200 ? "text-green-600" : "text-red-600"}>
                {saveResult.status === 200 ? "✅ Save Success" : "❌ Save Error"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Status: {saveResult.status}</p>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(saveResult.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
