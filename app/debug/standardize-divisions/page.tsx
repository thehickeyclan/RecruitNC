"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

// Standard division mapping
const DIVISION_MAPPING = {
  // D1 variations
  d1: "D1",
  di: "D1",
  "division i": "D1",
  "division 1": "D1",
  "ncaa d1": "D1",
  "ncaa di": "D1",
  "ncaa division i": "D1",
  "ncaa division 1": "D1",

  // D2 variations
  d2: "D2",
  dii: "D2",
  "division ii": "D2",
  "division 2": "D2",
  "ncaa d2": "D2",
  "ncaa dii": "D2",
  "ncaa division ii": "D2",
  "ncaa division 2": "D2",

  // D3 variations
  d3: "D3",
  diii: "D3",
  "division iii": "D3",
  "division 3": "D3",
  "ncaa d3": "D3",
  "ncaa diii": "D3",
  "ncaa division iii": "D3",
  "ncaa division 3": "D3",

  // NAIA variations
  naia: "NAIA",

  // NJCAA/JUCO variations
  njcaa: "NJCAA",
  juco: "NJCAA",
  "junior college": "NJCAA",
}

export default function StandardizeDivisionsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    details?: {
      total: number
      updated: number
      unchanged: number
      byDivision: Record<string, number>
    }
  } | null>(null)

  const handleStandardize = async () => {
    setLoading(true)
    setResult(null)

    try {
      // First, get all athletes with college commitments
      const athletesResponse = await fetch("/api/athletes?includeCollege=true", {
        cache: "no-store",
      })

      if (!athletesResponse.ok) {
        throw new Error("Failed to fetch athletes")
      }

      const athletes = await athletesResponse.json()
      const committedAthletes = athletes.filter((athlete: any) => athlete.college)

      // Track statistics
      const stats = {
        total: committedAthletes.length,
        updated: 0,
        unchanged: 0,
        byDivision: {} as Record<string, number>,
      }

      // Process each athlete
      for (const athlete of committedAthletes) {
        const currentDivision = athlete.division || ""

        // Skip if no division
        if (!currentDivision) continue

        // Check if division needs standardization
        const normalizedDivision = currentDivision.toLowerCase().trim()
        const standardDivision = DIVISION_MAPPING[normalizedDivision]

        // If we have a mapping and it's different from current value
        if (standardDivision && standardDivision !== currentDivision) {
          // Update the athlete's division
          const updateResponse = await fetch(`/api/athletes/${athlete.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ division: standardDivision }),
          })

          if (updateResponse.ok) {
            stats.updated++
            stats.byDivision[standardDivision] = (stats.byDivision[standardDivision] || 0) + 1
          }
        } else {
          stats.unchanged++
        }
      }

      setResult({
        success: true,
        message: `Successfully standardized ${stats.updated} athlete divisions.`,
        details: stats,
      })
    } catch (error) {
      console.error("Error standardizing divisions:", error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Standardize Division Values</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Division Standardization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This tool will standardize all division values in the database to use consistent formatting. All variations
            of division names will be converted to the standard format:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-100 p-3 rounded">
              <h3 className="font-semibold">D1</h3>
              <p className="text-sm text-gray-600">Standardizes: D1, DI, Division I, Division 1, NCAA D1, etc.</p>
            </div>
            <div className="bg-gray-100 p-3 rounded">
              <h3 className="font-semibold">D2</h3>
              <p className="text-sm text-gray-600">Standardizes: D2, DII, Division II, Division 2, NCAA D2, etc.</p>
            </div>
            <div className="bg-gray-100 p-3 rounded">
              <h3 className="font-semibold">D3</h3>
              <p className="text-sm text-gray-600">Standardizes: D3, DIII, Division III, Division 3, NCAA D3, etc.</p>
            </div>
            <div className="bg-gray-100 p-3 rounded">
              <h3 className="font-semibold">NAIA</h3>
              <p className="text-sm text-gray-600">Standardizes: NAIA, naia, etc.</p>
            </div>
            <div className="bg-gray-100 p-3 rounded">
              <h3 className="font-semibold">NJCAA</h3>
              <p className="text-sm text-gray-600">Standardizes: NJCAA, JUCO, Junior College, etc.</p>
            </div>
          </div>

          <Button onClick={handleStandardize} disabled={loading} className="w-full">
            {loading ? "Standardizing..." : "Standardize All Division Values"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"} className="mb-6">
          {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>

          {result.details && (
            <div className="mt-4 pt-2 border-t border-gray-200">
              <h3 className="font-semibold mb-2">Results:</h3>
              <ul className="space-y-1 text-sm">
                <li>Total athletes processed: {result.details.total}</li>
                <li>Athletes updated: {result.details.updated}</li>
                <li>Athletes unchanged: {result.details.unchanged}</li>

                {Object.entries(result.details.byDivision).length > 0 && (
                  <li className="mt-2">
                    <span className="font-semibold">Updates by division:</span>
                    <ul className="ml-4 mt-1">
                      {Object.entries(result.details.byDivision).map(([division, count]) => (
                        <li key={division}>
                          {division}: {count} athlete{count !== 1 ? "s" : ""}
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
        </Alert>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <div className="bg-blue-50 p-4 rounded-lg">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              After standardizing, go to{" "}
              <a href="/debug/view-divisions" className="text-blue-600 hover:underline">
                View Divisions
              </a>{" "}
              to verify the changes
            </li>
            <li>
              Check the{" "}
              <a href="/" className="text-blue-600 hover:underline">
                homepage
              </a>{" "}
              to see if the division counts are now correct
            </li>
            <li>
              If needed, use{" "}
              <a href="/debug/update-college-division" className="text-blue-600 hover:underline">
                Update College Division
              </a>{" "}
              to update any remaining colleges
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
