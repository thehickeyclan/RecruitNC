"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, RefreshCw, Check, AlertTriangle, ImageIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function UploadCardinalGibbonsLogo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const { toast } = useToast()

  const handleUpload = async () => {
    if (!selectedFile) {
      setResult({ success: false, message: "Please select a logo file" })
      return
    }

    setUploading(true)
    setResult(null)

    try {
      // Upload the image using media manager
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("category", "highschool")
      formData.append("entityName", "Cardinal Gibbons High School")
      formData.append("entityType", "highschool")

      const uploadResponse = await fetch("/api/media-manager/upload", {
        method: "POST",
        body: formData,
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed")
      }

      // Then save the logo mapping
      const mappingResponse = await fetch("/api/logo-mappings-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_name: "Cardinal Gibbons High School",
          entity_type: "highschool",
          logo_url: uploadResult.data.url,
        }),
      })

      const mappingResult = await mappingResponse.json()
      if (mappingResult.success) {
        setResult({
          success: true,
          message: `Cardinal Gibbons High School logo uploaded successfully! URL: ${uploadResult.data.url}`,
        })

        // Reset form
        setSelectedFile(null)
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) fileInput.value = ""

        toast({
          title: "Success!",
          description: "Cardinal Gibbons High School logo uploaded and mapped successfully",
        })
      } else {
        setResult({
          success: false,
          message: `Failed to save logo mapping: ${mappingResult.error}`,
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      setResult({
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Cardinal Gibbons Logo</h1>
          <p className="text-gray-600">Upload the logo for Cardinal Gibbons High School</p>
        </div>

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Cardinal Gibbons High School Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Entity Details</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">Cardinal Gibbons High School</p>
                <p className="text-sm text-gray-600">Type: High School</p>
                <p className="text-sm text-gray-600">Category: highschool</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Logo File *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  setSelectedFile(file || null)
                  setResult(null)
                }}
              />
              <p className="text-xs text-gray-500">
                Supported formats: JPG, PNG, SVG, WebP. Recommended size: 200x200px or larger.
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">Selected File:</p>
                <p className="text-sm text-blue-800">{selectedFile.name}</p>
                <p className="text-xs text-blue-600">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
            )}

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                <AlertDescription className="flex items-start gap-2">
                  {result.success ? (
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span className="break-words">{result.message}</span>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading Cardinal Gibbons Logo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Cardinal Gibbons Logo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-green-800">
              <p>1. Select the Cardinal Gibbons High School logo file</p>
              <p>2. Click "Upload Cardinal Gibbons Logo"</p>
              <p>3. The system will:</p>
              <div className="ml-4 space-y-1">
                <p>• Upload the image to blob storage</p>
                <p>• Save it in the media_items table</p>
                <p>• Create a logo mapping entry</p>
                <p>• Make it available for athlete profiles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Link */}
        <div className="text-center">
          <Button variant="outline" asChild>
            <a href="/debug/cardinal-gibbons-check">Check Current Cardinal Gibbons Data</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
