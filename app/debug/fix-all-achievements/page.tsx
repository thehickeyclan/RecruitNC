"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function FixAllAchievementsPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function fixAllAchievements() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/fix-all-achievements")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fix achievements")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error("Error fixing achievements:", err)
      setError(err instanceof Error ? err.message : "Failed to fix achievements")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Fix All Achievements</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fix Malformed Achievements Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This tool will scan all athletes and fix any malformed achievements data, such as strings with extra quotes.
          </p>
          <Button onClick={fixAllAchievements} disabled={loading}>
            {loading ? "Fixing..." : "Fix All Achievements"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <>
          <Alert className="bg-green-50 border-green-200 mb-6">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>{result.message}</AlertTitle>
            <AlertDescription>
              <p>Total athletes processed: {result.totalAthletes}</p>
              <p>Athletes fixed: {result.fixedAthletes.length}</p>
              <p>Errors: {result.errors.length}</p>
            </AlertDescription>
          </Alert>

          {result.fixedAthletes.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Fixed Athletes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-left py-2 px-2">Before</th>
                        <th className="text-left py-2 px-2">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.fixedAthletes.map((athlete: any) => (
                        <tr key={athlete.id} className="border-b">
                          <td className="py-2 px-2">
                            <a href={`/debug/athlete-data/${athlete.id}`} className="text-blue-600 hover:underline">
                              {athlete.name}
                            </a>
                          </td>
                          <td className="py-2 px-2 font-mono text-xs">{JSON.stringify(athlete.before)}</td>
                          <td className="py-2 px-2 font-mono text-xs">{JSON.stringify(athlete.after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {result.errors.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-left py-2 px-2">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((error: any) => (
                        <tr key={error.id} className="border-b">
                          <td className="py-2 px-2">
                            <a href={`/debug/athlete-data/${error.id}`} className="text-blue-600 hover:underline">
                              {error.name}
                            </a>
                          </td>
                          <td className="py-2 px-2 text-red-600">{error.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
