"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { mapAthleteFromDatabase } from "@/lib/utils/athlete-mapper"

export default function AthleteFormDebugPage({ params }: { params: { id: string } }) {
  const [rawData, setRawData] = useState<any>(null)
  const [mappedData, setMappedData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { id } = params

  useEffect(() => {
    async function fetchAthleteData() {
      try {
        setLoading(true)

        // Fetch raw data from database
        const { data, error } = await supabase.from("athletes").select("*").eq("id", id).single()

        if (error) {
          throw new Error(`Error fetching athlete: ${error.message}`)
        }

        if (!data) {
          throw new Error("Athlete not found")
        }

        // Store raw data
        setRawData(data)

        // Map data using our mapper function
        const mapped = mapAthleteFromDatabase(data)
        setMappedData(mapped)
      } catch (err) {
        console.error("Error:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchAthleteData()
  }, [id])

  if (loading) {
    return <div className="container py-10">Loading athlete data...</div>
  }

  if (error) {
    return <div className="container py-10 text-red-500">Error: {error}</div>
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Athlete Form Debug</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Raw Database Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px] text-xs">
              {JSON.stringify(rawData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mapped Data (For Form)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px] text-xs">
              {JSON.stringify(mappedData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Required Fields Check</h2>
        <Card>
          <CardContent className="pt-6">
            <ul className="space-y-2">
              <li className="flex items-center">
                <span
                  className={`w-4 h-4 rounded-full mr-2 ${mappedData?.firstName ? "bg-green-500" : "bg-red-500"}`}
                ></span>
                <span>First Name: {mappedData?.firstName || "Missing"}</span>
              </li>
              <li className="flex items-center">
                <span
                  className={`w-4 h-4 rounded-full mr-2 ${mappedData?.lastName ? "bg-green-500" : "bg-red-500"}`}
                ></span>
                <span>Last Name: {mappedData?.lastName || "Missing"}</span>
              </li>
              <li className="flex items-center">
                <span
                  className={`w-4 h-4 rounded-full mr-2 ${mappedData?.gender ? "bg-green-500" : "bg-red-500"}`}
                ></span>
                <span>Gender: {mappedData?.gender || "Missing"}</span>
              </li>
              <li className="flex items-center">
                <span
                  className={`w-4 h-4 rounded-full mr-2 ${mappedData?.graduationYear ? "bg-green-500" : "bg-red-500"}`}
                ></span>
                <span>Graduation Year: {mappedData?.graduationYear || "Missing"}</span>
              </li>
              <li className="flex items-center">
                <span
                  className={`w-4 h-4 rounded-full mr-2 ${mappedData?.commitmentDate ? "bg-green-500" : "bg-red-500"}`}
                ></span>
                <span>Commitment Date: {mappedData?.commitmentDate || "Missing"}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex gap-4">
        <Button asChild>
          <a href={`/admin/athletes/edit/${id}`}>Go to Edit Form</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/admin/athletes">Back to Athletes</a>
        </Button>
      </div>
    </div>
  )
}
