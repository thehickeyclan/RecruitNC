"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, Upload, CropIcon } from "lucide-react"
import Image from "next/image"
import ImageCropper from "./image-cropper"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface EnhancedImageUploadProps {
  onUploadComplete: (url: string) => void
  aspectRatio?: number
  entityId?: string
  entityType?: string
  category?: string
}

export default function EnhancedImageUpload({
  onUploadComplete,
  aspectRatio = 1,
  entityId,
  entityType,
  category = "athlete",
}: EnhancedImageUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [showCropper, setShowCropper] = useState(false)
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null)
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

    // Show cropper
    setShowCropper(true)
  }

  const handleCropComplete = (blob: Blob) => {
    // Clean up previous preview if it exists
    if (croppedPreview) {
      URL.revokeObjectURL(croppedPreview)
    }

    // Create a new File object from the Blob with the original filename
    const fileName = file?.name || "cropped-image.jpg"
    const fileType = file?.type || "image/jpeg"

    // Create a new File from the Blob to preserve the filename
    const croppedFile = new File([blob], fileName, {
      type: fileType,
      lastModified: new Date().getTime(),
    })

    setCroppedBlob(croppedFile)
    const objectUrl = URL.createObjectURL(blob)
    setCroppedPreview(objectUrl)
    setShowCropper(false)

    console.log("Crop completed, blob size:", blob.size, "File created:", croppedFile.name, croppedFile.size)
  }

  const handleCropCancel = () => {
    setShowCropper(false)
  }

  const handleUpload = async () => {
    if (!croppedBlob) {
      setError("Please crop the image first")
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(false)

    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append("file", croppedBlob)

      // Add additional metadata if provided
      if (entityId) formData.append("entityId", entityId)
      if (entityType) formData.append("entityType", entityType)
      formData.append("category", category)
      formData.append("name", file?.name || "cropped-image")

      console.log("Uploading image with metadata:", {
        entityId,
        entityType,
        category,
        fileName: file?.name,
        blobSize: croppedBlob.size,
      })

      // Upload to server
      const response = await fetch("/api/images/upload", {
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
        description: "The image has been cropped and uploaded.",
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
    if (croppedPreview) URL.revokeObjectURL(croppedPreview)

    setFile(null)
    setPreviewUrl(null)
    setCroppedBlob(null)
    setCroppedPreview(null)
    setSuccess(false)
    setError(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upload & Crop Image</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-6">
            {/* File input */}
            <div className="w-full">
              <input
                ref={fileInputRef}
                type="file"
                id="enhanced-image"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                <Button asChild variant="outline" className="mb-2" disabled={isUploading}>
                  <label htmlFor="enhanced-image" className="cursor-pointer flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Select Image
                  </label>
                </Button>
                <p className="text-sm text-gray-500">Select an image to upload and crop</p>
              </div>
            </div>

            {/* Preview */}
            {croppedPreview && (
              <div className="flex flex-col items-center">
                <h3 className="font-medium mb-2">Preview</h3>
                <div className="relative w-40 h-40 overflow-hidden rounded-md border">
                  <Image
                    src={croppedPreview || "/placeholder.svg"}
                    alt="Cropped preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCropper(true)}>
                    <CropIcon className="mr-2 h-4 w-4" />
                    Re-crop
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Change Image
                  </Button>
                </div>
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
                <AlertDescription className="text-green-600">Image uploaded successfully!</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpload} disabled={isUploading || !croppedBlob} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Cropper Dialog */}
      <Dialog open={showCropper && !!previewUrl} onOpenChange={(open) => !open && setShowCropper(false)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <ImageCropper
              src={previewUrl || "/placeholder.svg"}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
              aspectRatio={aspectRatio}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
