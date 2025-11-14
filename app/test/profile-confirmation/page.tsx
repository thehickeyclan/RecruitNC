"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function TestProfileConfirmationPage() {
  const [athleteId, setAthleteId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; error?: string } | null>(null)

  const handleTestConfirmation = async () => {
    if (!athleteId.trim()) {
      setResult({
        success: false,
        message: "Please enter an athlete ID",
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/athletes/confirm-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          athlete_id: athleteId.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Profile confirmed successfully",
        })
      } else {
        setResult({
          success: false,
          message: "Failed to confirm profile",
          error: data.error || "Unknown error",
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Profile Confirmation</h1>
        <p className="text-gray-600">Test the profile confirmation system for Phase 1 implementation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Confirmation Test</CardTitle>
          <CardDescription>
            Enter an athlete ID to test the profile confirmation system. This simulates what happens when an athlete
            clicks "Yes, This is Me" on their profile page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="athleteId">Athlete ID</Label>
            <Input
              id="athleteId"
              type="text"
              placeholder="Enter athlete ID (e.g., 123)"
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              You can find athlete IDs by visiting athlete profile pages and looking at the URL
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleTestConfirmation} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming Profile...
                </>
              ) : (
                "Test Profile Confirmation"
              )}
            </Button>
          </div>

          {result && (
            <div
              className={`p-4 rounded-lg border ${
                result.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-semibold">{result.success ? "Success!" : "Error"}</span>
              </div>
              <p className="mb-2">{result.message}</p>
              {result.error && (
                <div className="mt-2 p-2 bg-white/50 rounded text-sm">
                  <strong>Error details:</strong> {result.error}
                </div>
              )}
            </div>
          )}

          {result?.success && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">What happened:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                <li>A record was created in the athlete_confirmations table</li>
                <li>The confirmation was linked to the current user session</li>
                <li>The athlete's profile is now marked as "confirmed"</li>
                <li>This will show up in the admin dashboard</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>Next:</strong> Check the{" "}
                <a href="/admin/profile-confirmations" className="text-blue-600 underline">
                  admin dashboard
                </a>{" "}
                to see this confirmation.
              </p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Testing Tips:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Make sure you're signed in before testing</li>
              <li>Use a real athlete ID from your database</li>
              <li>Check the admin dashboard after confirming</li>
              <li>Try confirming the same profile twice to test duplicate handling</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
