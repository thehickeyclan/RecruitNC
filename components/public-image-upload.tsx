"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { Loader2, Upload, Camera, ImageIcon, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PublicImageUploadProps {
  athleteId: string
  athleteName: string
  currentImageUrl?: string
  onUploadComplete?: (url: string) => void
}

export function PublicImageUpload({
  athleteId,
  athleteName,
  currentImageUrl,
  onUploadComplete,
}: PublicImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || "")
  const [error, setError] = useState<string | null>(null)
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB")
      return
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    try {
      setIsUploading(true)
      setError(null)

      // Create a local preview
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Prepare form data for upload
      const formData = new FormData()
      formData.append("file", file)
      formData.append("athleteId", athleteId)
      formData.append("category", "user_headshot")
      formData.append("uploadedBy", user?.id || "anonymous")

      // Upload the image
      const response = await fetch("/api/athletes/upload-public-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload image")
      }

      const data = await response.json()

      // Update the preview with the actual URL from the server
      setPreviewUrl(data.url)

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(data.url)
      }

      toast({
        title: "Image uploaded successfully",
        description: `Your headshot for ${athleteName} has been submitted for review.`,
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image"
      setError(errorMessage)
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Upload Your Photo
          </CardTitle>
          <CardDescription>Sign in to upload your own headshot</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in to upload your own photo. This helps us keep profiles accurate and up-to-date.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button asChild className="flex-1">
              <a href="/auth/signin">Sign In</a>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <a href="/auth/signup">Sign Up</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Upload Your Photo
        </CardTitle>
        <CardDescription>Is this your profile? Upload your own headshot to keep it current</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
            {previewUrl ? (
              <Image
                src={previewUrl || "/placeholder.svg"}
                alt={`${athleteName} headshot`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          <div className="w-full max-w-xs">
            <label htmlFor="public-upload">
              <Button variant="outline" className="w-full bg-transparent" disabled={isUploading} asChild>
                <div className="flex items-center justify-center gap-2 cursor-pointer">
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Upload Photo</span>
                    </>
                  )}
                </div>
              </Button>
            </label>
            <input
              id="public-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">Max file size: 5MB • Formats: JPG, PNG, GIF</p>
            <p className="text-xs text-gray-500 mt-1">Photos are reviewed before being published</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
