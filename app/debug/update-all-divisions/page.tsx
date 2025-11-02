"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function UpdateAllDivisionsPage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const divisionMappings = [
    { college: "NC State", division: "D1" },
    { college: "UNC Chapel Hill", division: "D1" },
    { college: "Appalachian State", division: "D1" },
    { college: "Campbell University", division: "D1" },
    { college: "Duke University", division: "D1" },
    { college: "Gardner-Webb", division: "D1" },
    { college: "High Point University", division: "D1" },
    { college: "Virginia Tech", division: "D1" },

    { college: "Belmont Abbey", division: "D2" },
    { college: "UNC Pembroke", division: "D2" },
    { college: "Queens University", division: "D2" },
    { college: "Limestone University", division: "D2" },
    { college: "Coker University", division: "D2" },
    { college: "Newberry College", division: "D2" },
    { college: "Mars Hill University", division: "D2" },
    { college: "King University", division: "D2" },
    { college: "Barton College", division: "D2" },
    { college: "Emmanuel College", division: "D2" },

    { college: "Greensboro College", division: "D3" },
    { college: "Guilford College", division: "D3" },
    { college: "Methodist University", division: "D3" },
    { college: "NC Wesleyan", division: "D3" },
    { college: "Ferrum College", division: "D3" },
    { college: "Roanoke College", division: "D3" },

    { college: "St. Andrews University", division: "NAIA" },
    { college: "Bluefield University", division: "NAIA" },
    { college: "Truett McConnell", division: "NAIA" },

    { college: "Rowan-Cabarrus Community College", division: "NJCAA" },
    { college: "Wake Tech", division: "NJCAA" },
    { college: "Central Carolina Community College", division: "NJCAA" },
    { college: "Spartanburg Methodist College", division: "NJCAA" },
  ]

  const updateAllDivisions = async () => {
    setLoading(true)
    setError(null)
    setStatus("Starting updates...")

    let successCount = 0
    let errorCount = 0

    for (const mapping of divisionMappings) {
      try {
        setStatus(`Updating ${mapping.college} to ${mapping.division}...`)

        const response = await fetch("/api/update-college-divisions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            college: mapping.college,
            division: mapping.division,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to update ${mapping.college}`)
        }

        successCount++
      } catch (err) {
        console.error(`Error updating ${mapping.college}:`, err)
        errorCount++
      }
    }

    setStatus(`Updates complete. ${successCount} successful, ${errorCount} failed.`)
    setLoading(false)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Update All Divisions</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Division Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This will update all athletes at the following colleges to have the specified division:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {divisionMappings.map((mapping, index) => (
              <div key={index} className="border p-3 rounded-lg">
                <p className="font-medium">{mapping.college}</p>
                <p className="text-sm">Division: {mapping.division}</p>
              </div>
            ))}
          </div>

          <Button onClick={updateAllDivisions} disabled={loading} className="mt-6">
            {loading ? "Updating..." : "Update All Divisions"}
          </Button>
        </CardContent>
      </Card>

      {status && (
        <Alert className="mb-4">
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
