"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LegacyCompatibility } from "@/components/media-manager/legacy-compatibility"
import { useToast } from "@/components/ui/use-toast"

export default function TestMediaSystemsPage() {
  const { toast } = useToast()

  const handleUploadComplete = (url: string) => {
    toast({
      title: "Upload completed",
      description: `Image uploaded successfully: ${url}`,
    })
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Test Media Systems</h1>
        <p className="text-gray-600">Test both legacy and new media management systems side by side</p>
      </div>

      <Tabs defaultValue="comparison" className="space-y-6">
        <TabsList>
          <TabsTrigger value="comparison">System Comparison</TabsTrigger>
          <TabsTrigger value="athlete">Athlete Images</TabsTrigger>
          <TabsTrigger value="college">College Logos</TabsTrigger>
          <TabsTrigger value="highschool">High School Logos</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          <LegacyCompatibility category="general" onUploadComplete={handleUploadComplete} />
        </TabsContent>

        <TabsContent value="athlete">
          <Card>
            <CardHeader>
              <CardTitle>Athlete Image Upload</CardTitle>
              <CardDescription>Test uploading athlete images with both systems</CardDescription>
            </CardHeader>
            <CardContent>
              <LegacyCompatibility category="athlete" entityType="athlete" onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="college">
          <Card>
            <CardHeader>
              <CardTitle>College Logo Upload</CardTitle>
              <CardDescription>Test uploading college logos with both systems</CardDescription>
            </CardHeader>
            <CardContent>
              <LegacyCompatibility category="college" entityType="college" onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highschool">
          <Card>
            <CardHeader>
              <CardTitle>High School Logo Upload</CardTitle>
              <CardDescription>Test uploading high school logos with both systems</CardDescription>
            </CardHeader>
            <CardContent>
              <LegacyCompatibility
                category="highschool"
                entityType="highschool"
                onUploadComplete={handleUploadComplete}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
