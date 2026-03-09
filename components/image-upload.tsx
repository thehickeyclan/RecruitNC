"use client"

import type React from "react"

import { useState, useRef, useEffect, useId } from "react"
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
  enableDarkMode?: boolean
}

export function ImageUpload({
  category,
  onUploadComplete,
  existingImageUrl,
  entityName = "entity",
  aspectRatio = "square",
  disabled = false,
  enableDarkMode = false,
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
      if (window.location.pathname.startsWith("/admin/athletes/edit")) {
        const athleteId = window.location.pathname.split("/").pop()
        if (athleteId) {
          formData.append("entityId", athleteId)
          formData.append("entityType", "athlete")
        }
      }

      // Upload via the API route (credentials so cookies sent on same-origin)
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const msg = errorData.details || errorData.error || `Upload failed (${response.status})`
        throw new Error(msg)
      }

      const data = await response.json()

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
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ""
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
    <div className={`space-y-4 ${enableDarkMode ? "dark" : ""}`}>
      <div
        className={`relative border-2 border-dashed rounded-lg overflow-hidden w-32 h-32 transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${
          previewUrl && !imageError
            ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            : "border-slate-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-600 dark:text-slate-300">
            <svg
              className="w-10 h-10 text-slate-400 dark:text-slate-500"
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
            <p className="mt-2 text-sm">
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

      <input
        id={inputId}
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
      />

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          disabled={isUploading || disabled}
          className="bg-white dark:bg-slate-900/70 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          asChild
        >
          <label htmlFor={inputId} className="cursor-pointer flex items-center justify-center min-w-[8rem]">
            {isUploading ? "Uploading..." : previewUrl ? "Change Image" : "Upload Image"}
          </label>
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
            className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-500"
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
        <div className="text-sm text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/40 p-2 rounded">
          ✓ Profile picture uploaded successfully
        </div>
      )}

      {imageError && (
        <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/40 p-2 rounded">
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
