"use client"

import { useState, useEffect } from "react"
import { EmergencyCommitmentCard } from "@/components/emergency-commitment-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function EmergencyCardTest() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAthletes()
  }, [])

  const loadAthletes = async () => {
    try {
      const response = await fetch("/api/athletes?limit=10")
      const data = await response.json()
      console.log("Athletes for emergency test:", data)
      setAthletes(data.athletes || [])
    } catch (error) {
      console.error("Error loading athletes:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading emergency card test...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-red-600">🚨 EMERGENCY CARD TEST</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Testing Emergency Cards with Working Logo API</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            These cards use the EXACT same API pattern that works for Jackson Rowling:
            <code>/api/logo-mappings/by-entity/[type]/[name]</code>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.slice(0, 6).map((athlete) => (
              <div key={athlete.id} className="space-y-2">
                <EmergencyCommitmentCard athlete={athlete} />
                <div className="text-xs bg-gray-100 p-2 rounded">
                  <div>
                    <strong>College:</strong> {athlete.college || "N/A"}
                  </div>
                  <div>
                    <strong>HS:</strong> {athlete.highschool || "N/A"}
                  </div>
                  <div>
                    <strong>Club:</strong> {athlete.wrestlingClub || "N/A"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
