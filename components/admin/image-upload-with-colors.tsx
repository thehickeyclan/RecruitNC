"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Upload, Loader2, GripVertical, ImagePlus } from "lucide-react"
import { toast } from "sonner"

export interface ImageWithColor {
  url: string
  color?: string
}

interface ImageUploadWithColorsProps {
  images: ImageWithColor[]
  onChange: (images: ImageWithColor[]) => void
  availableColors?: string[]
}

export function ImageUploadWithColors({
  images,
  onChange,
  availableColors = [],
}: ImageUploadWithColorsProps) {
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const uploadedUrls: ImageWithColor[] = []

      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`)
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`)
          continue
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error((error as { error?: string }).error || "Upload failed")
        }

        const data = (await response.json()) as { url?: string }
        if (data.url) uploadedUrls.push({ url: data.url, color: undefined })
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls])
        toast.success(`Uploaded ${uploadedUrls.length} image(s)`)
      }
    } catch (error) {
      console.error("[ImageUploadWithColors] Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload images")
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFiles(e.target.files)
    if (e.target) e.target.value = ""
  }

  // Drag and drop handlers for file upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await handleFiles(files)
    }
  }, [images, onChange])

  // Reordering handlers
  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
  }

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const newImages = [...images]
    const draggedItem = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedItem)
    onChange(newImages)
    setDraggedIndex(index)
  }

  const handleImageDragEnd = () => {
    setDraggedIndex(null)
  }

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  const updateImageColor = (index: number, color: string | undefined) => {
    const updatedImages = [...images]
    updatedImages[index] = { ...updatedImages[index], color }
    onChange(updatedImages)
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return
    const newImages = [...images]
    const [removed] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, removed)
    onChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Drag and drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragOver 
            ? "border-[#D3B574] bg-[#D3B574]/10 scale-[1.02]" 
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#D3B574] mb-3" />
            <p className="text-sm font-medium">Uploading images...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={`rounded-full p-4 mb-3 transition-colors ${isDragOver ? "bg-[#D3B574]/20" : "bg-gray-100"}`}>
              <ImagePlus className={`h-8 w-8 ${isDragOver ? "text-[#D3B574]" : "text-gray-400"}`} />
            </div>
            <p className="text-sm font-medium mb-1">
              {isDragOver ? "Drop images here" : "Drag and drop images here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or <span className="text-[#D3B574] font-medium">click to browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              PNG, JPG, WebP up to 10MB each
            </p>
          </div>
        )}
      </div>

      {/* Image gallery with reordering */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{images.length} image{images.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-muted-foreground">Drag to reorder. First image is the main product image.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, index) => (
              <div
                key={`${img.url}-${index}`}
                draggable
                onDragStart={(e) => handleImageDragStart(e, index)}
                onDragOver={(e) => handleImageDragOver(e, index)}
                onDragEnd={handleImageDragEnd}
                className={`
                  relative group rounded-lg border bg-white overflow-hidden transition-all
                  ${draggedIndex === index ? "opacity-50 scale-95" : ""}
                  ${index === 0 ? "ring-2 ring-[#D3B574] ring-offset-2" : ""}
                `}
              >
                {/* Drag handle */}
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 rounded p-1 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-white" />
                  </div>
                </div>

                {/* Main badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-[#D3B574] text-[#0A1628] text-xs font-bold px-2 py-0.5 rounded">
                      MAIN
                    </span>
                  </div>
                )}

                {/* Remove button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Image */}
                <div className="aspect-square">
                  <img
                    src={img.url || "/placeholder.svg"}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>

                {/* Color selector */}
                {availableColors.length > 0 && (
                  <div className="p-2 border-t bg-gray-50">
                    <Select
                      value={img.color || "none"}
                      onValueChange={(value) =>
                        updateImageColor(index, value === "none" ? undefined : value)
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Assign color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No color</SelectItem>
                        {availableColors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {availableColors.length === 0 && images.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Tip: Add variants below to assign images to specific colors
        </p>
      )}
    </div>
  )
}
