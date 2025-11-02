"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Upload, ExternalLink, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PhotoManagerPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null)
  const [photoUrl, setPhotoUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [copiedUrls, setCopiedUrls] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    fetchAthletes()
  }, [])

  const fetchAthletes = async () => {
    try {
      const response = await fetch("/api/athletes")
      const data = await response.json()
      setAthletes(data || [])
    } catch (error) {
      console.error("Error fetching athletes:", error)
      toast({
        title: "Error",
        description: "Failed to load athletes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File, athleteId: string) => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("athleteId", athleteId)
      formData.append("category", "athlete")

      const response = await fetch("/api/athletes/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")

      const result = await response.json()

      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      })

      // Refresh athletes list
      fetchAthletes()
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const updatePhotoUrl = async (athleteId: string, url: string) => {
    try {
      const response = await fetch(`/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: url }),
      })

      if (!response.ok) throw new Error("Update failed")

      toast({
        title: "Success",
        description: "Photo URL updated successfully",
      })

      fetchAthletes()
    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Error",
        description: "Failed to update photo URL",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = async (text: string, athleteId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedUrls((prev) => new Set(prev).add(athleteId))
      setTimeout(() => {
        setCopiedUrls((prev) => {
          const newSet = new Set(prev)
          newSet.delete(athleteId)
          return newSet
        })
      }, 2000)

      toast({
        title: "Copied",
        description: "URL copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      })
    }
  }

  const filteredAthletes = athletes.filter(
    (athlete) =>
      athlete?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete?.college?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete?.highschool?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const athletesWithoutPhotos = filteredAthletes.filter((athlete) => !athlete.photoUrl && !athlete.photourl)
  const athletesWithPhotos = filteredAthletes.filter((athlete) => athlete.photoUrl || athlete.photourl)

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Athlete Photo Manager</h1>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <a href="/admin/athletes" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Athletes Admin
            </a>
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Label htmlFor="search">Search Athletes</Label>
        <Input
          id="search"
          placeholder="Search by name, college, or high school..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Tabs defaultValue="missing" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="missing">Missing Photos ({athletesWithoutPhotos.length})</TabsTrigger>
          <TabsTrigger value="existing">Has Photos ({athletesWithPhotos.length})</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="sources">Photo Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="missing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Athletes Missing Photos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-10">Loading athletes...</div>
              ) : athletesWithoutPhotos.length === 0 ? (
                <div className="text-center py-10 text-green-600">🎉 All athletes have photos!</div>
              ) : (
                <div className="grid gap-4">
                  {athletesWithoutPhotos.map((athlete) => (
                    <div key={athlete.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{athlete.name}</h3>
                          <p className="text-sm text-gray-600">
                            {athlete.highschool} → {athlete.college}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{athlete.graduationyear}</Badge>
                            <Badge variant="outline">{athlete.weightclass}lbs</Badge>
                            <Badge variant="outline">{athlete.division}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`file-${athlete.id}`}>Upload Photo</Label>
                          <Input
                            id={`file-${athlete.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(file, athlete.id)
                            }}
                            disabled={uploading}
                          />
                        </div>

                        <div>
                          <Label htmlFor={`url-${athlete.id}`}>Or Enter Photo URL</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`url-${athlete.id}`}
                              placeholder="https://..."
                              value={selectedAthlete?.id === athlete.id ? photoUrl : ""}
                              onChange={(e) => {
                                setSelectedAthlete(athlete)
                                setPhotoUrl(e.target.value)
                              }}
                            />
                            <Button
                              onClick={() => updatePhotoUrl(athlete.id, photoUrl)}
                              disabled={!photoUrl || selectedAthlete?.id !== athlete.id}
                              size="sm"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Athletes with Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {athletesWithPhotos.map((athlete) => (
                  <div key={athlete.id} className="border rounded-lg p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {(athlete.photoUrl || athlete.photourl) && (
                          <img
                            src={athlete.photoUrl || athlete.photourl}
                            alt={athlete.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{athlete.name}</h3>
                        <p className="text-sm text-gray-600">
                          {athlete.highschool} → {athlete.college}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {(athlete.photoUrl || athlete.photourl)?.substring(0, 50)}...
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(athlete.photoUrl || athlete.photourl, athlete.id)}
                          >
                            {copiedUrls.has(athlete.id) ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Photo Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Bulk Upload Instructions:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Name files with athlete names: "john-smith.jpg", "jane-doe.png"</li>
                  <li>Use lowercase with hyphens instead of spaces</li>
                  <li>Supported formats: JPG, PNG, WebP</li>
                  <li>Recommended size: 400x500px or similar aspect ratio</li>
                </ol>
              </div>

              <div>
                <Label htmlFor="bulk-upload">Select Multiple Photos</Label>
                <Input
                  id="bulk-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    console.log(
                      "Selected files:",
                      files.map((f) => f.name),
                    )
                    // TODO: Implement bulk upload logic
                  }}
                />
              </div>

              <Button disabled className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Best Sources for Commit Photos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">🏆 Primary Sources:</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    • <strong>Instagram:</strong> Search athlete name + "wrestling" + "commit"
                  </li>
                  <li>
                    • <strong>Twitter/X:</strong> Check athlete and school accounts
                  </li>
                  <li>
                    • <strong>School websites:</strong> Athletic department announcements
                  </li>
                  <li>
                    • <strong>Wrestling forums:</strong> FloWrestling, InterMat, etc.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">📱 Social Media Tips:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Look for posts with college logos and athlete photos</li>
                  <li>• Check tagged photos from signing day events</li>
                  <li>• Search hashtags: #committed #wrestling #[collegename]</li>
                  <li>• Right-click → "Copy image address" for direct URLs</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">⚖️ Usage Guidelines:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Use publicly posted commitment photos</li>
                  <li>• Credit sources when possible</li>
                  <li>• Avoid personal/private photos</li>
                  <li>• Prefer official school/team announcements</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">🔍 Quick Search Links:</h4>
                <div className="space-y-2 text-sm">
                  <p>Replace [ATHLETE_NAME] with actual name:</p>
                  <ul className="space-y-1">
                    <li>
                      • <code>site:instagram.com "[ATHLETE_NAME]" wrestling commit</code>
                    </li>
                    <li>
                      • <code>site:twitter.com "[ATHLETE_NAME]" wrestling committed</code>
                    </li>
                    <li>
                      • <code>"[ATHLETE_NAME]" wrestling signing day</code>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
