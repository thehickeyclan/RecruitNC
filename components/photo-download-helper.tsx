"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Download, ExternalLink, Search, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PhotoDownloadHelperProps {
  athlete?: {
    id: string
    name: string
    college: string
    highschool: string
    graduationyear: number
  }
}

export function PhotoDownloadHelper({ athlete }: PhotoDownloadHelperProps) {
  const [searchUrls, setSearchUrls] = useState<string[]>([])
  const [selectedUrl, setSelectedUrl] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const generateSearchUrls = () => {
    if (!athlete) return

    const athleteName = athlete.name.toLowerCase().replace(/\s+/g, "+")
    const collegeName = athlete.college.toLowerCase().replace(/\s+/g, "+")

    const urls = [
      // Instagram searches
      `https://www.instagram.com/explore/tags/${athleteName.replace(/\+/g, "")}wrestling/`,
      `https://www.google.com/search?q=site:instagram.com+"${athlete.name}"+wrestling+commit&tbm=isch`,

      // Twitter searches
      `https://twitter.com/search?q="${athlete.name}"+wrestling+committed&src=typed_query&f=image`,
      `https://twitter.com/search?q="${athlete.name}"+${collegeName}&src=typed_query&f=image`,

      // Google image searches
      `https://www.google.com/search?q="${athlete.name}"+wrestling+commit+${collegeName}&tbm=isch`,
      `https://www.google.com/search?q="${athlete.name}"+signing+day+wrestling&tbm=isch`,

      // College website searches
      `https://www.google.com/search?q=site:${collegeName.replace(/\+/g, "")}.edu+"${athlete.name}"+wrestling&tbm=isch`,

      // Wrestling news sites
      `https://www.google.com/search?q=site:flowrestling.org+"${athlete.name}"&tbm=isch`,
      `https://www.google.com/search?q=site:intermatwrestle.com+"${athlete.name}"&tbm=isch`,
    ]

    setSearchUrls(urls)
  }

  const downloadImage = async (url: string) => {
    setDownloading(true)
    try {
      // This would typically involve a server-side proxy to avoid CORS issues
      const response = await fetch(`/api/download-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: url,
          athleteId: athlete?.id,
          filename: `${athlete?.name.toLowerCase().replace(/\s+/g, "-")}-commit.jpg`,
        }),
      })

      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `${athlete?.name.replace(/\s+/g, "-")}-commit.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      toast({
        title: "Success",
        description: "Image downloaded successfully",
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Error",
        description: "Failed to download image. Try right-clicking and saving manually.",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  const copySearchTerms = async () => {
    const searchTerms = [
      `"${athlete?.name}" wrestling commit`,
      `"${athlete?.name}" ${athlete?.college} wrestling`,
      `"${athlete?.name}" signing day`,
      `${athlete?.name} wrestling ${athlete?.graduationyear}`,
    ].join("\n")

    try {
      await navigator.clipboard.writeText(searchTerms)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      toast({
        title: "Copied",
        description: "Search terms copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy search terms",
        variant: "destructive",
      })
    }
  }

  if (!athlete) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Select an athlete to see photo download options</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Photo Search for {athlete.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{athlete.highschool}</Badge>
            <Badge variant="outline">{athlete.college}</Badge>
            <Badge variant="outline">Class of {athlete.graduationyear}</Badge>
          </div>

          <div className="flex gap-2">
            <Button onClick={generateSearchUrls} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Generate Search Links
            </Button>
            <Button onClick={copySearchTerms} variant="outline">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy Search Terms
            </Button>
          </div>

          {searchUrls.length > 0 && (
            <div className="space-y-2">
              <Label>Quick Search Links:</Label>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {searchUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="text-xs flex-1 truncate">{url}</span>
                    <Button size="sm" variant="outline" asChild>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Photo URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="photo-url">Found a photo? Paste the URL here:</Label>
            <Input
              id="photo-url"
              placeholder="https://..."
              value={selectedUrl}
              onChange={(e) => setSelectedUrl(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => downloadImage(selectedUrl)} disabled={!selectedUrl || downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Downloading..." : "Download Image"}
            </Button>

            {selectedUrl && (
              <Button variant="outline" asChild>
                <a href={selectedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </a>
              </Button>
            )}
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm">
            <strong>Tip:</strong> Right-click on images and select "Copy image address" to get the direct URL.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
