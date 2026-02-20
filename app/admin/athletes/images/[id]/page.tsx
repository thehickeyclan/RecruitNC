"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AthleteImageUploader } from "@/components/athlete-image-uploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AthleteImagesPage({ params }: { params: { id: string } }) {
  const [athlete, setAthlete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { id } = params

  useEffect(() => {
    async function fetchAthlete() {
      try {
        setLoading(true)
        const response = await fetch(`/api/athletes/${id}`)

        if (!response.ok) {
          throw new Error("Failed to fetch athlete")
        }

        const data = await response.json()
        setAthlete(data)
      } catch (error) {
        console.error("Error fetching athlete:", error)
        toast({
          title: "Error",
          description: "Failed to load athlete data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAthlete()
  }, [id, toast])

  const handleUploadComplete = (type: "profile" | "commitment" | "headshot", url: string) => {
    // Update the local athlete state with the new image URL
    setAthlete((prev: any) => {
      if (!prev) return prev

      if (type === "profile") {
        return { ...prev, photourl: url }
      } else if (type === "commitment") {
        return { ...prev, commitmentPhotoUrl: url }
      } else if (type === "headshot") {
        return { ...prev, headshot_url: url }
      }

      return prev
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-5 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/athletes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Athletes
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Athlete Not Found</h1>
        </div>

        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p className="text-lg text-gray-500">The athlete you're looking for could not be found.</p>
              <Button className="mt-4" asChild>
                <Link href="/admin/athletes">Return to Athletes List</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/athletes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Athletes
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Manage Images: {athlete.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AthleteImageUploader
          athleteId={athlete.id}
          athleteName={athlete.name}
          existingProfileUrl={athlete.photourl}
          existingCommitmentUrl={athlete.commitmentPhotoUrl}
          existingHeadshotUrl={athlete.headshot_url}
          onUploadComplete={handleUploadComplete}
        />

        <Card>
          <CardHeader>
            <CardTitle>Image Usage Guide</CardTitle>
            <CardDescription>How each image type is used throughout the site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg">Profile Image</h3>
                <p className="text-gray-500">The main profile image used throughout the site, including:</p>
                <ul className="list-disc list-inside mt-2 text-gray-500">
                  <li>Athlete profile pages</li>
                  <li>Search results</li>
                  <li>Featured athletes sections</li>
                </ul>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium text-lg">Commitment Image</h3>
                <p className="text-gray-500">Used specifically for commitment announcements:</p>
                <ul className="list-disc list-inside mt-2 text-gray-500">
                  <li>Commitment cards on the homepage</li>
                  <li>Social media sharing graphics</li>
                  <li>Commitment announcements</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-lg">Headshot Image</h3>
                <p className="text-gray-500">A professional headshot used in compact listings:</p>
                <ul className="list-disc list-inside mt-2 text-gray-500">
                  <li>College page athlete listings</li>
                  <li>Compact athlete cards</li>
                  <li>Team roster views</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" asChild>
          <Link href={`/athletes/${athlete.id}`}>View Athlete Profile</Link>
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/view-profile?id=${encodeURIComponent(athlete.id)}`}>View profile</Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href={`/admin/athletes/edit?id=${encodeURIComponent(athlete.id)}`}>Edit Athlete Details</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
