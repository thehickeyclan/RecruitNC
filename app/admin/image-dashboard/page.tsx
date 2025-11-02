"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import BulkImageUpload from "@/components/bulk-image-upload"
import SimpleImageUpload from "@/components/simple-image-upload"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ImageIcon, Users, Upload, Grid } from "lucide-react"

export default function ImageDashboardPage() {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  const handleUploadComplete = (url: string) => {
    setUploadedUrl(url)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Image Management Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Athlete Gallery</CardTitle>
            <CardDescription>View and manage all athlete photos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-500">
              Browse all athletes, see who has photos and who needs them, and update images directly.
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/athlete-gallery">
                <Grid className="mr-2 h-4 w-4" />
                Open Gallery
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image Library</CardTitle>
            <CardDescription>Browse all uploaded images</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-500">
              View all uploaded images, delete unused ones, and link images to athletes.
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/images">
                <ImageIcon className="mr-2 h-4 w-4" />
                Open Library
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Athlete Manager</CardTitle>
            <CardDescription>Connect images to athletes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-500">
              Easily connect existing images to athlete profiles with a simple interface.
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/athlete-image-manager">
                <Users className="mr-2 h-4 w-4" />
                Open Manager
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bulk">
        <TabsList className="mb-4">
          <TabsTrigger value="bulk" className="flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
          <TabsTrigger value="single" className="flex items-center">
            <ImageIcon className="mr-2 h-4 w-4" />
            Single Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Image Upload</CardTitle>
              <CardDescription>Upload multiple athlete images at once</CardDescription>
            </CardHeader>
            <CardContent>
              <BulkImageUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="single">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SimpleImageUpload onUploadComplete={handleUploadComplete} />

            <Card>
              <CardHeader>
                <CardTitle>Image Preview</CardTitle>
                <CardDescription>Your uploaded image will appear here</CardDescription>
              </CardHeader>
              <CardContent>
                {uploadedUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="relative w-64 h-64 overflow-hidden rounded-md border">
                      <img
                        src={uploadedUrl || "/placeholder.svg"}
                        alt="Uploaded image"
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">Image URL:</p>
                      <code className="bg-gray-100 p-2 rounded text-xs block overflow-auto max-w-full">
                        {uploadedUrl}
                      </code>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => navigator.clipboard.writeText(uploadedUrl)}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <ImageIcon className="h-16 w-16 mb-4" />
                    <p>No image uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Image Management Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Bulk Upload</h3>
              <p className="text-sm text-gray-500">
                Use the bulk upload tool when you have multiple athlete images to upload at once. After uploading, you
                can connect them to athletes using the Athlete Image Manager.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Single Upload</h3>
              <p className="text-sm text-gray-500">
                Use the single upload tool when you need to upload an individual image. This is ideal for quickly adding
                a photo to an athlete profile.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Athlete Gallery</h3>
              <p className="text-sm text-gray-500">
                The gallery gives you an overview of all athletes and their photos. You can quickly see which athletes
                need photos and update them directly.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Image Library</h3>
              <p className="text-sm text-gray-500">
                The library shows all uploaded images, organized by category. You can delete unused images and link
                existing images to athletes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
