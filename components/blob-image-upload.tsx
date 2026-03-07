"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ImageIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type ImageCategory = "athlete" | "highschool" | "college" | "club"

interface BlobImageUploadProps {
  onUploadComplete: (url: string) => void
  currentImageUrl?: string | null
  className?: string
  category: ImageCategory
  entityId?: string
  entityName?: string
  entityType?: string
  aspectRatio?: "square" | "portrait" | "landscape"
  maxSizeMB?: number
}

export function BlobImageUpload({
  onUploadComplete,
  currentImageUrl,
  className,
  category,
  entityId,
  entityName,
  entityType,
  aspectRatio = "square",
  maxSizeMB = 2,
}: BlobImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be smaller than ${maxSizeMB}MB`)
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Create form data
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)

      if (entityName) {
        formData.append("name", entityName)
      }

      if (entityId && entityType) {
        formData.append("entityId", entityId)
        formData.append("entityType", entityType)
      }

      // Upload to server
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to upload image")
      }

      const data = await response.json()
      onUploadComplete(data.url)
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during upload")
      setPreviewUrl(currentImageUrl)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onUploadComplete("")
  }

  // Determine aspect ratio class
  let aspectRatioClass = "aspect-square"
  if (aspectRatio === "portrait") {
    aspectRatioClass = "aspect-[3/4]"
  } else if (aspectRatio === "landscape") {
    aspectRatioClass = "aspect-[16/9]"
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <Card className={cn("relative overflow-hidden", aspectRatioClass)}>
        {previewUrl ? (
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover object-top" />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-8 w-8 rounded-full"
              onClick={handleRemoveImage}
              disabled={isUploading}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-4 cursor-pointer bg-muted"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-10 w-10 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">Click to upload an image</p>
            <p className="text-xs text-muted-foreground mt-1">Max size: {maxSizeMB}MB</p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon className="h-4 w-4 mr-2" />
          {previewUrl ? "Change Image" : "Upload Image"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}
