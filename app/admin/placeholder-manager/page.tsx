"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, Trash2 } from "lucide-react"
import { getPlaceholderConfigs } from "@/lib/placeholder-system"
import Image from "next/image"

interface PlaceholderItem {
  key: string
  currentUrl: string
  defaultPath: string
  description: string
  category: string
  isCustom: boolean
}

export default function PlaceholderManager() {
  const [placeholders, setPlaceholders] = useState<PlaceholderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    loadPlaceholders()
  }, [])

  const loadPlaceholders = async () => {
    try {
      const configs = getPlaceholderConfigs()
      const items: PlaceholderItem[] = []

      for (const config of configs) {
        // Check if there's a custom version
        const response = await fetch(`/api/placeholder/${config.key}`)
        const isCustom = response.ok
        const data = isCustom ? await response.json() : null

        items.push({
          key: config.key,
          currentUrl: data?.url || config.defaultPath,
          defaultPath: config.defaultPath,
          description: config.description,
          category: config.category,
          isCustom,
        })
      }

      setPlaceholders(items)
    } catch (error) {
      console.error("Error loading placeholders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (key: string, file: File) => {
    setUploading(key)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", "placeholder")
      formData.append("name", key)

      const response = await fetch("/api/media-manager/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        await loadPlaceholders() // Reload to show new image
      } else {
        console.error("Upload failed")
      }
    } catch (error) {
      console.error("Error uploading:", error)
    } finally {
      setUploading(null)
    }
  }

  const resetToDefault = async (key: string) => {
    try {
      const response = await fetch(`/api/placeholder/${key}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await loadPlaceholders()
      }
    } catch (error) {
      console.error("Error resetting placeholder:", error)
    }
  }

  if (loading) {
    return <div className="p-6">Loading placeholders...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Placeholder Manager</h1>
        <p className="text-gray-600">Manage placeholder images used throughout the site</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {placeholders.map((item) => (
          <Card key={item.key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{item.key}</CardTitle>
                <Badge variant={item.isCustom ? "default" : "secondary"}>{item.isCustom ? "Custom" : "Default"}</Badge>
              </div>
              <p className="text-sm text-gray-600">{item.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Image Preview */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={item.currentUrl || "/placeholder.svg"}
                  alt={item.description}
                  width={200}
                  height={200}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg"
                  }}
                />
              </div>

              {/* Upload Controls */}
              <div className="space-y-2">
                <Label htmlFor={`upload-${item.key}`}>Upload New Image</Label>
                <Input
                  id={`upload-${item.key}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleFileUpload(item.key, file)
                    }
                  }}
                  disabled={uploading === item.key}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {item.isCustom && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetToDefault(item.key)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset to Default
                  </Button>
                )}

                {uploading === item.key && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Upload className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                )}
              </div>

              {/* Default Path Info */}
              <div className="text-xs text-gray-500">Default: {item.defaultPath}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
