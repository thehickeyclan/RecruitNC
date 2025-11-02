"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Upload, Search, Grid, List, Edit, Trash2, Eye, ImageIcon, FileText, RefreshCw } from "lucide-react"
import Image from "next/image"

interface MediaItem {
  id: string
  filename: string
  original_name: string
  url: string
  category: string
  entity_type?: string
  entity_name?: string
  alias?: string
  alt_text?: string
  caption?: string
  tags: string[]
  mime_type: string
  size_bytes: number
  metadata: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

interface MediaUsage {
  id: string
  media_id: string
  used_in_table: string
  used_in_column: string
  used_in_record_id: string
  usage_context?: string
  created_at: string
}

const CATEGORIES = [
  "athlete-photos",
  "college-logos",
  "high-school-logos",
  "club-logos",
  "division-logos",
  "hero-images",
  "backgrounds",
  "icons",
  "other",
]

const ENTITY_TYPES = ["athlete", "college", "high-school", "club", "division", "tournament", "other"]

export default function UnifiedMediaManager() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all") // Updated default value
  const [selectedEntityType, setSelectedEntityType] = useState<string>("all") // Updated default value
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [usageData, setUsageData] = useState<MediaUsage[]>([])

  const { toast } = useToast()

  const fetchMediaItems = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      })

      if (searchTerm) params.append("search", searchTerm)
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory)
      if (selectedEntityType && selectedEntityType !== "all") params.append("entity_type", selectedEntityType)
      if (selectedTags.length > 0) params.append("tags", selectedTags.join(","))

      const response = await fetch(`/api/media/unified?${params}`)
      const data = await response.json()

      if (response.ok) {
        setMediaItems(data.data)
        setTotalPages(data.pagination.totalPages)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch media items",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch media items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsageData = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/media/usage/${mediaId}`)
      const data = await response.json()

      if (response.ok) {
        setUsageData(data)
      }
    } catch (error) {
      console.error("Failed to fetch usage data:", error)
    }
  }

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Are you sure you want to delete "${item.filename}"?`)) return

    try {
      const response = await fetch(`/api/media/unified/${item.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Media item deleted successfully",
        })
        fetchMediaItems()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete media item",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete media item",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (item: MediaItem, updates: Partial<MediaItem>) => {
    try {
      const response = await fetch(`/api/media/unified/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Media item updated successfully",
        })
        setEditingItem(null)
        fetchMediaItems()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to update media item",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update media item",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchMediaItems()
  }, [currentPage, searchTerm, selectedCategory, selectedEntityType, selectedTags])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const MediaItemCard = ({ item }: { item: MediaItem }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative bg-gray-100">
        {item.mime_type.startsWith("image/") ? (
          <Image
            src={item.url || "/placeholder.svg"}
            alt={item.alt_text || item.filename}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs">
            {item.category}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold truncate" title={item.filename}>
            {item.alias || item.filename}
          </h3>
          <p className="text-sm text-gray-600 truncate">{item.entity_name || item.original_name}</p>
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-gray-500">{formatFileSize(item.size_bytes)}</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedItem(item)
                  fetchUsageData(item.id)
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingItem(item)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Unified Media Manager</h1>
              <p className="text-gray-300">Manage all media assets with advanced organization and tracking</p>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)} className="bg-nc-gold text-nc-blue hover:bg-nc-gold/90">
              <Upload className="h-4 w-4 mr-2" />
              Upload Media
            </Button>
          </div>

          {/* Filters */}
          <Card className="bg-white/95 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search media..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Entity Type</Label>
                  <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {ENTITY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  >
                    {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchMediaItems} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media Grid */}
          <Card className="bg-white/95 backdrop-blur border-white/20">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-nc-blue" />
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No media items found</h3>
                  <p className="text-gray-500">Upload some media or adjust your filters</p>
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                      : "space-y-4"
                  }
                >
                  {mediaItems.map((item) => (
                    <MediaItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedItem.alias || selectedItem.filename}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {selectedItem.mime_type.startsWith("image/") ? (
                  <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={selectedItem.url || "/placeholder.svg"}
                      alt={selectedItem.alt_text || selectedItem.filename}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-gray-100 rounded-lg">
                    <FileText className="h-24 w-24 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Filename:</strong> {selectedItem.filename}
                    </div>
                    <div>
                      <strong>Original Name:</strong> {selectedItem.original_name}
                    </div>
                    <div>
                      <strong>Category:</strong> {selectedItem.category}
                    </div>
                    <div>
                      <strong>Size:</strong> {formatFileSize(selectedItem.size_bytes)}
                    </div>
                    <div>
                      <strong>Type:</strong> {selectedItem.mime_type}
                    </div>
                    {selectedItem.entity_type && (
                      <div>
                        <strong>Entity Type:</strong> {selectedItem.entity_type}
                      </div>
                    )}
                    {selectedItem.entity_name && (
                      <div>
                        <strong>Entity Name:</strong> {selectedItem.entity_name}
                      </div>
                    )}
                  </div>
                </div>

                {selectedItem.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedItem.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {usageData.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Usage</h3>
                    <div className="space-y-2 text-sm">
                      {usageData.map((usage) => (
                        <div key={usage.id} className="p-2 bg-gray-50 rounded">
                          <div>
                            <strong>Table:</strong> {usage.used_in_table}
                          </div>
                          <div>
                            <strong>Column:</strong> {usage.used_in_column}
                          </div>
                          <div>
                            <strong>Record ID:</strong> {usage.used_in_record_id}
                          </div>
                          {usage.usage_context && (
                            <div>
                              <strong>Context:</strong> {usage.usage_context}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
