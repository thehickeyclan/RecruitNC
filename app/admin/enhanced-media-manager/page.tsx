"use client"

import { EnhancedMediaGallery } from "@/components/media-manager/enhanced-media-gallery"
import { NewImageUpload } from "@/components/media-manager/new-image-upload"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, GalleryThumbnailsIcon as Gallery, Settings } from "lucide-react"

export default function EnhancedMediaManagerPage() {
  const handleUploadComplete = (data: any) => {
    // Refresh the gallery when upload completes
    window.location.reload()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-nc-blue mb-2">Enhanced Media Manager</h1>
        <p className="text-gray-600">
          Manage your media files with enhanced editing capabilities and standardized division options.
        </p>
      </div>

      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Gallery className="h-4 w-4" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="mt-6">
          <EnhancedMediaGallery />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <NewImageUpload onUploadComplete={handleUploadComplete} />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Media Manager Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Division Standards</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• NCAA Division I</p>
                    <p>• NCAA Division II</p>
                    <p>• NCAA Division III</p>
                    <p>• NAIA</p>
                    <p>• NJCAA</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Supported Categories</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• College Logos</p>
                    <p>• High School Logos</p>
                    <p>• Club Logos</p>
                    <p>• Athlete Photos</p>
                    <p>• Division Logos</p>
                    <p>• General</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
