"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AuthGuard } from "@/components/auth-guard"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function CheckDivisionsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDivisions()
  }, [])

  const fetchDivisions = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/check-divisions")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch divisions")
      }

      const data = await response.json()
      setData(data)
    } catch (err) {
      console.error("Error fetching divisions:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch divisions")
    } finally {
      setLoading(false)
    }
  }

  // Standard division options
  const standardDivisions = ["Division I", "Division II", "Division III", "NAIA", "NJCAA"]

  return (
    <AuthGuard>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Current Division Values</h1>
        <p className="text-gray-600 mb-8">
          This page shows all unique division values currently in the database and their counts.
        </p>

        <Button onClick={fetchDivisions} variant="outline" className="mb-6">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : data ? (
          <Card>
            <CardHeader>
              <CardTitle>Division Values ({data.uniqueDivisions})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-gray-600">Total athletes with division data: {data.totalAthletes}</p>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Division</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.divisions.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.division}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>
                          {standardDivisions.includes(item.division) ? (
                            <span className="text-green-600 font-medium">Standard</span>
                          ) : (
                            <span className="text-red-600">Non-standard</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AuthGuard>
  )
}
