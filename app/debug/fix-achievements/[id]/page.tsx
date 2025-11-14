"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function FixAchievementsPage({ params }: { params: { id: string } }) {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { id } = params

  useEffect(() => {
    async function fixAchievements() {
      try {
        setLoading(true)
        const response = await fetch(`/api/debug/fix-achievements/${id}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fix achievements")
        }

        const data = await response.json()
        setResult(data)
        setError(null)
      } catch (err) {
        console.error("Error fixing achievements:", err)
        setError(err instanceof Error ? err.message : "Failed to fix achievements")
      } finally {
        setLoading(false)
      }
    }

    fixAchievements()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="mb-6 text-3xl font-bold">Fix Achievements</h1>
        <div className="text-center py-10">Fixing achievements data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="mb-6 text-3xl font-bold">Fix Achievements</h1>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Fix Achievements</h1>
      </div>

      <Alert className={result.wasFixed ? "bg-green-50 border-green-200 mb-6" : "mb-6"}>
        {result.wasFixed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <CheckCircle className="h-4 w-4" />}
        <AlertTitle>{result.message}</AlertTitle>
        <AlertDescription>
          {result.before && result.after ? (
            <div className="mt-2">
              <p>
                Before: <code>{JSON.stringify(result.before)}</code>
              </p>
              <p>
                After: <code>{JSON.stringify(result.after)}</code>
              </p>
            </div>
          ) : (
            <p>
              Current achievements: <code>{JSON.stringify(result.achievements)}</code>
            </p>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <a href={`/admin/athletes/edit/${id}`}>Edit Athlete</a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/debug/athlete-data/${id}`}>View Athlete Data</a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/athletes/${id}`}>View Athlete Profile</a>
        </Button>
      </div>
    </div>
  )
}
