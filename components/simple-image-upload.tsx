"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, Upload } from "lucide-react"

interface SimpleImageUploadProps {
  onUploadComplete: (url: string) => void
  entityId?: string
  entityType?: string
  category?: string
  athleteId?: string
  athleteName?: string
}

export default function SimpleImageUpload({
  onUploadComplete,
  entityId,
  entityType,
  category = "athlete",
  athleteId,
  athleteName,
}: SimpleImageUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB")
      return
    }

    setError(null)
    setSuccess(false)
    setFile(selectedFile)

    // Clean up previous preview if it exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    // Create preview
    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an image first")
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(false)

    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append("file", file)

      // Add additional metadata if provided
      if (athleteId) formData.append("entityId", athleteId)
      if (athleteId) formData.append("athleteId", athleteId)
      if (entityId && !athleteId) formData.append("entityId", entityId)
      if (entityType) formData.append("entityType", entityType || "athlete")
      formData.append("category", category)
      formData.append("name", file.name)

      console.log("Uploading image with metadata:", {
        athleteId,
        entityId: athleteId || entityId,
        entityType: entityType || "athlete",
        category,
        fileName: file.name,
        fileSize: file.size,
      })

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

      setSuccess(true)
      toast({
        title: "Image uploaded successfully",
        description: athleteName ? `${athleteName}'s image has been updated.` : "The image has been uploaded.",
      })

      // Call the onUploadComplete callback
      if (data.url) {
        onUploadComplete(data.url)
      }
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

  const resetForm = () => {
    // Clean up object URLs to prevent memory leaks
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    setFile(null)
    setPreviewUrl(null)
    setSuccess(false)
    setError(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{athleteName ? `Upload Image for ${athleteName}` : "Upload Image"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          {/* File input */}
          <div className="w-full">
            <input
              ref={fileInputRef}
              type="file"
              id="simple-image"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors">
              <Button asChild variant="outline" className="mb-2" disabled={isUploading}>
                <label htmlFor="simple-image" className="cursor-pointer flex items-center">
                  <Upload className="mr-2 h-4 w-4" />
                  Select Image
                </label>
              </Button>
              <p className="text-sm text-gray-500">Select an image to upload</p>
            </div>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="flex flex-col items-center">
              <h3 className="font-medium mb-2">Preview</h3>
              <div className="relative w-full max-w-md h-auto overflow-hidden rounded-md border">
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Image preview"
                  className="w-full h-auto object-contain"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={resetForm} className="mt-2">
                Change Image
              </Button>
            </div>
          )}

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
                {athleteName ? `${athleteName}'s image has been updated successfully!` : "Image uploaded successfully!"}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpload} disabled={isUploading || !file} className="w-full">
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {athleteName ? `Upload ${athleteName}'s Image` : "Upload Image"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
