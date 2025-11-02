"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, RefreshCw, CheckCircle, XCircle } from "lucide-react"

interface ColumnCheckResult {
  success: boolean
  message: string
  columns: string[]
  sampleData: any
  error?: string
}

export default function CheckAthleteColumnsPage() {
  const [data, setData] = useState<ColumnCheckResult | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchColumns = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-athlete-columns")
      const result = await response.json()
      setData(result)
    } catch (error) {
      setData({
        success: false,
        message: "Failed to fetch",
        columns: [],
        sampleData: null,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchColumns()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Database Column Inspector</h1>
          <p className="text-gray-600">Check available columns in the athletes table</p>
        </div>
        <Button onClick={fetchColumns} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Athletes Table Schema
              {data.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </CardTitle>
            <CardDescription>{data.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{data.error}</p>
              </div>
            )}

            {data.success && data.columns.length > 0 && (
              <>
                <div>
                  <h3 className="font-medium mb-2">Available Columns ({data.columns.length})</h3>
                  <div className="flex flex-wrap gap-1">
                    {data.columns.map((column) => (
                      <Badge key={column} variant="outline" className="text-xs">
                        {column}
                      </Badge>
                    ))}
                  </div>
                </div>

                {data.sampleData && (
                  <div>
                    <h3 className="font-medium mb-2">Sample Data</h3>
                    <div className="bg-gray-50 p-3 rounded-md overflow-x-auto">
                      <pre className="text-xs text-gray-700">{JSON.stringify(data.sampleData, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {loading && !data && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Checking database schema...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
