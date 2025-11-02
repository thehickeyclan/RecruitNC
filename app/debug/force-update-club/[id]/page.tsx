"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function ForceUpdateClubPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [result, setResult] = useState<any>(null)
  const [wrestlingClub, setWrestlingClub] = useState<string>("")
  const { id } = params

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)
      setSuccess(false)
      setResult(null)

      if (!wrestlingClub.trim()) {
        throw new Error("Wrestling club is required")
      }

      const response = await fetch(`/api/debug/force-update-club/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wrestlingClub }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update wrestling club")
      }

      setSuccess(true)
      setResult(data)
      setWrestlingClub("")
    } catch (error) {
      console.error("Error updating wrestling club:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Force Update Wrestling Club</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Update Wrestling Club for Athlete ID: {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="wrestlingClub" className="block text-sm font-medium text-gray-700 mb-1">
                Wrestling Club
              </label>
              <Input
                id="wrestlingClub"
                value={wrestlingClub}
                onChange={(e) => setWrestlingClub(e.target.value)}
                placeholder="Enter wrestling club name"
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Force Update Wrestling Club"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && result && (
        <>
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Update Successful</AlertTitle>
            <AlertDescription className="text-green-700">{result.message}</AlertDescription>
          </Alert>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Before Update</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto max-h-96 p-2 bg-gray-100 rounded">
                {JSON.stringify(result.before, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>After Update</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto max-h-96 p-2 bg-gray-100 rounded">
                {JSON.stringify(result.after, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <a href={`/debug/verify-athlete/${id}`}>Verify Athlete Data</a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/admin/athletes/edit/${id}`}>Edit Athlete</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/admin/athletes">Back to Athletes</a>
        </Button>
      </div>
    </div>
  )
}
