"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AthleteData {
  id: string
  name: string
  college?: string
  highschool?: string
  wrestlingClub?: string
  photourl?: string
}

export default function EmergencyLogoDiagnosis() {
  const [athletes, setAthletes] = useState<AthleteData[]>([])
  const [loading, setLoading] = useState(true)
  const [logoTests, setLogoTests] = useState<any>({})

  useEffect(() => {
    loadAthletes()
  }, [])

  const loadAthletes = async () => {
    try {
      const response = await fetch("/api/athletes?limit=10")
      const data = await response.json()
      console.log("Raw athlete data:", data)
      setAthletes(data.athletes || [])
    } catch (error) {
      console.error("Error loading athletes:", error)
    } finally {
      setLoading(false)
    }
  }

  const testLogo = async (entityType: string, entityName: string) => {
    try {
      const response = await fetch(`/api/logo-mappings/by-entity/${entityType}/${encodeURIComponent(entityName)}`)
      const data = await response.json()
      return data
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const runLogoTests = async () => {
    const tests: any = {}

    for (const athlete of athletes.slice(0, 5)) {
      tests[athlete.name] = {
        athlete_data: athlete,
        logo_tests: {},
      }

      // Test college logo
      if (athlete.college) {
        tests[athlete.name].logo_tests.college = await testLogo("college", athlete.college)
      }

      // Test high school logo
      if (athlete.highschool) {
        tests[athlete.name].logo_tests.highschool = await testLogo("highschool", athlete.highschool)
      }

      // Test club logo
      if (athlete.wrestlingClub) {
        tests[athlete.name].logo_tests.club = await testLogo("club", athlete.wrestlingClub)
      }
    }

    setLogoTests(tests)
  }

  if (loading) {
    return <div>Loading athletes...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-red-600">🚨 EMERGENCY LOGO DIAGNOSIS</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Situation Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold">Athletes Loaded: {athletes.length}</h3>
            </div>

            <Button onClick={runLogoTests} className="w-full">
              Run Logo Tests on First 5 Athletes
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {athletes.slice(0, 6).map((athlete) => (
                <Card key={athlete.id} className="border-2">
                  <CardContent className="p-4">
                    <h4 className="font-bold text-lg">{athlete.name}</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>College:</strong> {athlete.college || "❌ MISSING"}
                      </div>
                      <div>
                        <strong>High School:</strong> {athlete.highschool || "❌ MISSING"}
                      </div>
                      <div>
                        <strong>Wrestling Club:</strong> {athlete.wrestlingClub || "❌ MISSING"}
                      </div>
                      <div>
                        <strong>Photo:</strong> {athlete.photourl ? "✅ HAS" : "❌ MISSING"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(logoTests).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logo Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(logoTests).map(([athleteName, data]: [string, any]) => (
                <div key={athleteName} className="border rounded p-4">
                  <h3 className="font-bold text-lg mb-4">{athleteName}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* College */}
                    <div className="border rounded p-3">
                      <h4 className="font-semibold">College</h4>
                      <p className="text-sm mb-2">Entity: {data.athlete_data.college || "N/A"}</p>
                      {data.logo_tests.college ? (
                        <div className="text-xs">
                          <div className={data.logo_tests.college.success ? "text-green-600" : "text-red-600"}>
                            {data.logo_tests.college.success ? "✅ SUCCESS" : "❌ FAILED"}
                          </div>
                          <div>URL: {data.logo_tests.college.logo_url || "None"}</div>
                          {data.logo_tests.college.error && (
                            <div className="text-red-500">Error: {data.logo_tests.college.error}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs">No test run</div>
                      )}
                    </div>

                    {/* High School */}
                    <div className="border rounded p-3">
                      <h4 className="font-semibold">High School</h4>
                      <p className="text-sm mb-2">Entity: {data.athlete_data.highschool || "N/A"}</p>
                      {data.logo_tests.highschool ? (
                        <div className="text-xs">
                          <div className={data.logo_tests.highschool.success ? "text-green-600" : "text-red-600"}>
                            {data.logo_tests.highschool.success ? "✅ SUCCESS" : "❌ FAILED"}
                          </div>
                          <div>URL: {data.logo_tests.highschool.logo_url || "None"}</div>
                          {data.logo_tests.highschool.error && (
                            <div className="text-red-500">Error: {data.logo_tests.highschool.error}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs">No test run</div>
                      )}
                    </div>

                    {/* Club */}
                    <div className="border rounded p-3">
                      <h4 className="font-semibold">Wrestling Club</h4>
                      <p className="text-sm mb-2">Entity: {data.athlete_data.wrestlingClub || "N/A"}</p>
                      {data.logo_tests.club ? (
                        <div className="text-xs">
                          <div className={data.logo_tests.club.success ? "text-green-600" : "text-red-600"}>
                            {data.logo_tests.club.success ? "✅ SUCCESS" : "❌ FAILED"}
                          </div>
                          <div>URL: {data.logo_tests.club.logo_url || "None"}</div>
                          {data.logo_tests.club.error && (
                            <div className="text-red-500">Error: {data.logo_tests.club.error}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs">No test run</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
