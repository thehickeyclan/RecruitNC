"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Search, Filter, Copy, Check, Grid, List, Edit, X, Save } from "lucide-react"
import { clientMediaService } from "@/lib/media-manager/client-service"

interface MediaItem {
  id: string
  url: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  category: string
  entityId?: string
  entityType?: string
  alt?: string
  caption?: string
  tags: string[]
  createdAt: string
}

interface MediaGalleryProps {
  onSelect?: (item: MediaItem) => void
  category?: string
  entityType?: string
  entityId?: string
}

export function MediaGallery({ onSelect, category, entityType, entityId }: MediaGalleryProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(category || "all")
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const { toast } = useToast()

  const loadItems = async () => {
    try {
      setLoading(true)
      const result = await clientMediaService.searchMedia({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        entityType,
        entityId,
        search: searchTerm || undefined,
        limit: 100,
      })

      if (result.success) {
        setItems(result.data)
        setWarning(null)
      } else {
        console.error("Failed to load media items:", result.error)
        setItems([])
        if (result.error?.includes("does not exist") || result.error?.includes("relation")) {
          setWarning("Media items table does not exist. Click 'Setup Database' to create it.")
          setShowSetupDialog(true)
        } else {
          setWarning("Database not available. Files are uploaded to blob storage but not tracked in database.")
        }
      }
    } catch (error) {
      console.error("Error loading media items:", error)
      setItems([])
      setWarning("Database not available. Upload functionality still works.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [selectedCategory, searchTerm, entityType, entityId])

  const handleDelete = async (item: MediaItem, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    if (!confirm(`Are you sure you want to delete "${item.originalName}"?`)) {
      return
    }

    try {
      const success = await clientMediaService.deleteMedia(item.id)
      if (success) {
        setItems(items.filter((i) => i.id !== item.id))
        if (selectedItem?.id === item.id) {
          setSelectedItem(null)
        }
        toast({
          title: "Deleted",
          description: "Media item deleted successfully",
        })
      } else {
        throw new Error("Delete failed")
      }
    } catch (error) {
      console.error("Error deleting media item:", error)
      toast({
        title: "Error",
        description: "Failed to delete media item",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (item: MediaItem) => {
    if (!editingItem) return

    try {
      const updated = await clientMediaService.updateMedia(editingItem.id, editingItem)
      if (updated) {
        setItems(items.map((i) => (i.id === updated.id ? updated : i)))
        setEditingItem(null)
        if (selectedItem?.id === updated.id) {
          setSelectedItem(updated)
        }
        toast({
          title: "Updated",
          description: "Media item updated successfully",
        })
      } else {
        throw new Error("Update failed")
      }
    } catch (error) {
      console.error("Error updating media item:", error)
      toast({
        title: "Error",
        description: "Failed to update media item",
        variant: "destructive",
      })
    }
  }

  const handleCopyUrl = async (url: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
      toast({
        title: "Copied!",
        description: "URL copied to clipboard",
      })
    } catch (error) {
      console.error("Failed to copy URL:", error)
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      })
    }
  }

  const handleSetupDatabase = async () => {
    try {
      const result = await clientMediaService.setupDatabase()
      if (result.success) {
        toast({
          title: "Success",
          description: "Database setup completed successfully",
        })
        setShowSetupDialog(false)
        setWarning(null)
        loadItems()
      } else {
        throw new Error(result.error || "Setup failed")
      }
    } catch (error) {
      console.error("Setup error:", error)
      toast({
        title: "Error",
        description: "Failed to setup database",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "college-logo", label: "College Logos" },
    { value: "high-school-logo", label: "High School Logos" },
    { value: "club-logo", label: "Club Logos" },
    { value: "athlete-photo", label: "Athlete Photos" },
    { value: "division-logo", label: "Division Logos" },
    { value: "general", label: "General" },
    { value: "uncategorized", label: "Uncategorized" },
  ]

  return (
    <div className="w-full space-y-6">
      <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-nc-blue">
            <Search className="h-5 w-5" />
            Media Gallery
            <Badge variant="outline" className="ml-auto">
              {items.length} items
            </Badge>
          </CardTitle>
          {warning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
              {warning}
              {showSetupDialog && (
                <Button size="sm" className="ml-2 bg-nc-blue hover:bg-nc-blue/90" onClick={handleSetupDatabase}>
                  Setup Database
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search media files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="border-nc-blue/20 hover:bg-nc-blue/10"
              >
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Gallery Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No media items found</p>
              <p className="text-sm mt-2">Upload some files or adjust your search filters</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="group hover:shadow-lg transition-all duration-200 cursor-pointer bg-white border-gray-200 hover:border-nc-blue/30"
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-3">
                    <div className="aspect-square relative mb-3 bg-gray-100 rounded-lg overflow-hidden">
                      {item.mimeType.startsWith("image/") ? (
                        <img
                          src={item.url || "/placeholder.svg"}
                          alt={item.alt || item.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-xs text-center font-mono">
                            {item.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
                          </span>
                        </div>
                      )}

                      {/* Action buttons overlay */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
                          onClick={(e) => handleCopyUrl(item.url, e)}
                          title="Copy URL"
                        >
                          {copiedUrl === item.url ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-600 shadow-sm"
                          onClick={(e) => handleDelete(item, e)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Category badge */}
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-xs bg-white/90 text-nc-blue border-nc-blue/20">
                          {item.category.replace("-", " ")}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium text-sm truncate text-nc-blue" title={item.originalName}>
                        {item.originalName}
                      </h3>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatFileSize(item.size)}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>

                      {onSelect && (
                        <Button
                          size="sm"
                          className="w-full bg-nc-gold text-nc-blue hover:bg-nc-gold/90"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelect(item)
                          }}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.mimeType.startsWith("image/") ? (
                      <img
                        src={item.url || "/placeholder.svg"}
                        alt={item.alt || item.originalName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-xs font-mono">
                          {item.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate text-nc-blue">{item.originalName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {item.category.replace("-", " ")}
                      </Badge>
                      <span className="text-xs text-gray-500">{formatFileSize(item.size)}</span>
                      <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingItem(item)
                      }}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => handleCopyUrl(item.url, e)} title="Copy URL">
                      {copiedUrl === item.url ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={(e) => handleDelete(item, e)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Item Detail Modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-nc-blue">{selectedItem.originalName}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {selectedItem.mimeType.startsWith("image/") && (
                <div className="flex justify-center">
                  <img
                    src={selectedItem.url || "/placeholder.svg"}
                    alt={selectedItem.alt || selectedItem.originalName}
                    className="max-w-full max-h-96 object-contain rounded-lg border"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>File Size:</strong> {formatFileSize(selectedItem.size)}
                </div>
                <div>
                  <strong>Type:</strong> {selectedItem.mimeType}
                </div>
                <div>
                  <strong>Category:</strong> {selectedItem.category.replace("-", " ")}
                </div>
                <div>
                  <strong>Created:</strong> {new Date(selectedItem.createdAt).toLocaleDateString()}
                </div>
              </div>

              {selectedItem.alt && (
                <div>
                  <strong>Alt Text:</strong> {selectedItem.alt}
                </div>
              )}

              {selectedItem.caption && (
                <div>
                  <strong>Caption:</strong> {selectedItem.caption}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleCopyUrl(selectedItem.url)}
                  className="flex-1 bg-nc-blue hover:bg-nc-blue/90"
                >
                  {copiedUrl === selectedItem.url ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </>
                  )}
                </Button>

                <Button onClick={() => setEditingItem(selectedItem)} variant="outline" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                {onSelect && (
                  <Button
                    onClick={() => {
                      onSelect(selectedItem)
                      setSelectedItem(null)
                    }}
                    className="flex-1 bg-nc-gold text-nc-blue hover:bg-nc-gold/90"
                  >
                    Select This Item
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-nc-blue">Edit Media Item</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={editingItem.category}
                  onValueChange={(value) => setEditingItem({ ...editingItem, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="alt">Alt Text</Label>
                <Input
                  id="alt"
                  value={editingItem.alt || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, alt: e.target.value })}
                  placeholder="Describe the image for accessibility"
                />
              </div>

              <div>
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  value={editingItem.caption || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })}
                  placeholder="Optional caption or description"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleEdit(editingItem)} className="flex-1 bg-nc-blue hover:bg-nc-blue/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button onClick={() => setEditingItem(null)} variant="outline" className="flex-1">
                  <X className="h-4 w-4 mr-2" />
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
