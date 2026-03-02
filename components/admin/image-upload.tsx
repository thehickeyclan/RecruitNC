"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { compressImage } from "@/lib/image-compression"

interface ImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
}

export function ImageUpload({ images, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length === 0) return

    setUploading(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of files) {
        let fileToUpload: File = file

        if (file.size > 3 * 1024 * 1024) {
          toast.info(`Compressing ${file.name}...`)
          try {
            fileToUpload = await compressImage(file, 4)
          } catch (error) {
            console.error("[ImageUpload] Compression error:", error)
            toast.error(`Failed to compress ${file.name}`)
            continue
          }
        }

        const formData = new FormData()
        formData.append("file", fileToUpload)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error((error as { error?: string }).error || "Upload failed")
        }

        const data = (await response.json()) as { url?: string }
        if (data.url) uploadedUrls.push(data.url)
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls])
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`)
      }
    } catch (error) {
      console.error("[ImageUpload] Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload images")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
    toast.success("Image removed")
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Images"
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">or drag and drop</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          PNG, JPG, WebP (large images will be automatically compressed)
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((url, index) => (
            <div
              key={url + index}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-white"
            >
              <Image
                src={url || "/placeholder.svg"}
                alt={`Product image ${index + 1}`}
                fill
                className="object-cover"
                unoptimized={url.startsWith("blob:") || url.includes("vercel-storage")}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {index === 0 && (
                <div className="absolute top-2 left-2">
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Main
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
