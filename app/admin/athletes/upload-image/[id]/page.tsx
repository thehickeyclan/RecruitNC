"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SimpleImageUpload from "@/components/simple-image-upload"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import AthleteImage from "@/components/athlete-image"

export default function AthleteImageUploadPage() {
  const params = useParams()
  const athleteId = params.id as string

  const [athlete, setAthlete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regularPhotoUrl, setRegularPhotoUrl] = useState<string | null>(null)
  const [commitmentPhotoUrl, setCommitmentPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchAthlete = async () => {
      try {
        const response = await fetch(`/api/athletes/${athleteId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch athlete data")
        }

        const data = await response.json()
        setAthlete(data)
        setRegularPhotoUrl(data.photourl)
        setCommitmentPhotoUrl(data.commitmentPhotoUrl)
      } catch (err) {
        console.error("Error fetching athlete:", err)
        setError(err instanceof Error ? err.message : "Failed to load athlete data")
      } finally {
        setLoading(false)
      }
    }

    if (athleteId) {
      fetchAthlete()
    }
  }, [athleteId])

  const handleRegularPhotoUpload = (url: string) => {
    setRegularPhotoUrl(url)
  }

  const handleCommitmentPhotoUpload = (url: string) => {
    setCommitmentPhotoUrl(url)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !athlete) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error || "Failed to load athlete data"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Upload Images for {athlete.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Athlete Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium">Name:</p>
                <p>{athlete.name}</p>
              </div>
              <div>
                <p className="font-medium">High School:</p>
                <p>{athlete.highSchool || "Not specified"}</p>
              </div>
              <div>
                <p className="font-medium">College:</p>
                <p>{athlete.college || "Not specified"}</p>
              </div>
              <div>
                <p className="font-medium">Weight Class:</p>
                <p>{athlete.weightClass || "Not specified"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Current Photo:</p>
                  <div className="mt-2 h-32 w-32 relative">
                    <AthleteImage photoUrl={regularPhotoUrl} name={athlete.name} size="lg" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">Commitment Photo:</p>
                  <div className="mt-2 h-32 w-32 relative">
                    {commitmentPhotoUrl ? (
                      <img
                        src={commitmentPhotoUrl || "/placeholder.svg"}
                        alt={`${athlete.name}'s commitment photo`}
                        className="w-full h-auto object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-32 w-32 bg-gray-100 rounded-md">
                        <p className="text-xs text-gray-500">No photo</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="regular">
        <TabsList className="mb-4">
          <TabsTrigger value="regular">Regular Photo</TabsTrigger>
          <TabsTrigger value="commitment">Commitment Photo</TabsTrigger>
        </TabsList>

        <TabsContent value="regular">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SimpleImageUpload
              onUploadComplete={handleRegularPhotoUpload}
              athleteId={athleteId}
              athleteName={athlete.name}
              category="athlete"
            />

            <Card>
              <CardHeader>
                <CardTitle>Current Regular Photo</CardTitle>
              </CardHeader>
              <CardContent>
                {regularPhotoUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-md overflow-hidden rounded-md border">
                      <img
                        src={regularPhotoUrl || "/placeholder.svg"}
                        alt={`${athlete.name}'s photo`}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <p>No regular photo available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commitment">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SimpleImageUpload
              onUploadComplete={handleCommitmentPhotoUpload}
              athleteId={athleteId}
              athleteName={athlete.name}
              category="commitment"
            />

            <Card>
              <CardHeader>
                <CardTitle>Current Commitment Photo</CardTitle>
              </CardHeader>
              <CardContent>
                {commitmentPhotoUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-md overflow-hidden rounded-md border">
                      <img
                        src={commitmentPhotoUrl || "/placeholder.svg"}
                        alt={`${athlete.name}'s commitment photo`}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <p>No commitment photo available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
