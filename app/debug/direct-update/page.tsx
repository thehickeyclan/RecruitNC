"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function DirectUpdatePage() {
  const [athleteId, setAthleteId] = useState("3fbbf559-1408-4261-8116-947276fc23cc") // Lorenzo's ID
  const [wrestlingClub, setWrestlingClub] = useState("RAW")
  const [division, setDivision] = useState("Division I")
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleDirectUpdate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const supabase = createClientComponentClient()

      // First, get the current data
      const { data: currentData, error: fetchError } = await supabase
        .from("athletes")
        .select("*")
        .eq("id", athleteId)
        .single()

      if (fetchError) {
        throw new Error(`Error fetching athlete: ${fetchError.message}`)
      }

      console.log("Current athlete data:", currentData)

      // Perform the update
      const { data, error: updateError } = await supabase
        .from("athletes")
        .update({
          wrestlingClub: wrestlingClub,
          division: division,
        })
        .eq("id", athleteId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Error updating athlete: ${updateError.message}`)
      }

      setResult(data)
      console.log("Update successful:", data)
    } catch (err: any) {
      console.error("Error in direct update:", err)
      setError(err.message || "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Direct Athlete Update Test</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Update Athlete Directly</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="athleteId">Athlete ID</Label>
            <Input
              id="athleteId"
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              placeholder="Enter athlete ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wrestlingClub">Wrestling Club</Label>
            <Input
              id="wrestlingClub"
              value={wrestlingClub}
              onChange={(e) => setWrestlingClub(e.target.value)}
              placeholder="Enter wrestling club"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="division">Division</Label>
            <Input
              id="division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="Enter division"
            />
          </div>

          <Button onClick={handleDirectUpdate} disabled={loading} className="mt-4">
            {loading ? "Updating..." : "Update Directly"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-500">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mb-6 border-green-500">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Update Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
