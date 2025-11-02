"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Copy, Upload, RefreshCw } from "lucide-react"
import Image from "next/image"

interface LogoBlob {
  url: string
  filename: string
  size: number
  uploadedAt: string
  downloadUrl: string
}

interface ExistingLogosResponse {
  success: boolean
  totalBlobs: number
  logoBlobs: LogoBlob[]
  allBlobs: Array<{ url: string; filename: string; size: number }>
}

export default function LogoManager() {
  const [existingLogos, setExistingLogos] = useState<LogoBlob[]>([])
  const [allBlobs, setAllBlobs] = useState<Array<{ url: string; filename: string; size: number }>>([])
  const [loading, setLoading] = useState(true)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const loadExistingLogos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/check-existing-logos")
      const data: ExistingLogosResponse = await response.json()

      if (data.success) {
        setExistingLogos(data.logoBlobs)
        setAllBlobs(data.allBlobs)
      }
    } catch (error) {
      console.error("Failed to load existing logos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExistingLogos()
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const isAppStateRelated = (filename: string) => {
    const appStateKeywords = ["appalachian", "app-state", "mountaineers", "boone"]
    return appStateKeywords.some((keyword) => filename.toLowerCase().includes(keyword.toLowerCase()))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading existing logos...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🏛️ Logo Management Dashboard</span>
            <Button onClick={loadExistingLogos} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{allBlobs.length}</div>
              <div className="text-sm text-blue-600">Total Files</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{existingLogos.length}</div>
              <div className="text-sm text-green-600">Logo Files</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {existingLogos.filter((logo) => isAppStateRelated(logo.filename)).length}
              </div>
              <div className="text-sm text-purple-600">App State Related</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {existingLogos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Existing Logo Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {existingLogos.map((logo, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{logo.filename}</h3>
                        {isAppStateRelated(logo.filename) && <Badge variant="secondary">🏔️ App State</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Size: {formatFileSize(logo.size)}</div>
                        <div>Uploaded: {new Date(logo.uploadedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <div className="w-24 h-24 border rounded-lg overflow-hidden bg-gray-50">
                        <Image
                          src={logo.url || "/placeholder.svg"}
                          alt={logo.filename}
                          width={96}
                          height={96}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button onClick={() => copyToClipboard(logo.url)} variant="outline" size="sm" className="flex-1">
                      <Copy className="h-4 w-4 mr-2" />
                      {copiedUrl === logo.url ? "Copied!" : "Copy URL"}
                    </Button>
                    <Button onClick={() => window.open(logo.url, "_blank")} variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  {copiedUrl === logo.url && (
                    <Alert>
                      <AlertDescription className="text-sm">
                        ✅ URL copied to clipboard! You can now use this in your wrestling portal.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {allBlobs.length > existingLogos.length && (
        <Card>
          <CardHeader>
            <CardTitle>📁 All Other Files ({allBlobs.length - existingLogos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allBlobs
                .filter((blob) => !existingLogos.some((logo) => logo.url === blob.url))
                .map((blob, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div>
                      <div className="font-medium">{blob.filename}</div>
                      <div className="text-muted-foreground">{formatFileSize(blob.size)}</div>
                    </div>
                    <Button onClick={() => copyToClipboard(blob.url)} variant="ghost" size="sm">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {existingLogos.length === 0 && (
        <Alert>
          <Upload className="h-4 w-4" />
          <AlertDescription>
            No logo files found. You may need to upload your first logo, or the files might be named differently.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
