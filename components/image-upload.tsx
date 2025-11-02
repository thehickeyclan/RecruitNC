"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"

interface ImageUploadProps {
  category: string
  onUploadComplete: (url: string) => void
  existingImageUrl?: string
  entityName?: string
  aspectRatio?: "square" | "announcement" | "wide"
  disabled?: boolean
}

export function ImageUpload({
  category,
  onUploadComplete,
  existingImageUrl,
  entityName = "entity",
  aspectRatio = "square",
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null)
  const [imageError, setImageError] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setImageError(false)
    setUploadSuccess(false)

    try {
      // Create a local preview
      const localPreview = URL.createObjectURL(file)
      setPreviewUrl(localPreview)

      // Create form data for the API request
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)
      formData.append("name", entityName.replace(/\s+/g, "-").toLowerCase())

      // If we're editing an athlete, include the entity information
      if (window.location.pathname.includes("/admin/athletes/edit/")) {
        const athleteId = window.location.pathname.split("/").pop()
        if (athleteId) {
          formData.append("entityId", athleteId)
          formData.append("entityType", "athlete")
        }
      }

      // Upload via the API route
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const data = await response.json()
      console.log("Image uploaded successfully:", data.url)

      if (data.url && typeof data.url === "string" && data.url.startsWith("http")) {
        // Update the preview URL to the uploaded image
        setPreviewUrl(data.url)
        setImageError(false)
        setUploadSuccess(true)

        // Call the callback with the URL
        onUploadComplete(data.url)

        toast({
          title: "Upload successful",
          description: "Your image has been uploaded",
        })
      } else {
        throw new Error("Invalid URL returned from upload")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was an error uploading your image",
        variant: "destructive",
      })
      // Revert to existing image if available
      setPreviewUrl(existingImageUrl || null)
      setImageError(false)
      setUploadSuccess(false)
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageError = () => {
    console.log("Image failed to load:", previewUrl)
    setImageError(true)
    setUploadSuccess(false)
  }

  const handleImageLoad = () => {
    setImageError(false)
    if (previewUrl && previewUrl !== existingImageUrl && uploadSuccess) {
      // Keep success state for newly uploaded images
    } else {
      setUploadSuccess(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 w-32 h-32 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {previewUrl && !imageError ? (
          // Show preview or existing image
          <Image
            src={previewUrl || "/placeholder.svg"}
            alt="Preview"
            fill
            className="object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
            unoptimized={previewUrl.startsWith("blob:")}
          />
        ) : (
          // Show upload placeholder
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              {imageError ? "Failed to load image. Click to upload a new one." : "Click to upload an image"}
            </p>
            {imageError && previewUrl && (
              <p className="mt-1 text-xs text-red-500 break-all">
                Error loading: {previewUrl.length > 50 ? previewUrl.substring(0, 50) + "..." : previewUrl}
              </p>
            )}
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
        >
          {isUploading ? "Uploading..." : previewUrl ? "Change Image" : "Upload Image"}
        </Button>

        {previewUrl && !disabled && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setPreviewUrl(null)
              setImageError(false)
              setUploadSuccess(false)
              onUploadComplete("")
            }}
          >
            Remove
          </Button>
        )}

        {imageError && previewUrl && !disabled && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setImageError(false)
              // Try to reload the image
              const img = new window.Image()
              img.onload = () => setImageError(false)
              img.onerror = () => setImageError(true)
              img.src = previewUrl
            }}
          >
            Retry
          </Button>
        )}
      </div>

      {uploadSuccess && !imageError && previewUrl !== existingImageUrl && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">✓ Profile picture uploaded successfully</div>
      )}

      {imageError && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          <p>⚠️ Image failed to load. This could be because:</p>
          <ul className="list-disc list-inside mt-1 text-xs">
            <li>The image URL is invalid or broken</li>
            <li>The image file was deleted from storage</li>
            <li>There's a network connectivity issue</li>
          </ul>
          <p className="mt-1 text-xs">Try uploading a new image or contact support if the issue persists.</p>
        </div>
      )}
    </div>
  )
}
