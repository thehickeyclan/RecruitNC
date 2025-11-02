"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

// Standard division mapping
const DIVISION_MAPPING: Record<string, string> = {
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

export default function ViewDivisionsPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [updateStatus, setUpdateStatus] = useState<{
    id?: string
    college?: string
    success: boolean
    message: string
  } | null>(null)
  const [standardizing, setStandardizing] = useState(false)
  const [standardizeResults, setStandardizeResults] = useState<{
    total: number
    updated: number
    unchanged: number
  } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/athletes?includeCollege=true", {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch athletes")
      }

      const data = await response.json()

      // Filter to only include athletes with college commitments
      const committedAthletes = data
        .filter((athlete: any) => athlete.college)
        .sort((a: any, b: any) => {
          // Sort by college name first
          if (a.college && b.college) {
            return a.college.localeCompare(b.college)
          }
          return 0
        })

      setAthletes(committedAthletes)
    } catch (err) {
      console.error("Error fetching athletes:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredAthletes = athletes.filter(
    (athlete) =>
      athlete.name.toLowerCase().includes(filter.toLowerCase()) ||
      (athlete.college && athlete.college.toLowerCase().includes(filter.toLowerCase())) ||
      (athlete.division && athlete.division.toLowerCase().includes(filter.toLowerCase())),
  )

  // Group athletes by college only (not by division)
  const collegeGroups: Record<string, any[]> = {}

  filteredAthletes.forEach((athlete) => {
    const college = athlete.college || "Unknown"
    if (!collegeGroups[college]) {
      collegeGroups[college] = []
    }
    collegeGroups[college].push(athlete)
  })

  // Function to update an athlete's division
  const updateAthleteDivision = async (athleteId: string, division: string) => {
    setUpdateStatus(null)
    try {
      const response = await fetch("/api/debug/update-athlete-division", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: athleteId, division }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update athlete division")
      }

      // Update the athlete in the local state
      setAthletes((prevAthletes) =>
        prevAthletes.map((athlete) => (athlete.id === athleteId ? { ...athlete, division } : athlete)),
      )

      setUpdateStatus({
        id: athleteId,
        success: true,
        message: data.message || `Updated athlete to ${division}`,
      })
    } catch (err) {
      console.error("Error updating athlete division:", err)
      setUpdateStatus({
        id: athleteId,
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  // Function to update all athletes at a college
  const updateCollegeDivision = async (college: string, division: string) => {
    setUpdateStatus(null)
    try {
      const response = await fetch("/api/debug/update-college-division", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ college, division }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update college division")
      }

      // Update all athletes at this college in the local state
      setAthletes((prevAthletes) =>
        prevAthletes.map((athlete) => (athlete.college === college ? { ...athlete, division } : athlete)),
      )

      setUpdateStatus({
        college,
        success: true,
        message: data.message || `Updated ${data.updatedCount || "all"} athletes at ${college} to ${division}`,
      })
    } catch (err) {
      console.error("Error updating college division:", err)
      setUpdateStatus({
        college,
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  // Function to standardize all division formats
  const standardizeAllDivisions = async () => {
    setStandardizing(true)
    setStandardizeResults(null)

    const results = {
      total: 0,
      updated: 0,
      unchanged: 0,
    }

    try {
      // Process each athlete
      for (const athlete of athletes) {
        if (!athlete.division) continue

        results.total++

        // Check if division needs standardization
        const normalizedDivision = athlete.division.toLowerCase().trim()
        const standardDivision = DIVISION_MAPPING[normalizedDivision]

        // If we have a mapping and it's different from current value
        if (standardDivision && standardDivision !== athlete.division) {
          // Update the athlete's division
          await updateAthleteDivision(athlete.id, standardDivision)
          results.updated++
        } else {
          results.unchanged++
        }
      }

      setStandardizeResults(results)
    } catch (err) {
      console.error("Error standardizing divisions:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setStandardizing(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">View & Edit Athlete Divisions</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <Button onClick={fetchData} disabled={loading}>
          {loading ? "Loading..." : "Refresh Data"}
        </Button>

        <Button onClick={standardizeAllDivisions} disabled={standardizing || loading} variant="outline">
          {standardizing ? "Standardizing..." : "Standardize All Divisions"}
        </Button>

        <Input
          placeholder="Filter by name, college, or division..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-md"
        />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      )}

      {updateStatus && (
        <Alert variant={updateStatus.success ? "default" : "destructive"} className="mb-4">
          {updateStatus.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{updateStatus.message}</AlertDescription>
        </Alert>
      )}

      {standardizeResults && (
        <Alert className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Standardization complete: {standardizeResults.updated} updated, {standardizeResults.unchanged} already
            standardized (total: {standardizeResults.total})
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {Object.entries(collegeGroups).map(([college, collegeAthletes]) => (
          <Card key={college}>
            <CardHeader>
              <CardTitle>{college}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left">Name</th>
                      <th className="border px-4 py-2 text-left">Graduation Year</th>
                      <th className="border px-4 py-2 text-left">Division</th>
                      <th className="border px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collegeAthletes.map((athlete) => (
                      <tr key={athlete.id}>
                        <td className="border px-4 py-2">{athlete.name}</td>
                        <td className="border px-4 py-2">{athlete.graduationyear || "N/A"}</td>
                        <td className="border px-4 py-2">{athlete.division || "None"}</td>
                        <td className="border px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant={athlete.division === "D1" ? "default" : "outline"}
                              onClick={() => updateAthleteDivision(athlete.id, "D1")}
                            >
                              D1
                            </Button>
                            <Button
                              size="sm"
                              variant={athlete.division === "D2" ? "default" : "outline"}
                              onClick={() => updateAthleteDivision(athlete.id, "D2")}
                            >
                              D2
                            </Button>
                            <Button
                              size="sm"
                              variant={athlete.division === "D3" ? "default" : "outline"}
                              onClick={() => updateAthleteDivision(athlete.id, "D3")}
                            >
                              D3
                            </Button>
                            <Button
                              size="sm"
                              variant={athlete.division === "NAIA" ? "default" : "outline"}
                              onClick={() => updateAthleteDivision(athlete.id, "NAIA")}
                            >
                              NAIA
                            </Button>
                            <Button
                              size="sm"
                              variant={athlete.division === "NJCAA" ? "default" : "outline"}
                              onClick={() => updateAthleteDivision(athlete.id, "NJCAA")}
                            >
                              NJCAA
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateCollegeDivision(college, "D1")}>
                  Set All to D1
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateCollegeDivision(college, "D2")}>
                  Set All to D2
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateCollegeDivision(college, "D3")}>
                  Set All to D3
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateCollegeDivision(college, "NAIA")}>
                  Set All to NAIA
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateCollegeDivision(college, "NJCAA")}>
                  Set All to NJCAA
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {loading && <div className="text-center py-8">Loading athletes...</div>}

      {!loading && filteredAthletes.length === 0 && (
        <div className="text-center py-8">No athletes found matching your filter.</div>
      )}
    </div>
  )
}
