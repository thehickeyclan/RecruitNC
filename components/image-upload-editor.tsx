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

/**
 * Phone photos run 3-8 MB and the server takes 4.5 MB a request, so an iPhone photo failed to
 * upload with an unreadable error. Shrink it in the browser first: 1600 px on the long side is
 * well past anything a profile shows. Falls back to the original file if the browser cannot.
 */
async function shrinkForUpload(file: File): Promise<File> {
  if (file.size < 1.5 * 1024 * 1024 || file.type === "image/gif") return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })
  } catch {
    return file
  }
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

    // Big photos are shrunk before upload (shrinkForUpload); only refuse what no phone produces.
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 25MB",
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
      await onUpload(await shrinkForUpload(file))
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
    <div className={`relative w-full h-full group ${className}`}>
      <div className="relative w-full h-full">
        <Image
          src={preview || currentImageUrl || "/wrestler-silhouette.png"}
          alt="Profile"
          fill
          className="object-cover object-top rounded-xl"
          sizes="(max-width: 768px) 100vw, 320px"
        />
        {preview && (
          <div className="absolute inset-0 bg-black/50 flex flex-wrap content-center items-center justify-center gap-2 rounded-xl p-2">
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
          /*
           * Shown on hover with a mouse, always on a touch screen: a phone has no hover, so the
           * button never appeared and the photo could not be changed from an iPhone (Brandon Palmer,
           * 15 October 2026).
           */
          <Button
            size="sm"
            className="absolute bottom-2 right-2 h-8 px-2.5 text-xs bg-white/90 hover:bg-white text-[#003366] shadow-lg transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
            onClick={() => fileInputRef.current?.click()}
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
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

