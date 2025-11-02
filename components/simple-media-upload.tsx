"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, RefreshCw, Check, AlertTriangle } from "lucide-react"

export default function SimpleMediaUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("college-logos")
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleUpload = async () => {
    console.log("=== SIMPLE UPLOAD BUTTON CLICKED ===")

    if (!selectedFile) {
      console.log("No file selected")
      setUploadResult({ success: false, message: "Please select a file" })
      return
    }

    console.log("Starting upload for:", selectedFile.name)
    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("category", selectedCategory)

      console.log("Sending request to /api/simple-media-upload")

      const response = await fetch("/api/simple-media-upload", {
        method: "POST",
        body: formData,
      })

      console.log("Response status:", response.status)

      const data = await response.json()
      console.log("Response data:", data)

      if (data.success) {
        setUploadResult({ success: true, message: "Upload successful!" })
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        setUploadResult({ success: false, message: data.error || "Upload failed" })
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadResult({
        success: false,
        message: "Upload failed: " + (error instanceof Error ? error.message : "Unknown error"),
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Simple Media Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="college-logos">College Logos</SelectItem>
              <SelectItem value="high-school-logos">High School Logos</SelectItem>
              <SelectItem value="club-logos">Club Logos</SelectItem>
              <SelectItem value="athlete-photos">Athlete Photos</SelectItem>
              <SelectItem value="division-logos">Division Logos</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select File</label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              console.log("File selected:", file?.name)
              setSelectedFile(file || null)
              setUploadResult(null)
            }}
          />
        </div>

        {selectedFile && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-gray-600">
              {formatFileSize(selectedFile.size)} • {selectedFile.type}
            </p>
          </div>
        )}

        {uploadResult && (
          <Alert variant={uploadResult.success ? "default" : "destructive"}>
            <AlertDescription>
              {uploadResult.success ? (
                <Check className="h-4 w-4 inline mr-2" />
              ) : (
                <AlertTriangle className="h-4 w-4 inline mr-2" />
              )}
              {uploadResult.message}
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="w-full">
          {uploading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
