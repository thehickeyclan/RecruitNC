"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X } from "lucide-react"

interface UploadResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
}

interface ImageUploadProps {
  onUploadComplete?: (data: any) => void
  defaultCategory?: string
  entityId?: string
  entityType?: string
}

export function NewImageUpload({
  onUploadComplete,
  defaultCategory = "general",
  entityId,
  entityType,
}: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResponse | null>(null)

  const [formData, setFormData] = useState({
    category: defaultCategory,
    entityId: entityId || "",
    entityType: entityType || "",
    altText: "",
    caption: "",
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)

      // Create preview for images
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target?.result as string)
        reader.readAsDataURL(selectedFile)
      } else {
        setPreview(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)
      uploadFormData.append("category", formData.category)
      uploadFormData.append("entityId", formData.entityId)
      uploadFormData.append("entityType", formData.entityType)
      uploadFormData.append("altText", formData.altText)
      uploadFormData.append("caption", formData.caption)

      const response = await fetch("/api/media-manager/upload", {
        method: "POST",
        body: uploadFormData,
      })

      const data: UploadResponse = await response.json()
      setResult(data)

      if (data.success) {
        // Reset form
        setFile(null)
        setPreview(null)
        setFormData({
          category: defaultCategory,
          entityId: entityId || "",
          entityType: entityType || "",
          altText: "",
          caption: "",
        })

        // Clear file input
        const fileInput = document.getElementById("file-upload") as HTMLInputElement
        if (fileInput) fileInput.value = ""

        // Callback
        if (onUploadComplete) {
          onUploadComplete(data.data)
        }
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      })
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    const fileInput = document.getElementById("file-upload") as HTMLInputElement
    if (fileInput) fileInput.value = ""
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Media File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Selection */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File</Label>
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />
        </div>

        {/* File Preview */}
        {file && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Selected File</Label>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-start gap-4">
                {preview && (
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded border"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {file.type} • {Math.round(file.size / 1024)} KB
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        {file && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="college-logo">College Logo</SelectItem>
                    <SelectItem value="high-school-logo">High School Logo</SelectItem>
                    <SelectItem value="club-logo">Club Logo</SelectItem>
                    <SelectItem value="athlete-photo">Athlete Photo</SelectItem>
                    <SelectItem value="division-logo">Division Logo</SelectItem>
                    <SelectItem value="hero-image">Hero Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-type">Entity Type</Label>
                <Select
                  value={formData.entityType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, entityType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="high-school">High School</SelectItem>
                    <SelectItem value="club">Club</SelectItem>
                    <SelectItem value="athlete">Athlete</SelectItem>
                    <SelectItem value="division">Division</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity-id">Entity ID</Label>
              <Input
                id="entity-id"
                value={formData.entityId}
                onChange={(e) => setFormData((prev) => ({ ...prev, entityId: e.target.value }))}
                placeholder="Optional - ID of related entity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt Text</Label>
              <Input
                id="alt-text"
                value={formData.altText}
                onChange={(e) => setFormData((prev) => ({ ...prev, altText: e.target.value }))}
                placeholder="Describe the image for accessibility"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={formData.caption}
                onChange={(e) => setFormData((prev) => ({ ...prev, caption: e.target.value }))}
                placeholder="Optional caption or description"
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        {file && (
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
        )}

        {/* Result */}
        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            <AlertDescription>
              {result.success ? (
                <div>
                  <strong>✅ Success!</strong> {result.message}
                </div>
              ) : (
                <div>
                  <strong>❌ Error:</strong> {result.error}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
