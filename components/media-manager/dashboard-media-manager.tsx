"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  Search,
  RefreshCw,
  Grid,
  List,
  ExternalLink,
  Copy,
  Edit,
  Trash2,
  Plus,
  Files,
  HardDrive,
  ImageIcon,
  AlertTriangle,
  Check,
  Database,
  AlertCircle,
} from "lucide-react"
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

interface MediaStats {
  totalFiles: number
  totalSize: number
  logoCount: number
  imageCount: number
  missingLogos: number
}

export function DashboardMediaManager() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [stats, setStats] = useState<MediaStats>({
    totalFiles: 0,
    totalSize: 0,
    logoCount: 0,
    imageCount: 0,
    missingLogos: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSubcategory, setSelectedSubcategory] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupMessage, setSetupMessage] = useState("")
  const [settingUpDatabase, setSettingUpDatabase] = useState(false)

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState("general")
  const [uploadAlt, setUploadAlt] = useState("")
  const [uploadCaption, setUploadCaption] = useState("")
  const [uploadTags, setUploadTags] = useState("")
  const [uploading, setUploading] = useState(false)

  const { toast } = useToast()

  const loadItems = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (selectedCategory !== "all") params.append("category", selectedCategory)
      if (searchTerm) params.append("search", searchTerm)

      const response = await fetch(`/api/media-manager/search?${params}`)
      const result = await response.json()

      if (result.success) {
        setItems(result.data || [])
        calculateStats(result.data || [])
        setNeedsSetup(result.needsSetup || false)
        setSetupMessage(result.message || "")
      } else {
        setItems([])
        setNeedsSetup(true)
        setSetupMessage(result.error || "Database setup required")
      }
    } catch (error) {
      console.error("Error loading media items:", error)
      setItems([])
      setNeedsSetup(true)
      setSetupMessage("Failed to connect to database")
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (mediaItems: MediaItem[]) => {
    const totalFiles = mediaItems.length
    const totalSize = mediaItems.reduce((sum, item) => sum + item.size, 0)
    const logoCount = mediaItems.filter((item) => item.category.includes("logo") || item.tags.includes("logo")).length
    const imageCount = mediaItems.filter((item) => item.mimeType.startsWith("image/")).length
    const missingLogos = 3 // This would be calculated based on your business logic

    setStats({
      totalFiles,
      totalSize,
      logoCount,
      imageCount,
      missingLogos,
    })
  }

  useEffect(() => {
    loadItems()
  }, [selectedCategory, searchTerm])

  const handleSetupDatabase = async () => {
    setSettingUpDatabase(true)
    try {
      const result = await clientMediaService.setupDatabase()
      if (result.success) {
        toast({
          title: "Success!",
          description: "Database table created successfully",
        })
        setNeedsSetup(false)
        setSetupMessage("")
        loadItems() // Reload to show the new empty state
      } else {
        toast({
          title: "Setup Failed",
          description: result.error || "Failed to create database table",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "Failed to setup database",
        variant: "destructive",
      })
    } finally {
      setSettingUpDatabase(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const result = await clientMediaService.uploadMedia(uploadFile, {
        category: uploadCategory,
        alt: uploadAlt || uploadFile.name,
        caption: uploadCaption || undefined,
        tags: uploadTags ? uploadTags.split(",").map((t) => t.trim()) : undefined,
      })

      if (result.success) {
        toast({
          title: "Upload Successful!",
          description: result.message || `File uploaded: ${uploadFile.name}`,
        })

        // Reset form
        setUploadFile(null)
        setUploadAlt("")
        setUploadCaption("")
        setUploadTags("")
        setUploadDialogOpen(false)

        // Reload items
        loadItems()
      }
    } catch (error) {
      console.error("Upload failed:", error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
      toast({
        title: "Copied!",
        description: "URL copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Are you sure you want to delete "${item.originalName}"?`)) {
      return
    }

    try {
      const success = await clientMediaService.deleteMedia(item.id)
      if (success) {
        setItems(items.filter((i) => i.id !== item.id))
        toast({
          title: "Deleted",
          description: "Media item deleted successfully",
        })
        loadItems() // Refresh to update stats
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete media item",
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      logo: "bg-purple-100 text-purple-800",
      club: "bg-blue-100 text-blue-800",
      college: "bg-green-100 text-green-800",
      high_school: "bg-orange-100 text-orange-800",
      "athlete-profile": "bg-pink-100 text-pink-800",
      general: "bg-gray-100 text-gray-800",
    }
    return colors[category] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Files className="h-6 w-6 text-white" />
            </div>
            Media Manager
          </h1>
          <p className="text-gray-600 mt-1">Manage logos, images, and media files</p>
        </div>
        <div className="flex gap-3">
          {needsSetup && (
            <Button
              variant="outline"
              onClick={handleSetupDatabase}
              disabled={settingUpDatabase}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 bg-transparent"
            >
              <Database className={`h-4 w-4 mr-2 ${settingUpDatabase ? "animate-spin" : ""}`} />
              Setup Database
            </Button>
          )}
          <Button variant="outline" onClick={loadItems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload New File</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {needsSetup && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Database not set up. Files will be uploaded to blob storage but not tracked in database.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setUploadFile(file)
                        if (!uploadAlt) {
                          setUploadAlt(file.name.replace(/\.[^/.]+$/, ""))
                        }
                      }
                    }}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="college-logo">College Logo</SelectItem>
                      <SelectItem value="highschool-logo">High School Logo</SelectItem>
                      <SelectItem value="club-logo">Club Logo</SelectItem>
                      <SelectItem value="athlete-profile">Athlete Profile</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alt">Alt Text</Label>
                  <Input
                    id="alt"
                    value={uploadAlt}
                    onChange={(e) => setUploadAlt(e.target.value)}
                    placeholder="Describe the image"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="logo, college, wrestling"
                  />
                </div>

                <Button onClick={handleUpload} disabled={!uploadFile || uploading} className="w-full">
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Setup Alert */}
      {needsSetup && setupMessage && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            {setupMessage}{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 underline"
              onClick={handleSetupDatabase}
              disabled={settingUpDatabase}
            >
              {settingUpDatabase ? "Setting up..." : "Setup now"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Files className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Files</p>
                <p className="text-2xl font-bold">{stats.totalFiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Storage Used</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 bg-purple-600 rounded"></div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Logos</p>
                <p className="text-2xl font-bold">{stats.logoCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Images</p>
                <p className="text-2xl font-bold">{stats.imageCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Missing Logos</p>
                <p className="text-2xl font-bold">{stats.missingLogos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="college-logo">College Logo</SelectItem>
            <SelectItem value="highschool-logo">High School Logo</SelectItem>
            <SelectItem value="club-logo">Club Logo</SelectItem>
            <SelectItem value="athlete-profile">Athlete Profile</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Subcategories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subcategories</SelectItem>
            <SelectItem value="logo">Logo</SelectItem>
            <SelectItem value="college">College</SelectItem>
            <SelectItem value="high_school">High School</SelectItem>
            <SelectItem value="club">Club</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="flex gap-1">
                  <div className="h-5 bg-gray-200 rounded w-12"></div>
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Files className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No media files found</h3>
          <p className="text-gray-500 mb-4">
            {needsSetup
              ? "Set up the database and upload your first file to get started"
              : "Upload your first file to get started"}
          </p>
          <div className="flex gap-3 justify-center">
            {needsSetup && (
              <Button variant="outline" onClick={handleSetupDatabase} disabled={settingUpDatabase}>
                <Database className="h-4 w-4 mr-2" />
                Setup Database
              </Button>
            )}
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="group hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                {/* Image Preview */}
                <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3 relative">
                  {item.mimeType.startsWith("image/") ? (
                    <img
                      src={item.url || "/placeholder.svg"}
                      alt={item.alt || item.originalName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Files className="h-12 w-12" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm truncate" title={item.originalName}>
                    {item.originalName}
                  </h3>
                  <p className="text-xs text-gray-500">{formatFileSize(item.size)}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className={`text-xs ${getCategoryColor("logo")}`}>
                      logo
                    </Badge>
                    {item.category.includes("college") && (
                      <Badge variant="secondary" className={`text-xs ${getCategoryColor("college")}`}>
                        college
                      </Badge>
                    )}
                    {item.category.includes("club") && (
                      <Badge variant="secondary" className={`text-xs ${getCategoryColor("club")}`}>
                        club
                      </Badge>
                    )}
                    {item.category.includes("high") && (
                      <Badge variant="secondary" className={`text-xs ${getCategoryColor("high_school")}`}>
                        high_school
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" onClick={() => window.open(item.url, "_blank")}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleCopyUrl(item.url)}>
                      {copiedUrl === item.url ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
