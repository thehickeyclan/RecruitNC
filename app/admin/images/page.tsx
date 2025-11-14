"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageUpload } from "@/components/image-upload"
import { listImages, deleteImage, type ImageCategory } from "@/lib/blob-storage"
import { Loader2, Trash2, Link } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import { ClientOnly } from "@/components/client-only"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ImagesPage() {
  const [activeTab, setActiveTab] = useState<ImageCategory>("athlete")
  const [images, setImages] = useState<{ url: string; pathname: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filteredAthletes, setFilteredAthletes] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    loadImages(activeTab)
    if (activeTab === "athlete") {
      loadAthletes()
    }
  }, [activeTab])

  useEffect(() => {
    if (searchTerm) {
      const filtered = athletes.filter((athlete) => athlete.name.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredAthletes(filtered)
    } else {
      setFilteredAthletes(athletes)
    }
  }, [searchTerm, athletes])

  const loadImages = async (category: ImageCategory) => {
    setIsLoading(true)
    try {
      const result = await listImages(category)
      setImages(result.blobs)
    } catch (error) {
      console.error("Error loading images:", error)
      toast({
        title: "Failed to load images",
        description: "There was an error loading the images",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadAthletes = async () => {
    try {
      const response = await fetch("/api/athletes")
      if (!response.ok) {
        throw new Error("Failed to fetch athletes")
      }
      const data = await response.json()
      setAthletes(data)
      setFilteredAthletes(data)
    } catch (error) {
      console.error("Error loading athletes:", error)
      toast({
        title: "Failed to load athletes",
        description: "There was an error loading the athletes list",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (url: string) => {
    setIsDeleting(url)
    try {
      await deleteImage(url)
      setImages(images.filter((img) => img.url !== url))
      toast({
        title: "Image deleted",
        description: "The image has been removed",
      })
    } catch (error) {
      console.error("Error deleting image:", error)
      toast({
        title: "Delete failed",
        description: "There was an error deleting the image",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleLinkImage = async (imageUrl: string) => {
    if (!selectedAthlete) {
      toast({
        title: "No athlete selected",
        description: "Please select an athlete to link this image to",
        variant: "destructive",
      })
      return
    }

    setIsLinking(imageUrl)
    try {
      const response = await fetch(`/api/athletes/${selectedAthlete}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photourl: imageUrl }),
      })

      if (!response.ok) {
        throw new Error("Failed to update athlete")
      }

      toast({
        title: "Image linked",
        description: "The image has been linked to the athlete's profile",
      })
    } catch (error) {
      console.error("Error linking image:", error)
      toast({
        title: "Link failed",
        description: "There was an error linking the image to the athlete",
        variant: "destructive",
      })
    } finally {
      setIsLinking(null)
      setSelectedAthlete("")
    }
  }

  const handleUploadComplete = async (url: string) => {
    // Add the new image to the list
    const pathname = url.split("/").pop() || ""
    setImages((prev) => [{ url, pathname }, ...prev])

    // Refresh the list from the server to ensure we have the latest data
    await loadImages(activeTab)

    toast({
      title: "Image saved",
      description: "The image has been uploaded and saved successfully",
    })
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Image Management</h1>

      <ClientOnly>
        <Tabs defaultValue="athlete" value={activeTab} onValueChange={(value) => setActiveTab(value as ImageCategory)}>
          <TabsList className="mb-4">
            <TabsTrigger value="athlete">Athletes</TabsTrigger>
            <TabsTrigger value="highschool">High Schools</TabsTrigger>
            <TabsTrigger value="college">Colleges</TabsTrigger>
            <TabsTrigger value="club">Wrestling Clubs</TabsTrigger>
          </TabsList>

          {["athlete", "highschool", "college", "club"].map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upload New {category.charAt(0).toUpperCase() + category.slice(1)} Image</CardTitle>
                  <CardDescription>
                    Upload images for{" "}
                    {category === "athlete"
                      ? "wrestlers"
                      : category === "highschool"
                        ? "high schools"
                        : category === "college"
                          ? "colleges"
                          : "wrestling clubs"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="w-full max-w-[200px]">
                      <ImageUpload category={category as ImageCategory} onUploadComplete={handleUploadComplete} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manage {category.charAt(0).toUpperCase() + category.slice(1)} Images</CardTitle>
                  {category === "athlete" && (
                    <div className="mt-2">
                      <Input
                        placeholder="Search athletes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : images.length === 0 ? (
                    <p className="text-center text-muted-foreground">No images found</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {images.map((image) => (
                        <div key={image.url} className="relative overflow-hidden rounded-md border">
                          <div className="aspect-square w-full">
                            <Image
                              src={image.url || "/placeholder.svg"}
                              alt={image.pathname}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="absolute right-1 top-1 flex gap-1">
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7 rounded-full opacity-80 hover:opacity-100"
                              onClick={() => handleDelete(image.url)}
                              disabled={isDeleting === image.url}
                            >
                              {isDeleting === image.url ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>

                            {category === "athlete" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 rounded-full opacity-80 hover:opacity-100"
                                  >
                                    <Link className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Link Image to Athlete</DialogTitle>
                                    <DialogDescription>
                                      Select an athlete to link this image to their profile.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                      <Label htmlFor="athlete">Athlete</Label>
                                      <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select an athlete" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {filteredAthletes.map((athlete) => (
                                            <SelectItem key={athlete.id} value={athlete.id}>
                                              {athlete.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="flex justify-center">
                                      <div className="relative h-40 w-40">
                                        <Image
                                          src={image.url || "/placeholder.svg"}
                                          alt="Selected image"
                                          fill
                                          className="object-cover rounded-md"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <DialogFooter>
                                    <Button
                                      onClick={() => handleLinkImage(image.url)}
                                      disabled={isLinking === image.url || !selectedAthlete}
                                    >
                                      {isLinking === image.url ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Linking...
                                        </>
                                      ) : (
                                        "Link Image"
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                            <p className="truncate text-xs text-white">{image.pathname.split("/").pop()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </ClientOnly>
    </div>
  )
}
