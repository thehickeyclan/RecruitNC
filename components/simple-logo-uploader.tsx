"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"

interface UploadResult {
  success: boolean
  url?: string
  filename?: string
  size?: number
  error?: string
}

export default function SimpleLogoUploader() {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("category", "college-logo")
      formData.append("entityType", "college")
      formData.append("entityId", "appalachian-state")

      const response = await fetch("/api/simple-media-upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          url: data.url,
          filename: data.filename,
          size: data.size,
        })
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.getElementById("file-input") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        setResult({
          success: false,
          error: data.error || "Upload failed",
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload App State Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-input">Select Logo File</Label>
            <Input id="file-input" type="file" accept="image/*" onChange={handleFileSelect} disabled={uploading} />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>

          <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="w-full">
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </>
            )}
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>
                {result.success ? (
                  <div className="space-y-2">
                    <div className="font-medium">✅ Upload successful!</div>
                    <div className="text-sm">
                      File: {result.filename} ({Math.round((result.size || 0) / 1024)} KB)
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View uploaded file
                      </a>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">URL: {result.url}</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">❌ Upload failed</div>
                    <div className="text-sm">{result.error}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📋 Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. Select your Appalachian State logo file</p>
            <p>2. Click "Upload Logo" to upload directly to Vercel Blob storage</p>
            <p>3. Copy the URL from the success message</p>
            <p>4. Use this URL in your wrestling portal for the App State logo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
