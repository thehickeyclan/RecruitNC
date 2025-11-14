"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Trash2, Copy, ExternalLink, RefreshCw, AlertTriangle } from "lucide-react"
import Image from "next/image"

interface DuplicateBlob {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

interface DuplicateGroup {
  pattern: string
  count: number
  blobs: DuplicateBlob[]
}

interface DuplicateResponse {
  success: boolean
  totalBlobs: number
  duplicateGroups: DuplicateGroup[]
  appStateLogos: DuplicateBlob[]
}

export default function DuplicateCleanup() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [appStateLogos, setAppStateLogos] = useState<DuplicateBlob[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const loadDuplicates = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/cleanup-duplicate-logos")
      const data: DuplicateResponse = await response.json()

      if (data.success) {
        setDuplicates(data.duplicateGroups)
        setAppStateLogos(data.appStateLogos)
      }
    } catch (error) {
      console.error("Failed to load duplicates:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDuplicates()
  }, [])

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      console.error("Failed to copy URL:", error)
    }
  }

  const deleteDuplicates = async (urlsToDelete: string[]) => {
    setDeleting(true)
    try {
      const response = await fetch("/api/cleanup-duplicate-logos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlsToDelete }),
      })

      const result = await response.json()
      if (result.success) {
        await loadDuplicates() // Refresh the list
      }
    } catch (error) {
      console.error("Failed to delete duplicates:", error)
    } finally {
      setDeleting(false)
    }
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
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Scanning for duplicates...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* App State Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏔️ Your App State Logo
            <Badge variant="secondary">Ready to Use!</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Good news!</strong> You already have the App State logo uploaded. Use this URL instead of
              uploading again:
            </AlertDescription>
          </Alert>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 border rounded-lg overflow-hidden bg-white">
                <Image
                  src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png"
                  alt="App State Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <div className="font-mono text-sm bg-white p-2 rounded border">
                  https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png
                </div>
              </div>
              <Button
                onClick={() =>
                  copyToClipboard(
                    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png",
                  )
                }
                variant="outline"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copiedUrl ===
                "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/b9jnnu11-1745955862533.png"
                  ? "Copied!"
                  : "Copy URL"}
              </Button>
            </div>
          </div>

          {appStateLogos.length > 1 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">⚠️ Found {appStateLogos.length} App State logos:</h4>
              <div className="space-y-2">
                {appStateLogos.map((logo, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 border rounded overflow-hidden">
                        <Image
                          src={logo.url || "/placeholder.svg"}
                          alt="Logo"
                          width={32}
                          height={32}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-mono">{logo.pathname}</span>
                      <span className="text-muted-foreground">({formatFileSize(logo.size)})</span>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => copyToClipboard(logo.url)} variant="ghost" size="sm">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button onClick={() => window.open(logo.url, "_blank")} variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicates Section */}
      {duplicates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🗑️ Duplicate Files Found</span>
              <Button onClick={loadDuplicates} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {duplicates.map((group, groupIndex) => (
                <div key={groupIndex} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">
                      Duplicate Group {groupIndex + 1}
                      <Badge variant="destructive" className="ml-2">
                        {group.count} copies
                      </Badge>
                    </h4>
                    <Button
                      onClick={() => {
                        // Keep the first one, delete the rest
                        const urlsToDelete = group.blobs.slice(1).map((blob) => blob.url)
                        deleteDuplicates(urlsToDelete)
                      }}
                      variant="destructive"
                      size="sm"
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleting ? "Deleting..." : `Delete ${group.count - 1} Duplicates`}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {group.blobs.map((blob, blobIndex) => (
                      <div
                        key={blobIndex}
                        className={`flex items-center justify-between p-2 rounded ${blobIndex === 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} border`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 border rounded overflow-hidden bg-white">
                            <Image
                              src={blob.url || "/placeholder.svg"}
                              alt="File"
                              width={32}
                              height={32}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="font-mono text-xs">{blob.pathname}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(blob.size)} • {new Date(blob.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>
                          {blobIndex === 0 && <Badge variant="secondary">Keep This One</Badge>}
                          {blobIndex > 0 && <Badge variant="destructive">Will Delete</Badge>}
                        </div>
                        <Button onClick={() => copyToClipboard(blob.url)} variant="ghost" size="sm">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {duplicates.length === 0 && (
        <Alert>
          <AlertDescription>✅ No duplicate files found! Your storage is clean.</AlertDescription>
        </Alert>
      )}

      {copiedUrl && (
        <Alert>
          <AlertDescription>
            ✅ URL copied to clipboard! You can now use this logo in your wrestling portal.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
