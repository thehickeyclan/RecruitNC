"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

export default function DivisionEditorInteractive() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [collegeMap, setCollegeMap] = useState<Record<string, string>>({})
  const [showCollegeMap, setShowCollegeMap] = useState(false)

  // Standard division options
  const divisions = ["D1", "D2", "D3", "NAIA", "NJCAA"]

  // Fetch athletes data
  const fetchAthletes = async () => {
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

  // Initial data fetch
  useEffect(() => {
    fetchAthletes()
  }, [])

  // Update an athlete's division
  const updateAthleteDivision = (id: string, division: string) => {
    setAthletes((prevAthletes) =>
      prevAthletes.map((athlete) => (athlete.id === id ? { ...athlete, division } : athlete)),
    )

    // Update college map
    const athlete = athletes.find((a) => a.id === id)
    if (athlete && athlete.college) {
      setCollegeMap((prev) => ({
        ...prev,
        [athlete.college.toLowerCase()]: division,
      }))
    }
  }

  // Apply division to all athletes from the same college
  const applyToCollege = (college: string, division: string) => {
    setAthletes((prevAthletes) =>
      prevAthletes.map((athlete) =>
        athlete.college && athlete.college.toLowerCase() === college.toLowerCase() ? { ...athlete, division } : athlete,
      ),
    )

    // Update college map
    setCollegeMap((prev) => ({
      ...prev,
      [college.toLowerCase()]: division,
    }))
  }

  // Save all changes
  const saveChanges = async () => {
    setSaveStatus("Saving changes...")
    let successCount = 0
    let errorCount = 0

    // Save athlete division updates
    for (const athlete of athletes) {
      try {
        const response = await fetch(`/api/athletes/${athlete.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ division: athlete.division }),
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (err) {
        console.error(`Error updating athlete ${athlete.id}:`, err)
        errorCount++
      }
    }

    // Save college-to-division mapping
    try {
      await fetch("/api/debug/save-college-division-map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ collegeMap }),
      })
    } catch (err) {
      console.error("Error saving college map:", err)
    }

    setSaveStatus(`Saved ${successCount} athletes. ${errorCount > 0 ? `Failed: ${errorCount}` : ""}`)
    setTimeout(() => {
      setSaveStatus(null)
    }, 5000)
  }

  // Apply college map to all athletes
  const applyCollegeMap = () => {
    setAthletes((prevAthletes) =>
      prevAthletes.map((athlete) => {
        if (athlete.college && collegeMap[athlete.college.toLowerCase()]) {
          return { ...athlete, division: collegeMap[athlete.college.toLowerCase()] }
        }
        return athlete
      }),
    )
  }

  // Filter athletes based on search term
  const filteredAthletes = useMemo(() => {
    return athletes.filter(
      (athlete) =>
        athlete.name.toLowerCase().includes(filter.toLowerCase()) ||
        (athlete.college && athlete.college.toLowerCase().includes(filter.toLowerCase())) ||
        (athlete.division && athlete.division.toLowerCase().includes(filter.toLowerCase())),
    )
  }, [athletes, filter])

  // Group athletes by college
  const collegeGroups = useMemo(() => {
    const groups: Record<string, any[]> = {}
    filteredAthletes.forEach((athlete) => {
      const college = athlete.college || "Unknown"
      if (!groups[college]) {
        groups[college] = []
      }
      groups[college].push(athlete)
    })
    return groups
  }, [filteredAthletes])

  // Calculate division breakdown
  const divisionBreakdown = useMemo(() => {
    const counts = {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
      Unknown: 0,
    }

    athletes.forEach((athlete) => {
      if (!athlete.division) {
        counts.Unknown++
      } else if (counts[athlete.division as keyof typeof counts] !== undefined) {
        counts[athlete.division as keyof typeof counts]++
      } else {
        counts.Unknown++
      }
    })

    return counts
  }, [athletes])

  // Prepare chart data
  const chartData = useMemo(() => {
    return Object.entries(divisionBreakdown)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
  }, [divisionBreakdown])

  // Chart colors
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6b7280"]

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Interactive Division Editor</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Button onClick={fetchAthletes} disabled={loading} className="w-full md:w-auto">
                {loading ? "Loading..." : "Refresh Data"}
              </Button>

              <div className="flex-1">
                <Input
                  placeholder="Filter by name, college, or division..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button onClick={saveChanges} className="w-full md:w-auto bg-green-600 hover:bg-green-700">
                Save All Changes
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <Button onClick={() => setShowCollegeMap(!showCollegeMap)} variant="outline" className="w-full md:w-auto">
                {showCollegeMap ? "Hide College Map" : "Show College Map"}
              </Button>

              <Button onClick={applyCollegeMap} variant="outline" className="w-full md:w-auto">
                Apply College Map to All
              </Button>
            </div>

            {saveStatus && (
              <Alert className="mt-4">
                <AlertDescription>{saveStatus}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Division Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} athletes`, "Count"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {Object.entries(divisionBreakdown).map(([division, count]) => (
                <div key={division} className="text-center">
                  <div className="font-semibold">{division}</div>
                  <div className="text-2xl font-bold">{count}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <div className="text-sm text-gray-500">Total Athletes</div>
              <div className="text-2xl font-bold">{athletes.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showCollegeMap && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>College-to-Division Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(collegeMap).map(([college, division]) => (
                <div key={college} className="border p-3 rounded-lg">
                  <div className="font-medium">{college}</div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm text-gray-500">Maps to:</div>
                    <div className="font-semibold">{division}</div>
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(collegeMap).length === 0 && (
              <div className="text-center py-4 text-gray-500">No college mappings yet</div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {Object.entries(collegeGroups).map(([college, collegeAthletes]) => (
          <Card key={college}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{college}</CardTitle>
              <div className="flex gap-2">
                {divisions.map((division) => (
                  <Button key={division} size="sm" variant="outline" onClick={() => applyToCollege(college, division)}>
                    Set All {division}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {collegeAthletes.map((athlete) => (
                  <div key={athlete.id} className="border p-4 rounded-lg">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div>
                        <h3 className="font-medium">{athlete.name}</h3>
                        <p className="text-sm text-gray-500">
                          {athlete.graduationyear ? `Class of ${athlete.graduationyear}` : "No graduation year"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-sm">Division:</div>
                          <Select
                            value={athlete.division || ""}
                            onValueChange={(value) => updateAthleteDivision(athlete.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {divisions.map((div) => (
                                <SelectItem key={div} value={div}>
                                  {div}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {divisions.map((div) => (
                            <Button
                              key={div}
                              size="sm"
                              variant={athlete.division === div ? "default" : "outline"}
                              onClick={() => updateAthleteDivision(athlete.id, div)}
                            >
                              {div}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && <div className="text-center py-8">Loading athletes...</div>}

      {!loading && filteredAthletes.length === 0 && (
        <div className="text-center py-8">No athletes found matching your filter.</div>
      )}

      <div className="fixed bottom-4 right-4">
        <Button onClick={saveChanges} size="lg" className="bg-green-600 hover:bg-green-700">
          Save All Changes
        </Button>
      </div>
    </div>
  )
}
