"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SimpleImageUpload from "@/components/simple-image-upload"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

export default function TestAthleteUploadPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("")
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const response = await fetch("/api/athletes")
        if (!response.ok) {
          throw new Error("Failed to fetch athletes")
        }

        const data = await response.json()
        setAthletes(data)
      } catch (err) {
        console.error("Error fetching athletes:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  useEffect(() => {
    if (selectedAthleteId) {
      const athlete = athletes.find((a) => a.id === selectedAthleteId)
      setSelectedAthlete(athlete)
      setUploadedUrl(athlete?.photourl || null)
    } else {
      setSelectedAthlete(null)
      setUploadedUrl(null)
    }
  }, [selectedAthleteId, athletes])

  const handleAthleteChange = (value: string) => {
    setSelectedAthleteId(value)
  }

  const handleUploadComplete = (url: string) => {
    setUploadedUrl(url)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Test Athlete Image Upload</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select an Athlete</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="athlete-select">Athlete</Label>
                <Select onValueChange={handleAthleteChange} value={selectedAthleteId}>
                  <SelectTrigger id="athlete-select">
                    <SelectValue placeholder="Select an athlete" />
                  </SelectTrigger>
                  <SelectContent>
                    {athletes.map((athlete) => (
                      <SelectItem key={athlete.id} value={athlete.id}>
                        {athlete.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAthlete && (
                <div className="pt-4">
                  <h3 className="font-medium mb-2">Selected Athlete:</h3>
                  <p>
                    <span className="font-medium">Name:</span> {selectedAthlete.name}
                  </p>
                  <p>
                    <span className="font-medium">High School:</span> {selectedAthlete.highSchool || "Not specified"}
                  </p>
                  <p>
                    <span className="font-medium">College:</span> {selectedAthlete.college || "Not specified"}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAthlete && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SimpleImageUpload
            onUploadComplete={handleUploadComplete}
            athleteId={selectedAthleteId}
            athleteName={selectedAthlete.name}
          />

          <Card>
            <CardHeader>
              <CardTitle>Image Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {uploadedUrl ? (
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-md overflow-hidden rounded-md border">
                    <img
                      src={uploadedUrl || "/placeholder.svg"}
                      alt={`${selectedAthlete.name}'s photo`}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500 mb-2">Image URL:</p>
                    <code className="bg-gray-100 p-2 rounded text-xs block overflow-auto max-w-full">
                      {uploadedUrl}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <p>No image uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
