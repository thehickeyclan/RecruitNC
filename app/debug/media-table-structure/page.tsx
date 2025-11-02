"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Check, AlertCircle, Database } from "lucide-react"

export default function MediaTableStructurePage() {
  const [loading, setLoading] = useState(false)
  const [structure, setStructure] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [fixLoading, setFixLoading] = useState(false)
  const [fixResult, setFixResult] = useState<any>(null)
  const [fixError, setFixError] = useState<string | null>(null)

  const requiredColumns = [
    "id",
    "file_name",
    "college_name",
    "alt_text",
    "division",
    "entity_type",
    "url",
    "blob_url",
    "file_size",
    "mime_type",
    "width",
    "height",
    "tags",
    "description",
    "is_active",
    "created_at",
    "updated_at",
  ]

  const handleCheckStructure = async () => {
    setLoading(true)
    setError(null)
    setStructure(null)

    try {
      const response = await fetch("/api/debug/check-media-table-structure")
      const data = await response.json()

      setStructure(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleFixStructure = async () => {
    setFixLoading(true)
    setFixError(null)
    setFixResult(null)

    try {
      const response = await fetch("/api/debug/fix-media-table-structure", {
        method: "POST",
      })

      const data = await response.json()
      setFixResult(data)
    } catch (err) {
      setFixError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setFixLoading(false)
    }
  }

  // Get current columns from structure
  const currentColumns = structure?.columns || []
  const columnsCount = currentColumns.length

  // Check which required columns are missing
  const missingColumns = requiredColumns.filter((col) => !currentColumns.some((c: any) => c.column_name === col))

  const sqlScript = `
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT,
  college_name TEXT,
  alt_text TEXT,
  division TEXT,
  entity_type TEXT DEFAULT 'college',
  url TEXT,
  blob_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  tags TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
  `.trim()

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Media Table Structure</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Media Items Table Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={handleCheckStructure} disabled={loading}>
              {loading ? "Checking..." : "Check Structure"}
            </Button>

            <Button onClick={handleFixStructure} disabled={fixLoading || !structure}>
              {fixLoading ? "Fixing..." : "Fix Structure"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {structure && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Table Status</h3>
                  <div
                    className={`px-3 py-1 rounded-full inline-block text-sm font-medium ${
                      structure.status === "OK" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {structure.status}
                  </div>
                </div>

                {structure.error && (
                  <div>
                    <h3 className="font-medium mb-2">Error</h3>
                    <p className="text-sm text-red-600">{structure.error}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">Current Columns ({columnsCount}):</h3>
                {columnsCount > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {currentColumns.map((col: any) => (
                      <li key={col.column_name}>
                        {col.column_name} ({col.data_type})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No columns found or table doesn't exist</p>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">Required Columns:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {requiredColumns.map((col) => (
                    <li key={col}>
                      {col} {currentColumns.some((c: any) => c.column_name === col) ? "✓" : "✗"}
                    </li>
                  ))}
                </ul>
              </div>

              {missingColumns.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Missing Columns:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {missingColumns.map((col) => (
                      <li key={col}>{col}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {fixError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fix Error</AlertTitle>
              <AlertDescription>{fixError}</AlertDescription>
            </Alert>
          )}

          {fixResult && (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
              <Check className="h-4 w-4" />
              <AlertTitle>Fix Result</AlertTitle>
              <AlertDescription>
                {fixResult.message || "Structure fixed successfully"}
                {fixResult.results && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">View Details</summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-white rounded">
                      {JSON.stringify(fixResult.results, null, 2)}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">Manual SQL Fix</h3>
            <div className="bg-gray-100 p-4 rounded-md overflow-auto">
              <pre className="text-sm">{sqlScript}</pre>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(sqlScript)
                }}
              >
                Copy SQL
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
