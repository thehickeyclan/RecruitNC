"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
  Search,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  ImageIcon,
  FileText,
  Video,
  Music,
  File,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import Image from "next/image"

interface MediaItem {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
  updated_at: string
  source: string
}

interface BlobItem {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
  updated_at: string
}

export default function MediaManagerPro() {
  const [allItems, setAllItems] = useState<MediaItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [isUploading, setIsUploading] = useState(false)
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showEntityUploadDialog, setShowEntityUploadDialog] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    blobs: 0,
    logos: 0,
    images: 0,
    totalSize: 0,
  })

  // Entity logo upload state
  const [entityName, setEntityName] = useState("")
  const [entityType, setEntityType] = useState("")
  const [entityFile, setEntityFile] = useState<File | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    loadAllMedia()
  }, [])

  useEffect(() => {
    filterItems()
  }, [allItems, searchTerm, selectedCategory, selectedType])

  const loadAllMedia = async () => {
    setLoading(true)
    console.log("🔄 Loading all media from multiple sources...")

    try {
      const allMediaItems: MediaItem[] = []

      // 1. Load blob storage items
      console.log("📦 Loading blob storage items...")
      try {
        const blobResponse = await fetch("/api/blob/list")
        if (blobResponse.ok) {
          const blobData = await blobResponse.json()
          console.log("📦 Blob response:", blobData)

          if (blobData.blobs && Array.isArray(blobData.blobs)) {
            blobData.blobs.forEach((blob: BlobItem, index: number) => {
              allMediaItems.push({
                id: `blob-${index}`,
                entity_name: blob.pathname.split("/").pop() || "Unknown File",
                entity_type: "blob",
                logo_url: blob.url,
                created_at: blob.uploadedAt || new Date().toISOString(),
                updated_at: blob.uploadedAt || new Date().toISOString(),
                source: "blob_storage",
              })
            })
            console.log("✅ Loaded", blobData.blobs.length, "blob items")
          }
        }
      } catch (error) {
        console.error("❌ Error loading blobs:", error)
      }

      // 2. Load logo mappings
      console.log("🏷️ Loading logo mappings...")
      try {
        const logoResponse = await fetch("/api/logo-mappings-simple")
        if (logoResponse.ok) {
          const logoData = await logoResponse.json()
          console.log("🏷️ Logo response:", logoData)

          let logos: LogoMapping[] = []
          if (logoData.success && Array.isArray(logoData.data)) {
            logos = logoData.data
          } else if (Array.isArray(logoData)) {
            logos = logoData
          }

          logos.forEach((logo: LogoMapping) => {
            allMediaItems.push({
              id: `logo-${logo.id}`,
              entity_name: logo.entity_name,
              entity_type: logo.entity_type,
              logo_url: logo.logo_url,
              created_at: logo.created_at,
              updated_at: logo.updated_at,
              source: "logo_mappings",
            })
          })
          console.log("✅ Loaded", logos.length, "logo mappings")
        }
      } catch (error) {
        console.error("❌ Error loading logos:", error)
      }

      // 3. Try to load media items table if it exists
      console.log("💾 Loading media items table...")
      try {
        const mediaResponse = await fetch("/api/debug/media-items-raw")
        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json()
          console.log("💾 Media items response:", mediaData)

          if (mediaData.success && Array.isArray(mediaData.data)) {
            mediaData.data.forEach((item: any) => {
              allMediaItems.push({
                id: `media-${item.id}`,
                entity_name: item.original_name || item.filename || "Unknown",
                entity_type: item.category || "media",
                logo_url: item.url,
                created_at: item.created_at,
                updated_at: item.updated_at,
                source: "media_items_table",
              })
            })
            console.log("✅ Loaded", mediaData.data.length, "media table items")
          }
        }
      } catch (error) {
        console.error("❌ Error loading media items table:", error)
      }

      console.log("📊 Total items loaded:", allMediaItems.length)
      setAllItems(allMediaItems)

      // Calculate stats
      const imageCount = allMediaItems.filter(
        (item) =>
          item.logo_url?.includes(".png") ||
          item.logo_url?.includes(".jpg") ||
          item.logo_url?.includes(".jpeg") ||
          item.logo_url?.includes(".gif") ||
          item.logo_url?.includes(".webp"),
      ).length

      const blobCount = allMediaItems.filter((item) => item.source === "blob_storage").length
      const logoCount = allMediaItems.filter((item) => item.source === "logo_mappings").length

      setStats({
        total: allMediaItems.length,
        blobs: blobCount,
        logos: logoCount,
        images: imageCount,
        totalSize: 0, // We'd need to calculate this from blob data
      })
    } catch (error) {
      console.error("❌ Error loading media:", error)
      toast({
        title: "Error",
        description: "Failed to load media: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = allItems

    // Apply search filter
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.entity_name.toLowerCase().includes(searchLower) ||
          item.entity_type.toLowerCase().includes(searchLower) ||
          item.logo_url.toLowerCase().includes(searchLower),
      )
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.entity_type === selectedCategory)
    }

    // Apply type filter
    if (selectedType !== "all") {
      if (selectedType === "image") {
        filtered = filtered.filter(
          (item) =>
            item.logo_url?.includes(".png") ||
            item.logo_url?.includes(".jpg") ||
            item.logo_url?.includes(".jpeg") ||
            item.logo_url?.includes(".gif") ||
            item.logo_url?.includes(".webp"),
        )
      } else if (selectedType === "logo") {
        filtered = filtered.filter((item) => item.source === "logo_mappings")
      } else if (selectedType === "blob") {
        filtered = filtered.filter((item) => item.source === "blob_storage")
      }
    }

    console.log("🔍 Filtered to", filtered.length, "items")
    setFilteredItems(filtered)
  }

  const handleDelete = async (item: MediaItem) => {
    const fileName = item.entity_name || "this item"

    if (!confirm(`Are you sure you want to delete "${fileName}"?\n\nThis action cannot be undone.`)) {
      return
    }

    setDeleting(item.id)

    try {
      let response
      let success = false

      if (item.source === "logo_mappings") {
        // Delete logo mapping
        const logoId = item.id.replace("logo-", "")
        response = await fetch("/api/logo-mappings-simple", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: logoId }),
        })
        success = response.ok
      } else if (item.source === "blob_storage") {
        // Delete blob
        response = await fetch("/api/blob/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: item.logo_url }),
        })
        success = response.ok
      } else if (item.source === "media_items_table") {
        // Delete media item
        response = await fetch("/api/media-manager/delete-by-url", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: item.logo_url }),
        })
        success = response.ok
      }

      if (success) {
        // Remove from local state immediately for better UX
        setAllItems((prev) => prev.filter((i) => i.id !== item.id))
        setFilteredItems((prev) => prev.filter((i) => i.id !== item.id))

        toast({
          title: "Success",
          description: `"${fileName}" has been deleted successfully`,
        })
      } else {
        throw new Error("Failed to delete item")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = async (item: MediaItem, newName: string) => {
    setSaving(true)
    try {
      if (item.source === "logo_mappings") {
        const logoId = item.id.replace("logo-", "")
        const response = await fetch("/api/logo-mappings-simple", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: logoId,
            entity_name: newName,
            entity_type: item.entity_type,
            logo_url: item.logo_url,
            force_update: true,
          }),
        })

        if (response.ok) {
          toast({
            title: "Success",
            description: "Logo mapping updated successfully",
          })
          await loadAllMedia()
          setEditingItem(null)
        } else {
          throw new Error("Failed to update logo mapping")
        }
      } else {
        // For other types, we might not have edit functionality yet
        toast({
          title: "Info",
          description: "Editing not yet supported for this item type",
        })
      }
    } catch (error) {
      console.error("Edit error:", error)
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "URL copied to clipboard",
    })
  }

  const getFileIcon = (url: string) => {
    if (
      url.includes(".png") ||
      url.includes(".jpg") ||
      url.includes(".jpeg") ||
      url.includes(".gif") ||
      url.includes(".webp")
    ) {
      return <ImageIcon className="h-4 w-4" />
    }
    if (url.includes(".mp4") || url.includes(".mov") || url.includes(".avi")) {
      return <Video className="h-4 w-4" />
    }
    if (url.includes(".mp3") || url.includes(".wav") || url.includes(".m4a")) {
      return <Music className="h-4 w-4" />
    }
    if (url.includes(".pdf") || url.includes(".doc") || url.includes(".docx")) {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const categories = ["all", "blob", "college", "highschool", "club", "media", "general"]
  const types = ["all", "image", "logo", "blob", "video", "audio", "document"]

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading media library from all sources...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Media Manager Pro</h1>
          <p className="text-muted-foreground">Find that wrestling club placeholder URL!</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAllMedia} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Debug Info */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            <strong>Loaded from multiple sources:</strong> Total: {allItems.length}, Filtered: {filteredItems.length}
            <br />
            <strong>Sources:</strong> Blob Storage: {stats.blobs}, Logo Mappings: {stats.logos}, Images: {stats.images}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Images</p>
                <p className="text-2xl font-bold">{stats.images}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Blob Storage</p>
                <p className="text-2xl font-bold">{stats.blobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Logo Mappings</p>
                <p className="text-2xl font-bold">{stats.logos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for wrestling club placeholder or any URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              {/* Preview */}
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                {item.logo_url?.includes(".png") ||
                item.logo_url?.includes(".jpg") ||
                item.logo_url?.includes(".jpeg") ||
                item.logo_url?.includes(".gif") ||
                item.logo_url?.includes(".webp") ? (
                  <Image
                    src={item.logo_url || "/placeholder.svg"}
                    alt={item.entity_name || "Media"}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">{getFileIcon(item.logo_url || "")}</div>
                )}

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => copyToClipboard(item.logo_url || "")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => window.open(item.logo_url, "_blank")}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingItem(item)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(item)}
                    disabled={deleting === item.id}
                  >
                    {deleting === item.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2">
                <h3 className="font-medium truncate" title={item.entity_name}>
                  {item.entity_name || "Unnamed"}
                </h3>

                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {item.entity_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {item.source}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="truncate font-mono" title={item.logo_url}>
                    {item.logo_url || "No URL"}
                  </p>
                  <p>Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Unknown"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No media found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCategory !== "all" || selectedType !== "all"
                ? "Try adjusting your search or filters"
                : "No media items could be loaded"}
            </p>
            <Button onClick={loadAllMedia}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload All Sources
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Media Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Name</Label>
                <Input
                  id="editName"
                  defaultValue={editingItem.entity_name}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEdit(editingItem, e.currentTarget.value)
                    }
                  }}
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input value={editingItem.logo_url} readOnly className="font-mono text-xs" />
              </div>
              <div>
                <Label>Source</Label>
                <Input value={editingItem.source} readOnly />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const input = document.getElementById("editName") as HTMLInputElement
                    handleEdit(editingItem, input.value)
                  }}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
