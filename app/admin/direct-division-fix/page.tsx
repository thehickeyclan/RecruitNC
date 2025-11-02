"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AuthGuard } from "@/components/auth-guard"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function DirectDivisionFixPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runDirectFix = async () => {
    if (!confirm("This will directly update all athlete divisions based on their college names. Continue?")) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/direct-division-fix", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update divisions")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error("Error updating divisions:", err)
      setError(err instanceof Error ? err.message : "Failed to update divisions")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Direct Division Fix</h1>
        <p className="text-gray-600 mb-8">
          This page will directly update athlete divisions based on their college names, without relying on any mapping
          tables or complex logic.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Update All Athlete Divisions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                This will update all athlete divisions based on their college names. The update uses direct SQL queries
                with pattern matching to ensure accurate division assignments.
              </p>
              <Button onClick={runDirectFix} disabled={loading}>
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Run Direct Division Fix
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Update Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6" variant="default">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Updated {result.totalUpdated} athlete records with correct divisions.
                  </AlertDescription>
                </Alert>

                <h3 className="text-lg font-semibold mb-2">Division Counts</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Division</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.divisionCounts.map((item: any) => (
                      <TableRow key={item.division}>
                        <TableCell className="font-medium">{item.division}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
