"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { NewImageUpload } from "@/components/media-manager/new-image-upload"
import { Search, Trash2, Eye } from "lucide-react"

interface MediaItem {
  id: string
  url: string
  filename: string
  original_name: string
  category: string
  size_bytes: number
  mime_type: string
  created_at: string
  is_active: boolean
  entity_id?: string
  entity_type?: string
  alt_text?: string
  caption?: string
}

interface SearchResponse {
  success: boolean
  data: MediaItem[]
  count: number
  error?: string
}

export default function MediaManagerV2Page() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [entityTypeFilter, setEntityTypeFilter] = useState("all")
  const [totalCount, setTotalCount] = useState(0)

  const loadItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (categoryFilter !== "all") params.append("category", categoryFilter)
      if (entityTypeFilter !== "all") params.append("entityType", entityTypeFilter)
      params.append("limit", "50")

      const response = await fetch(`/api/media-manager/search?${params}`)
      const data: SearchResponse = await response.json()

      if (data.success) {
        setItems(data.data)
        setTotalCount(data.count)
      } else {
        console.error("Search failed:", data.error)
      }
    } catch (error) {
      console.error("Load error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = (newItem: MediaItem) => {
    setItems((prev) => [newItem, ...prev])
    setTotalCount((prev) => prev + 1)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const response = await fetch(`/api/media-manager/delete/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id))
        setTotalCount((prev) => prev - 1)
      } else {
        alert("Failed to delete item")
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Error deleting item")
    }
  }

  useEffect(() => {
    loadItems()
  }, [searchTerm, categoryFilter, entityTypeFilter])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Media Manager</h1>
        <Badge variant="outline">{totalCount} items</Badge>
      </div>

      {/* Upload Section */}
      <NewImageUpload onUploadComplete={handleUploadComplete} />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input placeholder="Search files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="college-logo">College Logo</SelectItem>
                  <SelectItem value="high-school-logo">High School Logo</SelectItem>
                  <SelectItem value="club-logo">Club Logo</SelectItem>
                  <SelectItem value="athlete-photo">Athlete Photo</SelectItem>
                  <SelectItem value="division-logo">Division Logo</SelectItem>
                  <SelectItem value="hero-image">Hero Image</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type</label>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="high-school">High School</SelectItem>
                  <SelectItem value="club">Club</SelectItem>
                  <SelectItem value="athlete">Athlete</SelectItem>
                  <SelectItem value="division">Division</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Media Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No media items found. Upload some files to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    {item.mime_type.startsWith("image/") ? (
                      <img
                        src={item.url || "/placeholder.svg"}
                        alt={item.alt_text || item.original_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=200&width=300&text=Error"
                        }}
                      />
                    ) : (
                      <div className="text-4xl">📄</div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-medium truncate" title={item.original_name}>
                        {item.original_name}
                      </h3>

                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        {item.entity_type && (
                          <Badge variant="secondary" className="text-xs">
                            {item.entity_type}
                          </Badge>
                        )}
                        <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          {Math.round(item.size_bytes / 1024)} KB • {item.mime_type}
                        </div>
                        <div>{new Date(item.created_at).toLocaleDateString()}</div>
                        {item.entity_id && <div>ID: {item.entity_id}</div>}
                      </div>

                      {item.caption && <p className="text-xs text-muted-foreground italic">{item.caption}</p>}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(item.url, "_blank")}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
