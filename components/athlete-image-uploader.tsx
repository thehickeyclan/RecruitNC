"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Upload, Check } from "lucide-react"

interface AthleteImageUploaderProps {
  athleteId: string
  athleteName: string
  existingProfileUrl?: string
  existingCommitmentUrl?: string
  existingHeadshotUrl?: string
  onUploadComplete?: (type: "profile" | "commitment" | "headshot", url: string) => void
}

export function AthleteImageUploader({
  athleteId,
  athleteName,
  existingProfileUrl,
  existingCommitmentUrl,
  existingHeadshotUrl,
  onUploadComplete,
}: AthleteImageUploaderProps) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0]
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setPreviewUrls((prev) => ({ ...prev, [type]: previewUrl }))
    }
  }

  const uploadImage = async (type: "profile" | "commitment" | "headshot") => {
    const fileInput = document.getElementById(`${type}-upload`) as HTMLInputElement
    const file = fileInput?.files?.[0]

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an image file first",
        variant: "destructive",
      })
      return
    }

    setUploading((prev) => ({ ...prev, [type]: true }))

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("athleteId", athleteId)
      formData.append("category", type)

      console.log(`Uploading ${type} image for athlete ${athleteId}`)

      const response = await fetch("/api/athletes/upload-image", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Upload successful",
          description: `${type} image uploaded successfully`,
        })

        // Clear the preview
        setPreviewUrls((prev) => ({ ...prev, [type]: "" }))

        // Clear the file input
        if (fileInput) {
          fileInput.value = ""
        }

        // Notify parent component
        onUploadComplete?.(type, result.url)
      } else {
        throw new Error(result.error || "Upload failed")
      }
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }))
    }
  }

  const ImageUploadSection = ({
    type,
    title,
    description,
    existingUrl,
  }: {
    type: "profile" | "commitment" | "headshot"
    title: string
    description: string
    existingUrl?: string
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {existingUrl && <Check className="h-4 w-4 text-green-600" />}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingUrl && (
          <div>
            <Label className="text-sm font-medium">Current Image:</Label>
            <div className="mt-1">
              <img
                src={existingUrl || "/placeholder.svg"}
                alt={`Current ${type} image`}
                className="w-32 h-32 object-cover rounded-md border"
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor={`${type}-upload`} className="text-sm font-medium">
            {existingUrl ? "Replace Image:" : "Upload Image:"}
          </Label>
          <Input
            id={`${type}-upload`}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, type)}
            className="mt-1"
          />
        </div>

        {previewUrls[type] && (
          <div>
            <Label className="text-sm font-medium">Preview:</Label>
            <div className="mt-1">
              <img
                src={previewUrls[type] || "/placeholder.svg"}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-md border"
              />
            </div>
          </div>
        )}

        <Button onClick={() => uploadImage(type)} disabled={uploading[type]} className="w-full">
          {uploading[type] ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {existingUrl ? "Replace" : "Upload"} {title}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Upload Images for {athleteName}</h2>
        <p className="text-gray-600 mt-2">Upload different types of images for this athlete</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ImageUploadSection
          type="profile"
          title="Profile Image"
          description="Main profile photo used throughout the site"
          existingUrl={existingProfileUrl}
        />

        <ImageUploadSection
          type="commitment"
          title="Commitment Image"
          description="Special photo for commitment announcements"
          existingUrl={existingCommitmentUrl}
        />

        <ImageUploadSection
          type="headshot"
          title="Headshot Image"
          description="Professional headshot for compact listings"
          existingUrl={existingHeadshotUrl}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Image Guidelines:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use high-quality images (at least 400x400 pixels)</li>
          <li>• Supported formats: JPG, PNG, WebP</li>
          <li>• Keep file sizes under 5MB for best performance</li>
          <li>• Profile images work best as square or portrait orientation</li>
          <li>• Commitment images can be action shots or celebration photos</li>
          <li>• Headshots should be professional, close-up photos</li>
        </ul>
      </div>
    </div>
  )
}
