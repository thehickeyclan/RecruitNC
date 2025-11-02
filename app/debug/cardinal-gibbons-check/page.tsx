"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Search, AlertTriangle } from "lucide-react"

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
  updated_at: string
}

interface MediaItem {
  id: string
  url: string
  original_name: string
  category: string
  entity_name: string
  created_at: string
}

export default function CardinalGibbonsCheck() {
  const [loading, setLoading] = useState(true)
  const [logoMappings, setLogoMappings] = useState<LogoMapping[]>([])
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load logo mappings
      const logoResponse = await fetch("/api/logo-mappings-simple")
      if (logoResponse.ok) {
        const logoData = await logoResponse.json()
        if (logoData.success) {
          // Filter for Cardinal Gibbons related entries
          const cardinalGibbons = logoData.data.filter(
            (logo: LogoMapping) =>
              logo.entity_name.toLowerCase().includes("cardinal") || logo.entity_name.toLowerCase().includes("gibbons"),
          )
          setLogoMappings(cardinalGibbons)
        }
      }

      // Load media items
      const mediaResponse = await fetch("/api/media-manager/items")
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json()
        if (mediaData.success) {
          // Filter for Cardinal Gibbons related media
          const cardinalGibbonsMedia = mediaData.items.filter(
            (item: MediaItem) =>
              item.original_name?.toLowerCase().includes("cardinal") ||
              item.original_name?.toLowerCase().includes("gibbons") ||
              item.entity_name?.toLowerCase().includes("cardinal") ||
              item.entity_name?.toLowerCase().includes("gibbons"),
          )
          setMediaItems(cardinalGibbonsMedia)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const deleteLogoMapping = async (id: string) => {
    if (!confirm("Delete this logo mapping?")) return

    try {
      const response = await fetch("/api/logo-mappings-simple", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      const result = await response.json()
      if (result.success) {
        await loadData() // Reload data
      } else {
        alert(`Failed to delete: ${result.error}`)
      }
    } catch (error) {
      alert("Error deleting logo mapping")
    }
  }

  const deleteMediaItem = async (id: string) => {
    if (!confirm("Delete this media item?")) return

    try {
      const response = await fetch(`/api/media-manager/delete/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()
      if (result.success) {
        await loadData() // Reload data
      } else {
        alert(`Failed to delete: ${result.error}`)
      }
    } catch (error) {
      alert("Error deleting media item")
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <span className="text-lg">Loading Cardinal Gibbons data...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cardinal Gibbons Debug</h1>
            <p className="text-gray-600">Check current state of Cardinal Gibbons logo mappings and media</p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logo Mappings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Logo Mappings
              <Badge variant="outline">{logoMappings.length} found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logoMappings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium">No Cardinal Gibbons logo mappings found</p>
                <p className="text-sm mt-2">This means there's no logo mapping in the database</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logoMappings.map((logo) => (
                  <div key={logo.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{logo.entity_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="capitalize">
                            {logo.entity_type}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Created: {new Date(logo.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 break-all">URL: {logo.logo_url}</p>
                        </div>
                        {logo.logo_url && (
                          <div className="mt-3">
                            <img
                              src={logo.logo_url || "/placeholder.svg"}
                              alt={logo.entity_name}
                              className="w-16 h-16 object-contain border rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg?height=64&width=64&text=Failed"
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => deleteLogoMapping(logo.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Media Items
              <Badge variant="outline">{mediaItems.length} found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mediaItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium">No Cardinal Gibbons media items found</p>
                <p className="text-sm mt-2">This means there's no media file in the database</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mediaItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.original_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="capitalize">
                            {item.category}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Created: {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {item.entity_name && <p className="text-sm text-gray-600 mt-1">Entity: {item.entity_name}</p>}
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 break-all">URL: {item.url}</p>
                        </div>
                        {item.url && (
                          <div className="mt-3">
                            <img
                              src={item.url || "/placeholder.svg"}
                              alt={item.original_name}
                              className="w-16 h-16 object-contain border rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg?height=64&width=64&text=Failed"
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => deleteMediaItem(item.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-blue-800">
              <p>• If you see a blank/broken logo mapping above, delete it first</p>
              <p>• Then go to Media Manager Pro → Logo Manager → "Upload Logo"</p>
              <p>• Enter "Cardinal Gibbons High School" as the entity name</p>
              <p>• Select "High School" as the type</p>
              <p>• Upload the logo file</p>
              <p>• This will create both the media item and logo mapping properly</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
