"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function EnsureUNCLogo() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const ensureLogo = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/ensure-unc-logo", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        setResult(`✅ ${data.message}`)
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogo = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/logo-mappings/college/UNC%20Chapel%20Hill")
      const data = await response.json()

      if (data.success && data.logo_url) {
        setResult(`✅ Logo found: ${data.logo_url}`)
      } else {
        setResult(`❌ Logo not found: ${data.error || "No logo URL returned"}`)
      }
    } catch (error) {
      setResult(`❌ Test error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Fix UNC Chapel Hill Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>This will ensure the UNC Chapel Hill logo mapping exists and is correct.</p>

          <div className="space-y-2">
            <p>
              <strong>Entity Name:</strong> UNC Chapel Hill
            </p>
            <p>
              <strong>Entity Type:</strong> college
            </p>
            <p>
              <strong>Logo URL:</strong>{" "}
              <span className="text-sm break-all">
                https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/Uigu95m8-1745952038636.png
              </span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={ensureLogo} disabled={loading}>
              {loading ? "Processing..." : "Fix UNC Logo"}
            </Button>
            <Button onClick={testLogo} disabled={loading} variant="outline">
              {loading ? "Testing..." : "Test Logo Lookup"}
            </Button>
          </div>

          {result && (
            <div className="p-4 bg-gray-100 rounded">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
