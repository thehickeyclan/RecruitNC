"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, Upload, X, ImageIcon } from "lucide-react"
import Image from "next/image"
import { Progress } from "@/components/ui/progress"

interface BulkImageUploadProps {
  onComplete?: () => void
}

export default function BulkImageUpload({ onComplete }: BulkImageUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadedCount, setUploadedCount] = useState<number>(0)
  const [totalCount, setTotalCount] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setError(null)
    setSuccess(false)

    // Convert FileList to array and filter for images only
    const fileArray = Array.from(selectedFiles).filter((file) => file.type.startsWith("image/"))

    if (fileArray.length === 0) {
      setError("Please select image files only")
      return
    }

    // Check file sizes
    const oversizedFiles = fileArray.filter((file) => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} files exceed the 5MB size limit`)
      return
    }

    setFiles(fileArray)

    // Generate previews
    const newPreviews = fileArray.map((file) => URL.createObjectURL(file))
    setPreviews(newPreviews)
  }

  const removeFile = (index: number) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    setFiles(newFiles)

    const newPreviews = [...previews]
    URL.revokeObjectURL(newPreviews[index]) // Clean up the URL
    newPreviews.splice(index, 1)
    setPreviews(newPreviews)
  }

  const clearFiles = () => {
    // Clean up object URLs to prevent memory leaks
    previews.forEach((preview) => URL.revokeObjectURL(preview))
    setPreviews([])
    setFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one image")
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(false)
    setUploadProgress(0)
    setUploadedCount(0)
    setTotalCount(files.length)

    try {
      const uploadedFiles = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append("file", file)
        formData.append("filename", file.name)

        // Upload to server
        const response = await fetch("/api/images/bulk-upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || data.details || `Failed to upload ${file.name}`)
        }

        const data = await response.json()
        uploadedFiles.push(data.url)

        // Update progress
        setUploadedCount(i + 1)
        setUploadProgress(Math.round(((i + 1) / files.length) * 100))
      }

      setSuccess(true)
      toast({
        title: "Images uploaded successfully",
        description: `${uploadedFiles.length} images have been uploaded.`,
      })

      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete()
      }
    } catch (err) {
      console.error("Error uploading images:", err)
      setError(err instanceof Error ? err.message : "An error occurred")

      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Failed to upload images",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bulk Image Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          {/* File input */}
          <div className="w-full">
            <input
              ref={fileInputRef}
              type="file"
              id="bulk-images"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors">
              <Button asChild variant="outline" className="mb-2" disabled={isUploading}>
                <label htmlFor="bulk-images" className="cursor-pointer flex items-center">
                  <Upload className="mr-2 h-4 w-4" />
                  Select Images
                </label>
              </Button>
              <p className="text-sm text-gray-500">Select multiple images to upload (max 5MB each)</p>
            </div>
          </div>

          {/* Preview grid */}
          {previews.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Selected Images ({files.length})</h3>
                <Button variant="ghost" size="sm" onClick={clearFiles} disabled={isUploading}>
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square w-full overflow-hidden rounded-md border">
                      <div className="relative h-full w-full">
                        <Image
                          src={preview || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-gray-500 truncate mt-1">{files[index].name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>
                  {uploadedCount} of {totalCount}
                </span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
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
              <AlertDescription className="text-green-600">All images uploaded successfully!</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpload} disabled={isUploading || files.length === 0} className="w-full">
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading {uploadedCount}/{totalCount}...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Upload {files.length} {files.length === 1 ? "Image" : "Images"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
