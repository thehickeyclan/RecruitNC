"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AthleteDataDebugPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { id } = params

  useEffect(() => {
    async function fetchAthleteData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/debug/athlete-data/${id}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch athlete data")
        }

        const data = await response.json()
        setData(data)
        setError(null)
      } catch (err) {
        console.error("Error fetching athlete data:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch athlete data")
      } finally {
        setLoading(false)
      }
    }

    fetchAthleteData()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="mb-6 text-3xl font-bold">Athlete Data Debug</h1>
        <div className="text-center py-10">Loading athlete data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="mb-6 text-3xl font-bold">Athlete Data Debug</h1>
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
        <h1 className="text-3xl font-bold">Athlete Data Debug</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Raw Athlete Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto max-h-96 p-2 bg-gray-100 rounded">
            {JSON.stringify(data?.rawData, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Types</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto max-h-96 p-2 bg-gray-100 rounded">
            {JSON.stringify(data?.dataTypes, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Null Check</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto max-h-96 p-2 bg-gray-100 rounded">
            {JSON.stringify(data?.nullCheck, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <a href={`/admin/athletes/edit/${id}`}>Edit Athlete</a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/athletes/${id}`}>View Athlete Profile</a>
        </Button>
      </div>
    </div>
  )
}
