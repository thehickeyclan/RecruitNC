"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

export default function ClaimTestPage() {
  const [athleteId, setAthleteId] = useState("") // Start empty until we get real IDs
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [athleteIds, setAthleteIds] = useState<any>(null)
  const [loadingIds, setLoadingIds] = useState(true)

  const { session } = useAuth()
  const user = session?.user

  // Load available athlete IDs on component mount
  useEffect(() => {
    const loadAthleteIds = async () => {
      try {
        const response = await fetch("/api/debug/check-athlete-ids")
        const data = await response.json()
        setAthleteIds(data)

        // Set default to Liam's actual ID if found
        if (data.liamHickeyResults && data.liamHickeyResults.length > 0) {
          setAthleteId(data.liamHickeyResults[0].id)
        } else if (data.sampleAthletes && data.sampleAthletes.length > 0) {
          setAthleteId(data.sampleAthletes[0].id)
        }
      } catch (error) {
        console.error("Error loading athlete IDs:", error)
      } finally {
        setLoadingIds(false)
      }
    }

    loadAthleteIds()
  }, [])

  const testClaimProfile = async () => {
    if (!athleteId.trim()) {
      setResult({ error: "Please enter an athlete ID" })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      console.log("🔐 Testing claim profile for athlete:", athleteId)

      const response = await fetch("/api/athletes/claim-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ athleteId }),
      })

      const data = await response.json()

      console.log("🔐 Claim profile response:", {
        status: response.status,
        data,
      })

      setResult({
        status: response.status,
        success: response.ok,
        ...data,
      })
    } catch (error) {
      console.error("🔐 Claim profile error:", error)
      setResult({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Claim Profile Test</h1>

      <Card>
        <CardHeader>
          <CardTitle>Current User</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-2">
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>ID:</strong> {user.id}
              </p>
              <p className="text-green-600">✅ Authenticated</p>
            </div>
          ) : (
            <p className="text-red-600">❌ Not authenticated - please sign in first</p>
          )}
        </CardContent>
      </Card>

      {loadingIds ? (
        <Card>
          <CardContent className="p-6">
            <p>Loading available athlete IDs...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {athleteIds && (
            <Card>
              <CardHeader>
                <CardTitle>Available Athletes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {athleteIds.liamHickeyResults && athleteIds.liamHickeyResults.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-600">Liam Hickey Found:</h4>
                      {athleteIds.liamHickeyResults.map((athlete: any) => (
                        <div key={athlete.id} className="ml-4 p-2 bg-green-50 rounded">
                          <p>
                            <strong>Name:</strong> {athlete.name}
                          </p>
                          <p>
                            <strong>ID:</strong> {athlete.id}
                          </p>
                          <p>
                            <strong>College:</strong> {athlete.college || "Not specified"}
                          </p>
                          <p>
                            <strong>Claimed:</strong> {athlete.claimed_by_user_id ? "Yes" : "No"}
                          </p>
                          <Button size="sm" onClick={() => setAthleteId(athlete.id)} className="mt-2">
                            Use This ID
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold">Sample Athletes:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {athleteIds.sampleAthletes?.map((athlete: any) => (
                        <div key={athlete.id} className="ml-4 p-2 bg-gray-50 rounded">
                          <p>
                            <strong>Name:</strong> {athlete.name}
                          </p>
                          <p>
                            <strong>ID:</strong> {athlete.id}
                          </p>
                          <p>
                            <strong>College:</strong> {athlete.college || "Not specified"}
                          </p>
                          <p>
                            <strong>Claimed:</strong> {athlete.claimed_by_user_id ? "Yes" : "No"}
                          </p>
                          <Button size="sm" onClick={() => setAthleteId(athlete.id)} className="mt-2">
                            Use This ID
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>Total athletes in database: {athleteIds.totalAthletes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Test Claim Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Athlete ID (UUID format)</label>
                <Input
                  type="text"
                  placeholder="Enter athlete UUID"
                  value={athleteId}
                  onChange={(e) => setAthleteId(e.target.value)}
                />
              </div>

              <Button onClick={testClaimProfile} disabled={isLoading || !user || !athleteId.trim()} className="w-full">
                {isLoading ? "Testing Claim..." : "Test Claim Profile"}
              </Button>

              {!user && (
                <p className="text-sm text-gray-600">
                  You need to be signed in to test profile claiming.
                  <a href="/debug/simple-signin" className="text-blue-600 underline ml-1">
                    Sign in here
                  </a>
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              Claim Result
              {result.success ? (
                <span className="text-green-600 ml-2">✅ Success</span>
              ) : (
                <span className="text-red-600 ml-2">❌ Failed</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <a href="/athletes" className="text-blue-600 underline">
              Browse All Athletes
            </a>
          </div>
          <div>
            <a href="/debug/simple-signin" className="text-blue-600 underline">
              Authentication Test Page
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
