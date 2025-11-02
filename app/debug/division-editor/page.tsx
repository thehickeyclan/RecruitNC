"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DivisionEditorPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [filter, setFilter] = useState("")

  const divisions = ["D1", "D2", "D3", "NAIA", "NJCAA"]

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

  const updateAthleteDivision = async (id: string, division: string) => {
    try {
      setUpdateStatus(`Updating athlete ${id} to ${division}...`)

      const response = await fetch(`/api/athletes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ division }),
      })

      if (!response.ok) {
        throw new Error("Failed to update athlete division")
      }

      // Update local state
      setAthletes(athletes.map((athlete) => (athlete.id === id ? { ...athlete, division } : athlete)))

      setUpdateStatus(`Successfully updated athlete to ${division}`)

      // Clear status after 3 seconds
      setTimeout(() => setUpdateStatus(null), 3000)
    } catch (err) {
      console.error("Error updating athlete division:", err)
      setUpdateStatus(`Error: ${err instanceof Error ? err.message : "Failed to update"}`)
    }
  }

  const filteredAthletes = athletes.filter(
    (athlete) =>
      athlete.name.toLowerCase().includes(filter.toLowerCase()) ||
      (athlete.college && athlete.college.toLowerCase().includes(filter.toLowerCase())),
  )

  // Group athletes by college
  const collegeGroups: Record<string, any[]> = {}

  filteredAthletes.forEach((athlete) => {
    const college = athlete.college || "Unknown"
    if (!collegeGroups[college]) {
      collegeGroups[college] = []
    }
    collegeGroups[college].push(athlete)
  })

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Division Editor</h1>

      <div className="mb-6 flex gap-4">
        <Button onClick={fetchData} disabled={loading}>
          {loading ? "Loading..." : "Refresh Data"}
        </Button>

        <Input
          placeholder="Filter by name or college..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-md"
        />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      )}

      {updateStatus && (
        <Alert className="mb-4">
          <AlertDescription>{updateStatus}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {Object.entries(collegeGroups).map(([college, collegeAthletes]) => (
          <Card key={college}>
            <CardHeader>
              <CardTitle>{college}</CardTitle>
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
                        <p className="text-sm mb-2">
                          Current Division: <span className="font-semibold">{athlete.division || "None"}</span>
                        </p>
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
    </div>
  )
}
