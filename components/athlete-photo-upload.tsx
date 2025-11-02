"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"

interface AthletePhotoUploadProps {
  athleteId: string
  athleteName: string
  onPhotoUploaded?: (url: string) => void
}

export default function AthletePhotoUpload({ athleteId, athleteName, onPhotoUploaded }: AthletePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset states
    setError(null)
    setSuccess(null)

    // Validate file
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB")
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Start upload
    setIsUploading(true)

    try {
      console.log("[v0] Starting upload for athlete:", athleteId)

      // Create form data for upload
      const formData = new FormData()
      formData.append("file", file)
      formData.append("athleteId", athleteId)
      formData.append("category", "commitment") // Specify this is a commitment photo

      // Upload to server
      const response = await fetch("/api/athletes/upload-image", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      console.log("[v0] Upload response:", data)

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to upload image")
      }

      setSuccess(`Photo uploaded successfully!`)

      // Call the callback if provided
      if (onPhotoUploaded && data.url) {
        onPhotoUploaded(data.url)
      }
    } catch (err) {
      console.error("[v0] Error uploading photo:", err)
      setError(err instanceof Error ? err.message : "An error occurred during upload")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Upload Commitment Photo for {athleteName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {previewUrl && (
            <div className="relative w-full max-w-md mx-auto aspect-[4/3] overflow-hidden rounded-md border border-gray-200">
              <img src={previewUrl || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex justify-center">
            <input
              type="file"
              id={`athlete-photo-${athleteId}`}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Button asChild variant="outline" className="w-full max-w-xs bg-transparent" disabled={isUploading}>
              <label htmlFor={`athlete-photo-${athleteId}`} className="cursor-pointer">
                {isUploading ? "Uploading..." : "Select Photo"}
              </label>
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-gray-500 mt-2">
            <p>For best results:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Use a high-quality photo of the athlete</li>
              <li>Ideal aspect ratio is 4:3 (landscape)</li>
              <li>Maximum file size is 5MB</li>
              <li>Supported formats: JPG, PNG, WebP</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
