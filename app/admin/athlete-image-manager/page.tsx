"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Check } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import { listImages } from "@/lib/blob-storage"
import AthleteImage from "@/components/athlete-image"

interface Athlete {
  id: number
  name: string
  highschool?: string
  college?: string
  photourl?: string
}

interface BlobImage {
  url: string
  pathname: string
}

export default function AthleteImageManagerPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [images, setImages] = useState<BlobImage[]>([])
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true)
  const [isLoadingImages, setIsLoadingImages] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadAthletes()
    loadImages()
  }, [])

  useEffect(() => {
    if (searchTerm && Array.isArray(athletes)) {
      const filtered = athletes.filter(
        (athlete) =>
          athlete.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          athlete.highschool?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          athlete.college?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredAthletes(filtered)
    } else {
      setFilteredAthletes(Array.isArray(athletes) ? athletes : [])
    }
  }, [searchTerm, athletes])

  const loadAthletes = async () => {
    setIsLoadingAthletes(true)
    setError(null)
    try {
      const response = await fetch("/api/athletes")
      if (!response.ok) {
        throw new Error(`Failed to fetch athletes: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()

      // Ensure data is an array
      const athletesArray = Array.isArray(data) ? data : []
      console.log("Loaded athletes:", athletesArray.length)

      setAthletes(athletesArray)
      setFilteredAthletes(athletesArray)
    } catch (error) {
      console.error("Error loading athletes:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(`Failed to load athletes: ${errorMessage}`)
      setAthletes([])
      setFilteredAthletes([])
      toast({
        title: "Failed to load athletes",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoadingAthletes(false)
    }
  }

  const loadImages = async () => {
    setIsLoadingImages(true)
    try {
      const result = await listImages("athlete")
      const imagesArray = Array.isArray(result.blobs) ? result.blobs : []
      console.log("Loaded images:", imagesArray.length)
      setImages(imagesArray)
    } catch (error) {
      console.error("Error loading images:", error)
      setImages([])
      toast({
        title: "Failed to load images",
        description: "There was an error loading the images",
        variant: "destructive",
      })
    } finally {
      setIsLoadingImages(false)
    }
  }

  const selectAthlete = async (athlete: Athlete) => {
    setSelectedAthlete(athlete)
    setUpdateSuccess(false)
  }

  const updateAthleteImage = async (imageUrl: string) => {
    if (!selectedAthlete) return

    setIsUpdating(true)
    setUpdateSuccess(false)

    try {
      const response = await fetch(`/api/athletes/${selectedAthlete.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photourl: imageUrl }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update athlete: ${response.status} ${response.statusText}`)
      }

      // Update the selected athlete with the new image URL
      setSelectedAthlete({
        ...selectedAthlete,
        photourl: imageUrl,
      })

      // Update the athlete in the main list
      setAthletes((prev) =>
        prev.map((athlete) => (athlete.id === selectedAthlete.id ? { ...athlete, photourl: imageUrl } : athlete)),
      )

      setUpdateSuccess(true)

      toast({
        title: "Image updated",
        description: `${selectedAthlete.name}'s profile image has been updated`,
      })
    } catch (error) {
      console.error("Error updating athlete image:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <h1 className="mb-6 text-3xl font-bold text-red-600">Error Loading Data</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              loadAthletes()
              loadImages()
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Athlete Image Manager</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Athletes List */}
        <Card>
          <CardHeader>
            <CardTitle>Athletes ({Array.isArray(filteredAthletes) ? filteredAthletes.length : 0})</CardTitle>
            <CardDescription>Select an athlete to update their image</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search athletes..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAthletes ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !Array.isArray(filteredAthletes) || filteredAthletes.length === 0 ? (
              <p className="text-center text-muted-foreground">
                {searchTerm ? "No athletes found matching your search" : "No athletes found"}
              </p>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <ul className="space-y-2">
                  {filteredAthletes.map((athlete) => (
                    <li
                      key={athlete.id}
                      className={`p-2 rounded cursor-pointer flex items-center gap-3 ${
                        selectedAthlete?.id === athlete.id ? "bg-blue-100" : "hover:bg-gray-100"
                      }`}
                      onClick={() => selectAthlete(athlete)}
                    >
                      <AthleteImage photoUrl={athlete.photourl} name={athlete.name} size="xs" />
                      <div>
                        <div className="font-medium">{athlete.name}</div>
                        <div className="text-xs text-gray-600">
                          {athlete.highschool && `${athlete.highschool}`}
                          {athlete.highschool && athlete.college && " → "}
                          {athlete.college && `${athlete.college}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Athlete */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Athlete</CardTitle>
            <CardDescription>Current profile image</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedAthlete ? (
              <div className="flex flex-col items-center gap-4">
                <AthleteImage photoUrl={selectedAthlete.photourl} name={selectedAthlete.name} size="xl" />
                <div className="text-center">
                  <h3 className="text-lg font-medium">{selectedAthlete.name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedAthlete.highschool && `${selectedAthlete.highschool}`}
                    {selectedAthlete.highschool && selectedAthlete.college && " → "}
                    {selectedAthlete.college && `${selectedAthlete.college}`}
                  </p>
                </div>
                {updateSuccess && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-md">
                    <Check className="h-4 w-4" />
                    <span>Image updated successfully</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                Select an athlete from the list
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Images */}
        <Card>
          <CardHeader>
            <CardTitle>Available Images ({Array.isArray(images) ? images.length : 0})</CardTitle>
            <CardDescription>Click an image to assign it to the selected athlete</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {isLoadingImages ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !Array.isArray(images) || images.length === 0 ? (
              <p className="text-center text-muted-foreground">No images found</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                {images.map((image, index) => (
                  <div
                    key={`${image.url}-${index}`}
                    className={`relative overflow-hidden rounded-md border cursor-pointer transition-all ${
                      selectedAthlete?.photourl === image.url ? "ring-2 ring-blue-500" : "hover:opacity-90"
                    } ${!selectedAthlete ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => selectedAthlete && updateAthleteImage(image.url)}
                    title={selectedAthlete ? `Click to assign to ${selectedAthlete.name}` : "Select an athlete first"}
                  >
                    <div className="aspect-square w-full">
                      <Image
                        src={image.url || "/placeholder.svg"}
                        alt={image.pathname || "Image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                    {selectedAthlete?.photourl === image.url && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white p-1 rounded-full">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isUpdating && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p>Updating image...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li>Search for and select an athlete from the list on the left</li>
            <li>Browse the available images on the right</li>
            <li>Click on an image to assign it to the selected athlete</li>
            <li>The athlete's profile will be immediately updated with the new image</li>
            <li>
              To upload new images, go to the{" "}
              <a href="/admin/images" className="text-blue-600 hover:underline">
                Image Management
              </a>{" "}
              page
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
