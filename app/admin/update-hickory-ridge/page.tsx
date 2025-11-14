"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, School, Users } from "lucide-react"

interface AthleteData {
  id: string
  name: string
  highschool: string
  college: string
}

export default function UpdateHickoryRidgePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    athleteCount: number
    athletes: AthleteData[]
  } | null>(null)

  const updateHickoryRidge = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/update-hickory-ridge-logo", {
        method: "POST",
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error:", error)
      setResult({
        success: false,
        message: "Failed to update Hickory Ridge data",
        athleteCount: 0,
        athletes: [],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Update Hickory Ridge High School</h1>
        <p className="text-gray-600">Update logo and check athlete count</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Hickory Ridge Update
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={updateHickoryRidge} disabled={loading} className="w-full">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Updating..." : "Update Hickory Ridge Logo & Check Athletes"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Results
              <Badge variant={result.success ? "default" : "destructive"}>{result.athleteCount} Athletes Found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
              >
                {result.message}
              </div>

              {result.athletes && result.athletes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Hickory Ridge Athletes:</h4>
                  <div className="space-y-2">
                    {result.athletes.map((athlete) => (
                      <div key={athlete.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{athlete.name}</p>
                          <p className="text-sm text-gray-600">{athlete.highschool}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{athlete.college}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
