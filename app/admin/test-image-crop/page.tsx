"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import EnhancedImageUpload from "@/components/enhanced-image-upload"
import Image from "next/image"

export default function TestImageCropPage() {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  const handleUploadComplete = (url: string) => {
    console.log("Upload completed, image URL:", url)
    setUploadedImageUrl(url)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Test Image Cropping</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <EnhancedImageUpload onUploadComplete={handleUploadComplete} aspectRatio={1} />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Image Result</CardTitle>
            </CardHeader>
            <CardContent>
              {uploadedImageUrl ? (
                <div className="space-y-4">
                  <div className="relative w-full h-64 border rounded-md overflow-hidden">
                    <Image
                      src={uploadedImageUrl || "/placeholder.svg"}
                      alt="Uploaded image"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">Image URL:</h3>
                    <p className="text-sm break-all bg-gray-50 p-2 rounded border mt-1">{uploadedImageUrl}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-md border">
                  <p className="text-gray-500">No image uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
