"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

interface FixResult {
  entity: string
  action: string
  logo_url?: string
  error?: string
}

export default function FixSpecificLogos() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FixResult[]>([])
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fixLogos = async () => {
    setLoading(true)
    setMessage(null)
    setResults([])

    try {
      const response = await fetch("/api/admin/fix-specific-logos", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: "success", text: data.message })
        setResults(data.results || [])
      } else {
        setMessage({ type: "error", text: data.error || "Failed to fix logos" })
      }
    } catch (error) {
      console.error("Error fixing logos:", error)
      setMessage({ type: "error", text: "Network error occurred" })
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes("error")) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getActionColor = (action: string) => {
    if (action.includes("error")) {
      return "text-red-600"
    }
    if (action === "updated") {
      return "text-blue-600"
    }
    if (action === "inserted") {
      return "text-green-600"
    }
    return "text-gray-600"
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fix Specific Logo Mappings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">This will ensure the following entities have correct logo mappings:</p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>
                <strong>Hickory Ridge</strong> & <strong>Hickory Ridge High School</strong> → /hickory-ridge-logo.png
              </li>
              <li>
                <strong>Appalachian State</strong> & <strong>Appalachian State University</strong> →
                https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png
              </li>
            </ul>
          </div>

          <Button onClick={fixLogos} disabled={loading} className="w-full">
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Fixing Logo Mappings...
              </>
            ) : (
              "Fix Logo Mappings"
            )}
          </Button>

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getActionIcon(result.action)}
                    <div>
                      <div className="font-medium">{result.entity}</div>
                      <div className={`text-sm ${getActionColor(result.action)}`}>
                        {result.action.replace("_", " ").toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.logo_url && (
                      <div className="text-xs text-gray-500 max-w-md truncate">{result.logo_url}</div>
                    )}
                    {result.error && <div className="text-xs text-red-500 max-w-md">Error: {result.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>After fixing the mappings:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Go to <strong>/debug/logo-matching-test</strong> to test the logo matching
              </li>
              <li>
                Go to <strong>/debug/check-current-logos</strong> to verify the database state
              </li>
              <li>Check the commitment cards to see if logos are now displaying correctly</li>
              <li>
                If Hickory Ridge logo still doesn't show, you may need to upload the actual logo file to
                /public/hickory-ridge-logo.png
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
