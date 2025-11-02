"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import AthleteImage from "./athlete-image"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface AthleteImageUploadProps {
  athleteId: string
  athleteName: string
  currentPhotoUrl: string | null
}

export default function AthleteImageUpload({ athleteId, athleteName, currentPhotoUrl }: AthleteImageUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl)
  const { toast } = useToast()

  // Reset success state when a new file is selected
  useEffect(() => {
    if (selectedFile) {
      setSuccess(false)
    }
  }, [selectedFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB")
      return
    }

    setError(null)
    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image first")
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(false)

    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("athleteId", athleteId)

      console.log(`Uploading image for athlete ${athleteId}`)

      // Upload to server
      const response = await fetch("/api/athletes/upload-image", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to upload image")
      }

      console.log("Upload response:", data)

      // Update the photo URL with the URL from the response
      if (data.url) {
        setPhotoUrl(data.url)
        // Also update the preview to show the actual uploaded image
        setPreviewUrl(data.url)
      }

      setSuccess(true)
      toast({
        title: "Image uploaded successfully",
        description: "The athlete's profile has been updated with the new image.",
      })
    } catch (err) {
      console.error("Error uploading image:", err)
      setError(err instanceof Error ? err.message : "An error occurred")

      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Update {athleteName}'s Image</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-6">
          {/* Image preview */}
          <div className="relative">
            <div className={`relative w-32 h-32 ${success ? "ring-4 ring-green-500 ring-offset-2" : ""}`}>
              <AthleteImage photoUrl={previewUrl} name={athleteName} size="xl" />
            </div>
            {success && (
              <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1">
                <CheckCircle size={20} />
              </div>
            )}
          </div>

          {/* File input */}
          <div className="w-full">
            <input
              type="file"
              id="athlete-image"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Button asChild variant="outline" className="w-full" disabled={isUploading}>
              <label htmlFor="athlete-image">{isUploading ? "Uploading..." : "Select Image"}</label>
            </Button>
            {selectedFile && <p className="text-sm text-gray-500 mt-1 text-center">Selected: {selectedFile.name}</p>}
          </div>

          {/* Status messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Success</AlertTitle>
              <AlertDescription className="text-green-600">
                Image uploaded successfully! The athlete's profile has been updated.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpload} disabled={isUploading || !selectedFile} className="w-full">
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            `Upload ${athleteName}'s Image`
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
