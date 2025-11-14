"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Standard division formats
const STANDARD_DIVISIONS = [
  { value: "D1", label: "D1 (NCAA Division I)" },
  { value: "D2", label: "D2 (NCAA Division II)" },
  { value: "D3", label: "D3 (NCAA Division III)" },
  { value: "NAIA", label: "NAIA" },
  { value: "NJCAA", label: "NJCAA (Junior College)" },
]

export default function UpdateDivisionPage() {
  const [athleteId, setAthleteId] = useState("")
  const [division, setDivision] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!athleteId || !division) {
      setResult({
        success: false,
        message: "Please enter both athlete ID and division",
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ division }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update athlete division")
      }

      const data = await response.json()

      setResult({
        success: true,
        message: `Successfully updated athlete ${data.name} to division ${division}`,
      })
    } catch (error) {
      console.error("Error updating division:", error)
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
      <h1 className="text-2xl font-bold mb-4">Update Athlete Division</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Update Division</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="athleteId" className="block text-sm font-medium mb-1">
                Athlete ID
              </label>
              <Input
                id="athleteId"
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                placeholder="Enter athlete ID"
                required
              />
              <p className="text-xs text-gray-500 mt-1">You can find the athlete ID on the View Divisions page</p>
            </div>

            <div>
              <label htmlFor="division" className="block text-sm font-medium mb-1">
                Division
              </label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_DIVISIONS.map((div) => (
                    <SelectItem key={div.value} value={div.value}>
                      {div.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Using standardized division formats ensures consistent stats</p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating..." : "Update Division"}
            </Button>

            {result && (
              <div
                className={`mt-4 p-3 rounded ${
                  result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {result.message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            First, go to the{" "}
            <a href="/debug/view-divisions" className="text-blue-600 hover:underline">
              View Divisions
            </a>{" "}
            page to find the athlete ID
          </li>
          <li>Copy the ID of the athlete whose division you want to update</li>
          <li>Paste the ID in the form above and select the correct division</li>
          <li>Click "Update Division" to save the changes</li>
          <li>After updating, you can go back to the View Divisions page to verify the change</li>
        </ol>
      </div>

      <div className="mt-8 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2">Standardize All Divisions</h2>
        <p className="mb-4">
          To standardize all division values in the database at once, use the Standardize Divisions tool:
        </p>
        <Button asChild className="w-full">
          <a href="/debug/standardize-divisions">Go to Standardize Divisions</a>
        </Button>
      </div>
    </div>
  )
}
