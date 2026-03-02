"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Upload, Loader2 } from "lucide-react"
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const uploadedUrls: ImageWithColor[] = []

      for (const file of Array.from(files)) {
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
      if (e.target) (e.target as HTMLInputElement).value = ""
    }
  }

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  const updateImageColor = (index: number, color: string | undefined) => {
    const updatedImages = [...images]
    updatedImages[index] = { ...updatedImages[index], color }
    onChange(updatedImages)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img, index) => (
          <div key={`${img.url}-${index}`} className="relative group">
            <div className="aspect-square rounded-lg border bg-muted overflow-hidden">
              <img
                src={img.url || "/placeholder.svg"}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              onClick={() => removeImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="mt-2">
              <Label className="text-xs">Color</Label>
              <Select
                value={img.color || "none"}
                onValueChange={(value) =>
                  updateImageColor(index, value === "none" ? undefined : value)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No color assigned</SelectItem>
                  {availableColors.map((color) => (
                    <SelectItem key={color} value={color}>
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        <label
          className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Upload Images</span>
            </>
          )}
        </label>
      </div>

      {availableColors.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Tip: Generate variants first to see available colors for image assignment
        </p>
      )}
    </div>
  )
}
