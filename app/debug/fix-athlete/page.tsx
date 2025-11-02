"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"

export default function FixAthletePage() {
  const [athleteId, setAthleteId] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fixAthleteData = async () => {
    if (!athleteId) return

    setLoading(true)
    setError(null)
    setSuccess(false)
    setResult(null)

    try {
      const response = await fetch(`/api/debug/fix-athlete-data?id=${athleteId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fix athlete data")
      }

      setResult(data)
      setSuccess(true)
    } catch (err: any) {
      console.error("Error fixing athlete data:", err)
      setError(err.message || "Failed to fix athlete data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Fix Athlete Data</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fix Missing Fields</CardTitle>
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
            <Button onClick={fixAthleteData} disabled={loading || !athleteId}>
              {loading ? "Processing..." : "Fix Data"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                {result.message || "Athlete data fixed successfully"}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Updates Applied</h3>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[300px] text-xs">
                  {JSON.stringify(result.updates, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Before & After</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Before:</h4>
                    <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[300px] text-xs">
                      {JSON.stringify(result.before, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">After:</h4>
                    <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[300px] text-xs">
                      {JSON.stringify(result.after, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button asChild variant="outline">
                <a href="/admin/athletes" target="_blank" rel="noopener noreferrer">
                  Go to Athletes Admin
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
