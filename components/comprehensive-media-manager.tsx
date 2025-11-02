"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Upload,
  RefreshCw,
  Trash2,
  BarChart3,
  FileImage,
  FolderOpen,
  AlertTriangle,
  Check,
  Copy,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  School,
  GraduationCap,
  Users,
  Trophy,
  Building,
  ImageIcon,
  Edit,
  Save,
  X,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { uploadImage, type ImageCategory } from "@/lib/blob-storage"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface BlobFile {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

interface MediaAnalytics {
  totalFiles: number
  totalSize: number
  categories: Record<string, { count: number; size: number }>
  duplicates: Array<{
    filename: string
    urls: string[]
    count: number
  }>
}

interface EditingFile {
  url: string
  pathname: string
  currentCategory: ImageCategory
  newCategory: ImageCategory
  newName: string
  collegeName: string
  division: string
  entityName: string
  altText: string
  caption: string
}

interface ComprehensiveMediaManagerProps {
  onImageSelect?: (url: string) => void
  defaultCategory?: ImageCategory | "all"
  title?: string
  description?: string
}

// Extended category types for comprehensive media management
type ExtendedCategory = ImageCategory | "division-logos" | "banners" | "announcements" | "general"

const CATEGORY_CONFIG = {
  athlete: {
    label: "Athlete Photos",
    icon: Users,
    description: "Headshots, action shots, and commitment photos",
    color: "bg-blue-100 text-blue-800",
  },
  highschool: {
    label: "High School Logos",
    icon: School,
    description: "High school logos and branding",
    color: "bg-green-100 text-green-800",
  },
  college: {
    label: "College Logos",
    icon: GraduationCap,
    description: "University and college logos",
    color: "bg-purple-100 text-purple-800",
  },
  club: {
    label: "Wrestling Club Logos",
    icon: Trophy,
    description: "Wrestling club and organization logos",
    color: "bg-orange-100 text-orange-800",
  },
  "division-logos": {
    label: "Division Logos",
    icon: Building,
    description: "NCAA, NAIA, NJCAA division logos",
    color: "bg-red-100 text-red-800",
  },
  banners: {
    label: "Banners & Graphics",
    icon: ImageIcon,
    description: "Website banners and promotional graphics",
    color: "bg-yellow-100 text-yellow-800",
  },
  announcements: {
    label: "Announcements",
    icon: FileImage,
    description: "News and announcement images",
    color: "bg-indigo-100 text-indigo-800",
  },
  general: {
    label: "General Media",
    icon: FolderOpen,
    description: "Miscellaneous files and media",
    color: "bg-gray-100 text-gray-800",
  },
}

const DIVISION_OPTIONS = [
  { value: "Division I", label: "Division I" },
  { value: "Division II", label: "Division II" },
  { value: "Division III", label: "Division III" },
  { value: "NAIA", label: "NAIA" },
  { value: "NJCAA", label: "NJCAA" },
]

export default function ComprehensiveMediaManager({
  onImageSelect,
  defaultCategory = "all",
  title = "Media Manager Pro",
  description = "Comprehensive media management for the NC Wrestling Portal",
}: ComprehensiveMediaManagerProps) {
  const [analytics, setAnalytics] = useState<MediaAnalytics | null>(null)
  const [allFiles, setAllFiles] = useState<BlobFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<BlobFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<ExtendedCategory | "all">(defaultCategory)
  const [photoName, setPhotoName] = useState("")
  const [photoDescription, setPhotoDescription] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingFile, setEditingFile] = useState<EditingFile | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [savingEdit, setSavingEdit] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    console.log("Loading comprehensive media data...")
    setLoading(true)

    try {
      // Load analytics first
      const analyticsResponse = await fetch("/api/media-analytics")
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        console.log("Analytics loaded:", analyticsData)
        setAnalytics(analyticsData)
      }

      // Load files from all categories
      const categories = Object.keys(CATEGORY_CONFIG) as ExtendedCategory[]
      const allBlobFiles: BlobFile[] = []

      // Load from each specific category
      for (const category of categories) {
        try {
          console.log(`Loading ${category} files...`)

          const response = await fetch(`/api/blob/list?prefix=${category}/`)

          if (response.ok) {
            const categoryData = await response.json()
            console.log(`${category} response:`, categoryData)

            if (categoryData && categoryData.blobs && Array.isArray(categoryData.blobs)) {
              const categoryFiles = categoryData.blobs.map((blob: any) => ({
                url: blob.url,
                pathname: blob.pathname || `${category}/${blob.url.split("/").pop()}`,
                size: blob.size || 0,
                uploadedAt: blob.uploadedAt || new Date().toISOString(),
              }))
              allBlobFiles.push(...categoryFiles)
              console.log(`Loaded ${categoryFiles.length} files from ${category}`)
            }
          } else {
            console.error(`Failed to load ${category} files:`, response.status)
          }
        } catch (error) {
          console.error(`Error loading ${category} files:`, error)
        }
      }

      // Also load all files without prefix to catch any uncategorized files
      try {
        console.log("Loading all blob files...")
        const response = await fetch("/api/blob/list")

        if (response.ok) {
          const allData = await response.json()
          console.log("All blobs response:", allData)

          if (allData && allData.blobs && Array.isArray(allData.blobs)) {
            // Filter out files we already have and add new ones
            const newFiles = allData.blobs
              .filter((blob: any) => !allBlobFiles.some((existing) => existing.url === blob.url))
              .map((blob: any) => ({
                url: blob.url,
                pathname: blob.pathname || blob.url.split("/").pop() || "unknown",
                size: blob.size || 0,
                uploadedAt: blob.uploadedAt || new Date().toISOString(),
              }))

            allBlobFiles.push(...newFiles)
            console.log(`Added ${newFiles.length} additional files from general storage`)
          }
        }
      } catch (error) {
        console.error("Error loading all blob files:", error)
      }

      console.log(`Total files loaded: ${allBlobFiles.length}`)
      setAllFiles(allBlobFiles)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load media data. Please try refreshing.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter files based on category and search
  useEffect(() => {
    let filtered = allFiles

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((file) => {
        const path = file.pathname.toLowerCase()
        return path.includes(selectedCategory)
      })
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((file) => file.pathname.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    setFilteredFiles(filtered)
  }, [allFiles, selectedCategory, searchTerm])

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadResult({ success: false, message: "Please select a file" })
      return
    }

    if (selectedCategory === "all") {
      setUploadResult({ success: false, message: "Please select a category" })
      return
    }

    if (!photoName.trim()) {
      setUploadResult({ success: false, message: "Please enter a name for the file" })
      return
    }

    console.log("Starting upload for:", selectedFile.name)
    setUploading(true)
    setUploadResult(null)

    try {
      // For now, use the existing uploadImage function for basic categories
      // In the future, we could extend this for new categories
      const basicCategories: ImageCategory[] = ["athlete", "highschool", "college", "club"]

      if (basicCategories.includes(selectedCategory as ImageCategory)) {
        const url = await uploadImage(selectedFile, selectedCategory as ImageCategory, photoName.trim())
        setUploadResult({ success: true, message: `Upload successful! "${photoName}" has been saved.` })
      } else {
        // For extended categories, use the simple media upload API
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("category", selectedCategory)
        formData.append("altText", photoName)
        formData.append("caption", photoDescription)

        const response = await fetch("/api/simple-media-upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        setUploadResult({ success: true, message: `Upload successful! "${photoName}" has been saved.` })
      }

      // Reset form
      setSelectedFile(null)
      setPhotoName("")
      setPhotoDescription("")

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ""

      // Reload data after successful upload
      setTimeout(() => {
        loadData()
        setShowUploadDialog(false)
        setUploadResult(null)
      }, 2000)
    } catch (error) {
      console.error("Upload error:", error)
      setUploadResult({
        success: false,
        message: "Upload failed: " + (error instanceof Error ? error.message : "Unknown error"),
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (url: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    if (!url) {
      console.error("No URL provided for deletion")
      toast({
        title: "Error",
        description: "No URL provided for deletion",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Are you sure you want to delete this file?\n\n${url}`)) {
      return
    }

    console.log("Deleting URL:", url)
    setDeleting(url)

    try {
      const response = await fetch("/api/media-manager/delete-by-url", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      await loadData()
      toast({
        title: "Deleted",
        description: "File deleted successfully",
      })
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
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

  const handleSelectImage = (url: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    if (onImageSelect) {
      onImageSelect(url)
      toast({
        title: "Media Selected",
        description: "Media has been selected successfully",
      })
    }
  }

  const handleStartEdit = (file: BlobFile, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    const category = getCategory(file.pathname)
    const fileName = getFileName(file.pathname)

    // Try to extract college name from filename
    let collegeName = ""
    if (fileName.toLowerCase().includes("roanoke")) {
      collegeName = "Roanoke College"
    } else if (fileName.toLowerCase().includes("unc")) {
      collegeName = "UNC Chapel Hill"
    } else if (fileName.toLowerCase().includes("duke")) {
      collegeName = "Duke"
    }

    setEditingFile({
      url: file.url,
      pathname: file.pathname,
      currentCategory: category as ImageCategory,
      newCategory: category as ImageCategory,
      newName: fileName,
      collegeName: collegeName,
      division: "",
      entityName: collegeName,
      altText: "",
      caption: "",
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!editingFile) return

    setSavingEdit(true)

    try {
      console.log("Saving edit:", editingFile)

      const response = await fetch("/api/media-manager/update-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: editingFile.url,
          collegeName: editingFile.collegeName,
          division: editingFile.division,
          entityName: editingFile.entityName,
          altText: editingFile.altText,
          caption: editingFile.caption,
          category: editingFile.newCategory,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save changes")
      }

      console.log("Save result:", result)

      toast({
        title: "Success!",
        description: result.message || "Media metadata updated successfully",
      })

      setShowEditDialog(false)
      setEditingFile(null)
    } catch (error) {
      console.error("Edit error:", error)
      toast({
        title: "Error",
        description: `Failed to update media metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setSavingEdit(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileName = (pathname: string) => {
    return pathname.split("/").pop() || pathname
  }

  const getCategory = (pathname: string): ExtendedCategory => {
    const path = pathname.toLowerCase()

    // Check for explicit category folders
    for (const [category] of Object.entries(CATEGORY_CONFIG)) {
      if (path.includes(`/${category}/`) || path.startsWith(`${category}/`)) {
        return category as ExtendedCategory
      }
    }

    // Fallback to keyword matching
    if (path.includes("athlete")) return "athlete"
    if (path.includes("highschool") || path.includes("high-school")) return "highschool"
    if (path.includes("college") || path.includes("university")) return "college"
    if (path.includes("club") || path.includes("wrestling")) return "club"
    if (path.includes("division")) return "division-logos"
    if (path.includes("banner")) return "banners"
    if (path.includes("announcement")) return "announcements"

    return "general"
  }

  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category as ExtendedCategory] || CATEGORY_CONFIG.general
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin text-nc-gold mx-auto mb-4" />
              <span className="text-white text-lg">Loading media data...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
              <p className="text-gray-300 text-lg">{description}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={loadData}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-nc-gold text-nc-blue hover:bg-nc-gold/90 font-semibold">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Media
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-nc-blue">Upload New Media</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">File Name *</Label>
                      <Input
                        placeholder="e.g., John Smith Headshot, UNC Logo, etc."
                        value={photoName}
                        onChange={(e) => {
                          setPhotoName(e.target.value)
                          setUploadResult(null)
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Category *</Label>
                      <Select
                        value={selectedCategory === "all" ? "athlete" : selectedCategory}
                        onValueChange={(value) => setSelectedCategory(value as ExtendedCategory)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                            const IconComponent = config.icon
                            return (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  {config.label}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Select File *</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          setSelectedFile(file || null)
                          setUploadResult(null)

                          if (file && !photoName) {
                            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
                            setPhotoName(nameWithoutExt)
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Description (Optional)</Label>
                      <Textarea
                        placeholder="Add any additional details..."
                        value={photoDescription}
                        onChange={(e) => setPhotoDescription(e.target.value)}
                        className="w-full h-20 resize-none"
                      />
                    </div>

                    {uploadResult && (
                      <Alert variant={uploadResult.success ? "default" : "destructive"}>
                        <AlertDescription>
                          {uploadResult.success ? (
                            <Check className="h-4 w-4 inline mr-2 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 inline mr-2" />
                          )}
                          {uploadResult.message}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading || selectedCategory === "all" || !photoName.trim()}
                      className="w-full bg-nc-blue hover:bg-nc-blue/90 text-white"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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

          <Tabs defaultValue={onImageSelect ? "gallery" : "overview"} className="space-y-4">
            <TabsList className="bg-white/10 border-white/20">
              {!onImageSelect && (
                <TabsTrigger
                  value="overview"
                  className="text-white data-[state=active]:bg-nc-gold data-[state=active]:text-nc-blue"
                >
                  Overview
                </TabsTrigger>
              )}
              <TabsTrigger
                value="gallery"
                className="text-white data-[state=active]:bg-nc-gold data-[state=active]:text-nc-blue"
              >
                Gallery
              </TabsTrigger>
              {!onImageSelect && (
                <>
                  <TabsTrigger
                    value="usage"
                    className="text-white data-[state=active]:bg-nc-gold data-[state=active]:text-nc-blue"
                  >
                    Usage
                  </TabsTrigger>
                  <TabsTrigger
                    value="categories"
                    className="text-white data-[state=active]:bg-nc-gold data-[state=active]:text-nc-blue"
                  >
                    Categories
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {!onImageSelect && (
              <TabsContent value="overview" className="space-y-6">
                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-nc-blue">Total Files</CardTitle>
                      <FileImage className="h-5 w-5 text-nc-gold" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-nc-blue">{allFiles.length}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-nc-blue">Total Size</CardTitle>
                      <BarChart3 className="h-5 w-5 text-nc-gold" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-nc-blue">
                        {formatFileSize(allFiles.reduce((sum, file) => sum + file.size, 0))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-nc-blue">Categories</CardTitle>
                      <FolderOpen className="h-5 w-5 text-nc-gold" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-nc-blue">{Object.keys(CATEGORY_CONFIG).length}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-nc-blue">Athletes</CardTitle>
                      <Users className="h-5 w-5 text-nc-gold" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-nc-blue">
                        {allFiles.filter((f) => getCategory(f.pathname) === "athlete").length}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            <TabsContent value="gallery" className="space-y-4">
              <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-nc-blue">
                    <Search className="h-5 w-5" />
                    {onImageSelect ? "Select Media" : "Media Gallery"}
                    <Badge variant="outline" className="ml-auto">
                      {filteredFiles.length} items
                    </Badge>
                  </CardTitle>
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
                      <Select
                        value={selectedCategory}
                        onValueChange={(value) => setSelectedCategory(value as ExtendedCategory | "all")}
                      >
                        <SelectTrigger className="w-48">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                            const IconComponent = config.icon
                            return (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  {config.label}
                                </div>
                              </SelectItem>
                            )
                          })}
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
                  {filteredFiles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No media items found</p>
                      <p className="text-sm mt-2">
                        {allFiles.length === 0
                          ? "Upload some files to get started"
                          : "Try adjusting your search filters"}
                      </p>
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredFiles.map((file, index) => {
                        const category = getCategory(file.pathname)
                        const categoryConfig = getCategoryConfig(category)
                        const IconComponent = categoryConfig.icon

                        return (
                          <Card
                            key={`${file.url}-${index}`}
                            className="group hover:shadow-lg transition-all duration-200 bg-white border-gray-200 hover:border-nc-blue/30 cursor-pointer"
                            onClick={() => onImageSelect && handleSelectImage(file.url)}
                          >
                            <CardContent className="p-3">
                              <div className="aspect-square relative mb-3 bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={file.url || "/placeholder.svg"}
                                  alt={getFileName(file.pathname)}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = "/placeholder.svg?height=200&width=200&text=Image"
                                  }}
                                />

                                {/* Action buttons */}
                                <div className="absolute top-2 right-2">
                                  {onImageSelect ? (
                                    <Button
                                      size="sm"
                                      className="h-8 w-8 p-0 bg-nc-gold text-nc-blue hover:bg-nc-gold/90 shadow-sm"
                                      onClick={(e) => handleSelectImage(file.url, e)}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  ) : (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm border border-gray-300"
                                        >
                                          <MoreVertical className="h-4 w-4 text-gray-700" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuItem
                                          onClick={(e) => handleStartEdit(file, e)}
                                          className="cursor-pointer"
                                        >
                                          <Edit className="h-4 w-4 mr-2 text-blue-600" />
                                          <span className="text-blue-600">Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => handleCopyUrl(file.url, e)}>
                                          <Copy className="h-4 w-4 mr-2 text-gray-600" />
                                          <span className="text-gray-600">
                                            {copiedUrl === file.url ? "Copied!" : "Copy URL"}
                                          </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={(e) => handleDelete(file.url, e)}
                                          className="text-red-600 cursor-pointer"
                                          disabled={deleting === file.url}
                                        >
                                          {deleting === file.url ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4 mr-2" />
                                          )}
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>

                                {/* Category badge */}
                                <div className="absolute bottom-2 left-2">
                                  <Badge variant="secondary" className={`text-xs ${categoryConfig.color}`}>
                                    <IconComponent className="h-3 w-3 mr-1" />
                                    {categoryConfig.label}
                                  </Badge>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <h3
                                  className="font-medium text-sm truncate text-nc-blue"
                                  title={getFileName(file.pathname)}
                                >
                                  {getFileName(file.pathname)}
                                </h3>

                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>{formatFileSize(file.size)}</span>
                                  <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                </div>

                                {onImageSelect && (
                                  <Button
                                    size="sm"
                                    className="w-full bg-nc-gold text-nc-blue hover:bg-nc-gold/90"
                                    onClick={(e) => handleSelectImage(file.url, e)}
                                  >
                                    Select This File
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredFiles.map((file, index) => {
                        const category = getCategory(file.pathname)
                        const categoryConfig = getCategoryConfig(category)
                        const IconComponent = categoryConfig.icon

                        return (
                          <div
                            key={`${file.url}-${index}`}
                            className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                              onImageSelect ? "hover:bg-nc-blue/5 cursor-pointer" : "hover:bg-gray-50"
                            }`}
                            onClick={() => onImageSelect && handleSelectImage(file.url)}
                          >
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={file.url || "/placeholder.svg"}
                                alt={getFileName(file.pathname)}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder.svg?height=64&width=64&text=Image"
                                }}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate text-nc-blue">
                                {getFileName(file.pathname)}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className={`text-xs ${categoryConfig.color}`}>
                                  <IconComponent className="h-3 w-3 mr-1" />
                                  {categoryConfig.label}
                                </Badge>
                                <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(file.uploadedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {onImageSelect ? (
                                <Button
                                  size="sm"
                                  className="bg-nc-gold text-nc-blue hover:bg-nc-gold/90"
                                  onClick={(e) => handleSelectImage(file.url, e)}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Select
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => handleStartEdit(file, e)}
                                    title="Edit"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => handleCopyUrl(file.url, e)}
                                    title="Copy URL"
                                  >
                                    {copiedUrl === file.url ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => handleDelete(file.url, e)}
                                    disabled={deleting === file.url}
                                    title="Delete"
                                  >
                                    {deleting === file.url ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {!onImageSelect && (
              <>
                <TabsContent value="usage" className="space-y-4">
                  <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-nc-blue">Storage Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-nc-blue mb-2">
                            {formatFileSize(allFiles.reduce((sum, file) => sum + file.size, 0))}
                          </div>
                          <p className="text-gray-600">Total storage used</p>
                        </div>
                        <div className="text-sm text-gray-500 text-center">
                          Files are stored securely in Vercel Blob storage with automatic CDN distribution
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                      const IconComponent = config.icon
                      const categoryFiles = allFiles.filter((file) => getCategory(file.pathname) === key)
                      const totalSize = categoryFiles.reduce((sum, file) => sum + file.size, 0)

                      return (
                        <Card key={key} className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-nc-blue">
                              <IconComponent className="h-5 w-5 text-nc-gold" />
                              {config.label}
                            </CardTitle>
                            <p className="text-sm text-gray-600">{config.description}</p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Files:</span>
                                <Badge className={config.color}>{categoryFiles.length}</Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Size:</span>
                                <span className="text-sm font-bold text-nc-blue">{formatFileSize(totalSize)}</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-3 bg-transparent"
                                onClick={() => setSelectedCategory(key as ExtendedCategory)}
                              >
                                View {config.label}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>

          {/* Edit Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-nc-blue">Edit Media Metadata</DialogTitle>
              </DialogHeader>

              {editingFile && (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Preview */}
                  <div className="flex justify-center mb-4">
                    <img
                      src={editingFile.url || "/placeholder.svg"}
                      alt={editingFile.newName}
                      className="max-w-full max-h-48 object-contain rounded-lg border"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={editingFile.newCategory}
                        onValueChange={(value) =>
                          setEditingFile({ ...editingFile, newCategory: value as ImageCategory })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                            const IconComponent = config.icon
                            return (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  {config.label}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="division">Division</Label>
                      <Select
                        value={editingFile.division || undefined}
                        onValueChange={(value) => setEditingFile({ ...editingFile, division: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Division" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIVISION_OPTIONS.map((div) => (
                            <SelectItem key={div.value} value={div.value}>
                              {div.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="collegeName">College Name</Label>
                    <Input
                      id="collegeName"
                      value={editingFile.collegeName}
                      onChange={(e) => setEditingFile({ ...editingFile, collegeName: e.target.value })}
                      placeholder="Enter college name (e.g., Roanoke College)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="entityName">Entity Name</Label>
                    <Input
                      id="entityName"
                      value={editingFile.entityName}
                      onChange={(e) => setEditingFile({ ...editingFile, entityName: e.target.value })}
                      placeholder="Enter entity name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="altText">Alt Text</Label>
                    <Input
                      id="altText"
                      value={editingFile.altText}
                      onChange={(e) => setEditingFile({ ...editingFile, altText: e.target.value })}
                      placeholder="Describe the image for accessibility"
                    />
                  </div>

                  <div>
                    <Label htmlFor="caption">Caption</Label>
                    <Textarea
                      id="caption"
                      value={editingFile.caption}
                      onChange={(e) => setEditingFile({ ...editingFile, caption: e.target.value })}
                      placeholder="Optional caption or description"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="flex-1 bg-nc-blue hover:bg-nc-blue/90"
                    >
                      {savingEdit ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowEditDialog(false)}
                      variant="outline"
                      className="flex-1"
                      disabled={savingEdit}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
