"use client"

import { useState, useEffect } from "react"
import { FixedCommitmentCardFinal } from "@/components/fixed-commitment-card-final"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestFinalFix() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAthletes()
  }, [])

  const loadAthletes = async () => {
    try {
      const response = await fetch("/api/athletes")
      const data = await response.json()
      console.log("Full athletes response:", data)

      // Get first 8 athletes for testing
      const testAthletes = (data.athletes || []).slice(0, 8)
      console.log("Test athletes:", testAthletes)
      setAthletes(testAthletes)
    } catch (error) {
      console.error("Error loading athletes:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading final fix test...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-green-600">✅ FINAL COMPREHENSIVE FIX TEST</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Production-Ready Cards with Complete Field Handling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              These cards check ALL possible field variations and use the proven working logo API pattern. Debug info
              shows exactly what data is found and used.
            </p>

            <div className="bg-blue-50 p-4 rounded border">
              <h3 className="font-bold mb-2">What This Fix Does:</h3>
              <ul className="text-sm space-y-1">
                <li>✅ Checks ALL club field variations: wrestlingclub, club, wrestlingClub, wrestling_club</li>
                <li>✅ Uses the exact same API pattern that works for Jackson Rowling/Darkhorse</li>
                <li>✅ Shows debug info to see exactly what data is found</li>
                <li>✅ Has proper fallbacks for missing logos</li>
                <li>✅ Handles all field name variations (graduationyear vs graduation_year, etc.)</li>
              </ul>
            </div>

            <Button onClick={loadAthletes} className="mb-4">
              Reload Athletes
            </Button>

            <div className="text-sm text-gray-600 mb-4">
              Showing {athletes.length} athletes with full debug information:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {athletes.map((athlete) => (
                <div key={athlete.id} className="space-y-2">
                  <FixedCommitmentCardFinal athlete={athlete} />
                  <div className="text-xs bg-gray-50 p-2 rounded border">
                    <div>
                      <strong>Name:</strong> {athlete.name}
                    </div>
                    <div>
                      <strong>College:</strong> {athlete.college || "N/A"}
                    </div>
                    <div>
                      <strong>HS:</strong> {athlete.highschool || "N/A"}
                    </div>
                    <div>
                      <strong>Club:</strong>{" "}
                      {athlete.wrestlingclub ||
                        athlete.club ||
                        athlete.wrestlingClub ||
                        athlete.wrestling_club ||
                        "N/A"}
                    </div>
                    <div>
                      <strong>Weight:</strong> {athlete.weightclass || "N/A"}
                    </div>
                    <div>
                      <strong>Year:</strong> {athlete.graduationyear || athlete.graduation_year || "N/A"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
