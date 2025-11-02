"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAthleteById } from "@/lib/athlete-service"

export default function AthleteDataDebugPage() {
  const [athleteId, setAthleteId] = useState("")
  const [athleteData, setAthleteData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAthleteData = async () => {
    if (!athleteId) return

    setLoading(true)
    setError(null)

    try {
      const data = await getAthleteById(athleteId)
      setAthleteData(data)
      if (!data) {
        setError("Athlete not found")
      }
    } catch (err) {
      console.error("Error fetching athlete data:", err)
      setError("Failed to fetch athlete data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Athlete Data Debugger</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fetch Athlete Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="athleteId" className="mb-2 block">
                Athlete ID
              </Label>
              <Input
                id="athleteId"
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                placeholder="Enter athlete ID"
              />
            </div>
            <Button onClick={fetchAthleteData} disabled={loading || !athleteId}>
              {loading ? "Loading..." : "Fetch Data"}
            </Button>
          </div>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}
        </CardContent>
      </Card>

      {athleteData && (
        <Card>
          <CardHeader>
            <CardTitle>Athlete Data for {athleteData.name || "Unknown"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Raw Database Fields</h3>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[500px] text-xs">
                  {JSON.stringify(athleteData, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Important Fields</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">ID:</span> {athleteData.id}
                  </div>
                  <div>
                    <span className="font-medium">Name:</span> {athleteData.name}
                  </div>
                  <div>
                    <span className="font-medium">First Name:</span> {athleteData.firstName}
                  </div>
                  <div>
                    <span className="font-medium">Last Name:</span> {athleteData.lastName}
                  </div>
                  <div>
                    <span className="font-medium">High School:</span> {athleteData.highschool || athleteData.highSchool}
                  </div>
                  <div>
                    <span className="font-medium">College:</span> {athleteData.college}
                  </div>
                  <div>
                    <span className="font-medium">Division:</span> {athleteData.division}
                  </div>
                  <div>
                    <span className="font-medium">Weight Class:</span>{" "}
                    {athleteData.weightclass || athleteData.weightClass}
                  </div>
                  <div>
                    <span className="font-medium">Graduation Year:</span>{" "}
                    {athleteData.graduationyear || athleteData.graduationYear}
                  </div>
                  <div>
                    <span className="font-medium">Commitment Date:</span>{" "}
                    {athleteData.commitmentdate || athleteData.commitmentDate}
                  </div>
                  <div>
                    <span className="font-medium">Photo URL:</span> {athleteData.photourl || athleteData.photoUrl}
                  </div>
                  <div>
                    <span className="font-medium">Commitment Photo URL:</span> {athleteData.commitmentPhotoUrl}
                  </div>
                  <div>
                    <span className="font-medium">Wrestling Club:</span>{" "}
                    {athleteData.wrestlingClub || athleteData.wrestlingclub}
                  </div>
                </div>

                {(athleteData.photourl || athleteData.photoUrl || athleteData.commitmentPhotoUrl) && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Image Preview</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(athleteData.photourl || athleteData.photoUrl) && (
                        <div>
                          <p className="text-sm font-medium mb-2">Profile Photo:</p>
                          <img
                            src={athleteData.photourl || athleteData.photoUrl}
                            alt="Profile"
                            className="max-w-full h-auto max-h-[200px] rounded-md border"
                            onError={(e) => {
                              e.currentTarget.src = "/wrestler-silhouette.png"
                              e.currentTarget.onerror = null
                            }}
                          />
                        </div>
                      )}

                      {athleteData.commitmentPhotoUrl && (
                        <div>
                          <p className="text-sm font-medium mb-2">Commitment Photo:</p>
                          <img
                            src={athleteData.commitmentPhotoUrl || "/placeholder.svg"}
                            alt="Commitment"
                            className="max-w-full h-auto max-h-[200px] rounded-md border"
                            onError={(e) => {
                              e.currentTarget.src = "/wrestler-silhouette.png"
                              e.currentTarget.onerror = null
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
