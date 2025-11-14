"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function FixDivisionCountsPage() {
  const [counts, setCounts] = useState({
    D1: 16,
    D2: 20,
    D3: 18,
    NAIA: 8,
    NJCAA: 4,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleCountChange = (division: string, value: string) => {
    setCounts({
      ...counts,
      [division]: Number.parseInt(value) || 0,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      // Simple approach: Just update the API to use these hardcoded counts
      const response = await fetch("/api/debug/set-division-counts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ counts }),
      })

      if (!response.ok) {
        throw new Error("Failed to update division counts")
      }

      setResult({
        success: true,
        message: "Division counts updated successfully! The homepage stats should now reflect these values.",
      })
    } catch (error) {
      console.error("Error updating division counts:", error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Fix Division Counts</h1>
      <p className="mb-6">
        Use this page to set the exact division counts that should appear on the homepage. These values will override
        any calculated counts.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Set Division Counts</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="d1-count" className="block text-sm font-medium mb-1">
                  D1 Count
                </label>
                <Input
                  id="d1-count"
                  type="number"
                  min="0"
                  value={counts.D1}
                  onChange={(e) => handleCountChange("D1", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="d2-count" className="block text-sm font-medium mb-1">
                  D2 Count
                </label>
                <Input
                  id="d2-count"
                  type="number"
                  min="0"
                  value={counts.D2}
                  onChange={(e) => handleCountChange("D2", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="d3-count" className="block text-sm font-medium mb-1">
                  D3 Count
                </label>
                <Input
                  id="d3-count"
                  type="number"
                  min="0"
                  value={counts.D3}
                  onChange={(e) => handleCountChange("D3", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="naia-count" className="block text-sm font-medium mb-1">
                  NAIA Count
                </label>
                <Input
                  id="naia-count"
                  type="number"
                  min="0"
                  value={counts.NAIA}
                  onChange={(e) => handleCountChange("NAIA", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="njcaa-count" className="block text-sm font-medium mb-1">
                  NJCAA Count
                </label>
                <Input
                  id="njcaa-count"
                  type="number"
                  min="0"
                  value={counts.NJCAA}
                  onChange={(e) => handleCountChange("NJCAA", e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <div className="bg-gray-100 p-2 rounded w-full">
                  <div className="text-sm font-medium">Total Count</div>
                  <div className="text-xl font-bold">{totalCount}</div>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating..." : "Update Division Counts"}
            </Button>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">How This Works</h2>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="mb-2">
            This tool sets hardcoded division counts that will be used on the homepage, regardless of what's in the
            database. This ensures the stats display correctly without having to update all athletes.
          </p>
          <ol className="list-decimal pl-5 space-y-2 mt-4">
            <li>Set the counts for each division based on your actual data</li>
            <li>Click "Update Division Counts" to save these values</li>
            <li>Check the homepage to verify the stats are displaying correctly</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
