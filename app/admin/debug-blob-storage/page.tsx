"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, FileImage, FolderOpen } from "lucide-react"

interface BlobFile {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

export default function DebugBlobStoragePage() {
  const [allBlobs, setAllBlobs] = useState<BlobFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBlobs = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Loading all blobs...")
      const response = await fetch("/api/blob/list")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const data = await response.json()
      console.log("Blob data:", data)

      if (data.blobs && Array.isArray(data.blobs)) {
        const formattedBlobs = data.blobs.map((blob: any) => ({
          url: blob.url,
          pathname: blob.pathname || blob.url.split("/").pop() || "unknown",
          size: blob.size || 0,
          uploadedAt: blob.uploadedAt || new Date().toISOString(),
        }))
        setAllBlobs(formattedBlobs)
      } else {
        setAllBlobs([])
      }
    } catch (err) {
      console.error("Error loading blobs:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBlobs()
  }, [])

  const getCategory = (pathname: string): string => {
    const path = pathname.toLowerCase()
    if (path.includes("/athlete/") || path.startsWith("athlete/")) return "athlete"
    if (path.includes("/highschool/") || path.startsWith("highschool/")) return "highschool"
    if (path.includes("/college/") || path.startsWith("college/")) return "college"
    if (path.includes("/club/") || path.startsWith("club/")) return "club"
    if (path.includes("athlete")) return "athlete"
    if (path.includes("highschool") || path.includes("high-school")) return "highschool"
    if (path.includes("college") || path.includes("university")) return "college"
    if (path.includes("club") || path.includes("wrestling")) return "club"
    return "uncategorized"
  }

  const getCategoryStats = () => {
    const stats: Record<string, number> = {}
    allBlobs.forEach((blob) => {
      const category = getCategory(blob.pathname)
      stats[category] = (stats[category] || 0) + 1
    })
    return stats
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-nc-gold mx-auto mb-4" />
            <span className="text-lg">Loading blob storage data...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Blob Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <Button onClick={loadBlobs} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const categoryStats = getCategoryStats()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-nc-blue">Debug Blob Storage</h1>
            <p className="text-gray-600">Inspect your Vercel Blob storage contents</p>
          </div>
          <Button onClick={loadBlobs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FileImage className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allBlobs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(allBlobs.reduce((sum, blob) => sum + blob.size, 0))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(categoryStats).length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Largest File</CardTitle>
              <FileImage className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allBlobs.length > 0 ? formatFileSize(Math.max(...allBlobs.map((b) => b.size))) : "0 Bytes"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(categoryStats).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <Badge variant="outline">{category}</Badge>
                  <span className="font-medium">{count} files</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* File List */}
        <Card>
          <CardHeader>
            <CardTitle>All Files ({allBlobs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allBlobs.map((blob, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{blob.pathname}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(blob.size)} • {new Date(blob.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getCategory(blob.pathname)}
                    </Badge>
                    <img
                      src={blob.url || "/placeholder.svg"}
                      alt="Preview"
                      className="w-8 h-8 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = "none"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
