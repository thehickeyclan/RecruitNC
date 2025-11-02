"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, User, Database, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"

interface Athlete {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  firstName?: string
  lastName?: string
  highschool?: string
  club?: string
  college?: string
  claimed_by_user_id?: string
}

interface ApiResponse {
  success: boolean
  totalAthletes?: number
  liamHickeyResults?: Athlete[]
  sampleAthletes?: Athlete[]
  errors?: {
    liamError?: string
    sampleError?: string
  }
  error?: string
  details?: string
}

export default function LiamUuidPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/debug/check-athlete-ids")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching data:", error)
      setData({
        success: false,
        error: "Failed to fetch data",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const getAthleteName = (athlete: Athlete) => {
    return (
      athlete.name ||
      `${athlete.first_name || athlete.firstName || ""} ${athlete.last_name || athlete.lastName || ""}`.trim() ||
      "Unknown Athlete"
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <Database className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Database...</h1>
            <p className="text-gray-600">Fetching athlete data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data?.success) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <CardTitle className="text-red-900">Database Error</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-red-800 mb-4">{data?.error || "Unknown error occurred"}</p>
              {data?.details && (
                <div className="bg-red-100 p-3 rounded-lg">
                  <p className="text-sm text-red-700 font-mono">{data.details}</p>
                </div>
              )}
              <Button onClick={fetchData} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Liam Hickey UUID Lookup</h1>
          <p className="text-gray-600">Find Liam's UUID and test the claim profile system</p>
        </div>

        {/* Liam Hickey Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {data.liamHickeyResults && data.liamHickeyResults.length > 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Liam Hickey Search Results
            </CardTitle>
            <CardDescription>Searching for athletes with "Liam" in their name</CardDescription>
          </CardHeader>
          <CardContent>
            {data.liamHickeyResults && data.liamHickeyResults.length > 0 ? (
              <div className="space-y-4">
                {data.liamHickeyResults.map((athlete) => (
                  <div key={athlete.id} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{getAthleteName(athlete)}</h3>
                        <p className="text-sm text-gray-600">
                          {athlete.highschool || "No high school"} • {athlete.club || "No club"}
                        </p>
                        {athlete.college && <p className="text-sm text-blue-600 font-medium">→ {athlete.college}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(athlete.id, `${getAthleteName(athlete)}-uuid`)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          {copied === `${getAthleteName(athlete)}-uuid` ? "Copied!" : "Copy UUID"}
                        </Button>
                        <Link href={`/athletes/${athlete.id}`}>
                          <Button size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded border">
                      <p className="text-xs text-gray-500 mb-1">UUID:</p>
                      <p className="font-mono text-sm break-all">{athlete.id}</p>
                    </div>

                    <div className="mt-2 flex gap-2">
                      <Badge variant={athlete.claimed_by_user_id ? "default" : "secondary"}>
                        {athlete.claimed_by_user_id ? "Profile Claimed" : "Unclaimed Profile"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">❌ Liam Hickey Not Found</h3>
                <p className="text-gray-600 mb-4">No athletes found matching "Liam Hickey" in the database.</p>
                {data.errors?.liamError && (
                  <div className="bg-red-100 p-3 rounded-lg mb-4">
                    <p className="text-sm text-red-700">Error: {data.errors.liamError}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Database Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Athletes:</p>
                <p className="text-2xl font-bold">{data.totalAthletes || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Liam Hickey Results:</p>
                <p className="text-2xl font-bold">{data.liamHickeyResults?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Athletes for UUID Format Reference */}
        {data.sampleAthletes && data.sampleAthletes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sample UUID Formats</CardTitle>
              <CardDescription>Here are some example UUIDs from your database for reference</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.sampleAthletes.map((athlete) => (
                  <div key={athlete.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{getAthleteName(athlete)}</p>
                      <p className="text-sm font-mono text-gray-600">{athlete.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(athlete.id, `sample-${athlete.id}`)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        {copied === `sample-${athlete.id}` ? "Copied!" : "Copy"}
                      </Button>
                      <Link href={`/athletes/${athlete.id}`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/debug/claim-test">
                <Button variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Test Claim Profile System
                </Button>
              </Link>
              <Link href="/athletes">
                <Button variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Browse All Athletes
                </Button>
              </Link>
              <Link href="/debug/auth-test">
                <Button variant="outline">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Authentication Test
                </Button>
              </Link>
              <Button onClick={fetchData} variant="outline">
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Raw API Response for Debugging */}
        <Card>
          <CardHeader>
            <CardTitle>Raw API Response</CardTitle>
            <CardDescription>Full response from the API for debugging purposes</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">{JSON.stringify(data, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
