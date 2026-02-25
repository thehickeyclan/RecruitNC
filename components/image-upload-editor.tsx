"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Edit, Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface ImageUploadEditorProps {
  athleteId: string
  currentImageUrl?: string
  onUpload: (file: File) => Promise<string>
  canEdit?: boolean
  className?: string
}

export function ImageUploadEditor({
  athleteId,
  currentImageUrl,
  onUpload,
  canEdit = true,
  className = "",
}: ImageUploadEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  if (!canEdit) {
    return null
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const imageUrl = await onUpload(file)
      setPreview(null)
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      })
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={`relative w-full h-full min-h-[200px] group ${className}`}>
      <div className="relative w-full h-full">
        <Image
          src={preview || currentImageUrl || "/wrestler-silhouette.png"}
          alt="Profile"
          fill
          className="object-cover object-top rounded-xl"
          sizes="(max-width: 768px) 100vw, 320px"
        />
        {preview && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 rounded-xl">
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? "Uploading..." : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={uploading}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
        {!preview && (
          <Button
            size="sm"
            className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white text-[#003366] shadow-lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit Photo
          </Button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

