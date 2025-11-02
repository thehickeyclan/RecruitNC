"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Database, RefreshCw } from "lucide-react"

interface CleanupStats {
  initialCount: number
  finalCount: number
  removedCount: number
  duplicatesRemoved: number
  typeBreakdown: { [key: string]: number }
}

export default function CleanupLogoMappingsPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    statistics?: CleanupStats
    error?: string
  } | null>(null)

  const runCleanup = async () => {
    setIsRunning(true)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/cleanup-logo-mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to run cleanup",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Logo Mappings Cleanup</h1>
        <p className="text-muted-foreground">
          Phase 1: Standardize entity types, remove duplicates, and clean up broken data
        </p>
      </div>

      <div className="grid gap-6">
        {/* Cleanup Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Cleanup Actions
            </CardTitle>
            <CardDescription>
              This will standardize entity types, remove duplicates, and clean up broken URLs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Standardization:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• High-School → highschool</li>
                  <li>• College/University → college</li>
                  <li>• Club variations → club</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Cleanup:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Remove duplicate entries</li>
                  <li>• Fix common entity names</li>
                  <li>• Remove broken URLs</li>
                </ul>
              </div>
            </div>

            <Button onClick={runCleanup} disabled={isRunning} className="w-full" size="lg">
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Cleanup...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Logo Mappings Cleanup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Card */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Cleanup Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  {result.message}
                  {result.error && ` - ${result.error}`}
                </AlertDescription>
              </Alert>

              {result.success && result.statistics && (
                <div className="space-y-4">
                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{result.statistics.initialCount}</div>
                      <div className="text-sm text-muted-foreground">Initial Records</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{result.statistics.finalCount}</div>
                      <div className="text-sm text-muted-foreground">Final Records</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{result.statistics.removedCount}</div>
                      <div className="text-sm text-muted-foreground">Total Removed</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{result.statistics.duplicatesRemoved}</div>
                      <div className="text-sm text-muted-foreground">Duplicates</div>
                    </div>
                  </div>

                  {/* Entity Type Breakdown */}
                  <div>
                    <h4 className="font-medium mb-2">Entity Type Breakdown:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(result.statistics.typeBreakdown).map(([type, count]) => (
                        <Badge key={type} variant="secondary">
                          {type}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next Steps Card */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>After cleanup is complete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                ✅ <strong>Phase 1 Complete:</strong> Database standardized and cleaned
              </p>
              <p>
                🔄 <strong>Phase 2:</strong> Fix Media Manager Pro upload categories
              </p>
              <p>
                🔄 <strong>Phase 3:</strong> Create simple logo upload form
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
