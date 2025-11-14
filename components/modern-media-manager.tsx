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
  Edit,
  Plus,
  Pencil,
  ImageIcon,
  Zap,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface BlobFile {
  url: string
  pathname: string
  size: number
  uploadedAt: string
  displayName?: string
  category?: string
}

interface MediaItem {
  id: string
  url: string
  original_name: string
  category: string
  file_size?: number
  mime_type: string
  created_at: string
  updated_at: string
}

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
  updated_at: string
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
  currentCategory: string
  newCategory: string
  newName: string
  newDescription: string
}

interface EditingLogo {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
}

interface ModernMediaManagerProps {
  onImageSelect?: (url: string) => void
}

interface DuplicateGroup {
  entity_name: string
  entity_type: string
  count: number
  mappings: LogoMapping[]
}

export default function ModernMediaManager({ onImageSelect }: ModernMediaManagerProps) {
  const [analytics, setAnalytics] = useState<MediaAnalytics | null>(null)
  const [allFiles, setAllFiles] = useState<BlobFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<BlobFile[]>([])
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [logos, setLogos] = useState<LogoMapping[]>([])
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [photoName, setPhotoName] = useState("")
  const [photoDescription, setPhotoDescription] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showLogoDialog, setShowLogoDialog] = useState(false)
  const [showLogoUploadDialog, setShowLogoUploadDialog] = useState(false)
  const [showDeduplicateDialog, setShowDeduplicateDialog] = useState(false)
  const [editingFile, setEditingFile] = useState<EditingFile | null>(null)
  const [editingLogo, setEditingLogo] = useState<EditingLogo | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [saving, setSaving] = useState(false)
  const [deduplicating, setDeduplicating] = useState(false)

  // Logo form state
  const [logoName, setLogoName] = useState("")
  const [logoType, setLogoType] = useState("college")
  const [logoUrl, setLogoUrl] = useState("")

  // Logo upload state
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null)
  const [logoUploadName, setLogoUploadName] = useState("")
  const [logoUploadType, setLogoUploadType] = useState("college")

  const { toast } = useToast()

  const loadData = async () => {
    console.log("Loading media data...")
    setLoading(true)

    try {
      // Load analytics first
      const analyticsResponse = await fetch("/api/media-analytics")
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        console.log("Analytics loaded:", analyticsData)
        setAnalytics(analyticsData)
      }

      // Load media items from database first
      let loadedMediaItems: MediaItem[] = []
      const mediaItemsResponse = await fetch("/api/media-manager/items")
      if (mediaItemsResponse.ok) {
        const mediaData = await mediaItemsResponse.json()
        if (mediaData.success) {
          loadedMediaItems = mediaData.items || []
          setMediaItems(loadedMediaItems)
          console.log("Loaded media items:", loadedMediaItems.length)
        }
      }

      // Load logos
      const logosResponse = await fetch("/api/logo-mappings-simple")
      if (logosResponse.ok) {
        const logosData = await logosResponse.json()
        if (logosData.success) {
          const logoMappings = logosData.data || []
          setLogos(logoMappings)
          console.log("Loaded logos:", logoMappings.length)

          // Find duplicates
          findDuplicates(logoMappings)
        }
      }

      // Load all files from blob storage
      console.log("Loading all blob files...")
      const allBlobFiles: BlobFile[] = []

      try {
        const response = await fetch("/api/blob/list")
        console.log("Blob list response status:", response.status)

        if (response.ok) {
          const allData = await response.json()
          console.log("All blobs response:", allData)

          if (allData && allData.blobs && Array.isArray(allData.blobs)) {
            const processedFiles = allData.blobs.map((blob: any) => {
              console.log("Processing blob:", blob)

              // Try to find custom name from media items
              const mediaItem = loadedMediaItems.find((item) => item.url === blob.url)
              const displayName = mediaItem?.original_name || getFileName(blob.pathname || blob.url)
              const category = mediaItem?.category || getCategory(blob.pathname || blob.url)

              return {
                url: blob.url,
                pathname: blob.pathname || blob.url.split("/").pop() || "unknown",
                size: blob.size || 0,
                uploadedAt: blob.uploadedAt || new Date().toISOString(),
                displayName,
                category,
              }
            })

            allBlobFiles.push(...processedFiles)
            console.log(`Loaded ${processedFiles.length} files from blob storage`)
            console.log("Sample files with display names:", processedFiles.slice(0, 5))
          } else {
            console.log("No blobs found in response")
          }
        } else {
          console.error("Failed to load blob files:", response.status, await response.text())
        }
      } catch (error) {
        console.error("Error loading blob files:", error)
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

  const findDuplicates = (logoMappings: LogoMapping[]) => {
    const groups: Record<string, LogoMapping[]> = {}

    logoMappings.forEach((logo) => {
      const key = `${logo.entity_name.toLowerCase()}-${logo.entity_type.toLowerCase()}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(logo)
    })

    const duplicates: DuplicateGroup[] = Object.entries(groups)
      .filter(([_, mappings]) => mappings.length > 1)
      .map(([_, mappings]) => ({
        entity_name: mappings[0].entity_name,
        entity_type: mappings[0].entity_type,
        count: mappings.length,
        mappings: mappings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }))

    setDuplicateGroups(duplicates)
    console.log("Found duplicate groups:", duplicates.length)
  }

  const handleDeduplicate = async () => {
    if (duplicateGroups.length === 0) {
      toast({
        title: "No Duplicates",
        description: "No duplicate logo mappings found to remove.",
      })
      return
    }

    if (
      !confirm(
        `This will remove ${duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0)} duplicate logo mappings. Continue?`,
      )
    ) {
      return
    }

    setDeduplicating(true)

    try {
      let removedCount = 0

      for (const group of duplicateGroups) {
        // Keep the first (oldest) mapping, remove the rest
        const toRemove = group.mappings.slice(1)

        for (const mapping of toRemove) {
          const response = await fetch("/api/logo-mappings-simple", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: mapping.id }),
          })

          if (response.ok) {
            removedCount++
          } else {
            console.error("Failed to remove duplicate:", mapping.id)
          }
        }
      }

      toast({
        title: "Success!",
        description: `Removed ${removedCount} duplicate logo mappings.`,
      })

      // Reload data
      await loadData()
      setShowDeduplicateDialog(false)
    } catch (error) {
      console.error("Deduplication error:", error)
      toast({
        title: "Error",
        description: "Failed to remove duplicates. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeduplicating(false)
    }
  }

  // Filter files based on category and search
  useEffect(() => {
    let filtered = allFiles

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((file) => {
        const path = file.pathname.toLowerCase()
        const category = file.category?.toLowerCase() || ""
        return path.includes(selectedCategory) || category.includes(selectedCategory)
      })
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((file) => {
        const displayName = file.displayName?.toLowerCase() || ""
        const pathname = file.pathname.toLowerCase()
        const searchLower = searchTerm.toLowerCase()
        return displayName.includes(searchLower) || pathname.includes(searchLower)
      })
    }

    console.log(`Filtered files: ${filtered.length} out of ${allFiles.length}`)
    setFilteredFiles(filtered)
  }, [allFiles, selectedCategory, searchTerm])

  const handleUpload = async () => {
    console.log("=== UPLOAD BUTTON CLICKED ===")
    console.log("Selected file:", selectedFile?.name)
    console.log("Selected category:", selectedCategory)
    console.log("Photo name:", photoName)

    if (!selectedFile) {
      setUploadResult({ success: false, message: "Please select a file" })
      return
    }

    if (selectedCategory === "all") {
      setUploadResult({ success: false, message: "Please select a category" })
      return
    }

    if (!photoName.trim()) {
      setUploadResult({ success: false, message: "Please enter a name for the photo" })
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      // Use the media manager upload endpoint
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("category", selectedCategory)
      formData.append("entityName", photoName.trim())
      formData.append("alt", photoDescription)

      const response = await fetch("/api/media-manager/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadResult({ success: true, message: `Upload successful! "${photoName}" has been saved.` })

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
      } else {
        setUploadResult({
          success: false,
          message: "Upload failed: " + (result.error || "Unknown error"),
        })
      }
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

  const handleLogoUpload = async () => {
    console.log("=== LOGO UPLOAD BUTTON CLICKED ===")
    console.log("Logo file:", logoUploadFile?.name)
    console.log("Logo name:", logoUploadName)
    console.log("Logo type:", logoUploadType)

    if (!logoUploadFile) {
      toast({
        title: "Error",
        description: "Please select a logo file",
        variant: "destructive",
      })
      return
    }

    if (!logoUploadName.trim()) {
      toast({
        title: "Error",
        description: "Please enter the entity name",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      // Upload the image using media manager
      const formData = new FormData()
      formData.append("file", logoUploadFile)
      formData.append("category", logoUploadType === "highschool" ? "highschool" : logoUploadType)
      formData.append("entityName", logoUploadName.trim())
      formData.append("entityType", logoUploadType)

      const uploadResponse = await fetch("/api/media-manager/upload", {
        method: "POST",
        body: formData,
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed")
      }

      // Then save the logo mapping
      const mappingResponse = await fetch("/api/logo-mappings-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_name: logoUploadName.trim(),
          entity_type: logoUploadType,
          logo_url: uploadResult.data.url,
        }),
      })

      const mappingResult = await mappingResponse.json()
      if (mappingResult.success) {
        toast({
          title: "Success!",
          description: `Logo uploaded and mapped for ${logoUploadName}`,
        })

        // Reset form
        setLogoUploadFile(null)
        setLogoUploadName("")
        setLogoUploadType("college")

        // Reset file input
        const fileInput = document.querySelector("#logo-upload-input") as HTMLInputElement
        if (fileInput) fileInput.value = ""

        // Reload data
        await loadData()
        setShowLogoUploadDialog(false)
      } else {
        toast({
          title: "Error",
          description: `Failed to save logo mapping: ${mappingResult.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Logo upload error:", error)
      toast({
        title: "Error",
        description: "Failed to upload logo: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (url: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    if (!url) {
      toast({
        title: "Error",
        description: "No URL provided for deletion",
        variant: "destructive",
      })
      return
    }

    const fileName = getFileName(url)
    if (!confirm(`Are you sure you want to delete this file?\n\n${fileName}\n\nThis action cannot be undone.`)) {
      return
    }

    console.log("Starting delete process for:", url)
    setDeleting(url)

    try {
      const response = await fetch("/api/media-manager/delete-by-url", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      console.log("Delete response status:", response.status)
      const result = await response.json()
      console.log("Delete response:", result)

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      // Remove from local state immediately for better UX
      setAllFiles((prevFiles) => prevFiles.filter((file) => file.url !== url))
      setFilteredFiles((prevFiles) => prevFiles.filter((file) => file.url !== url))

      toast({
        title: "Success!",
        description: `"${fileName}" has been deleted successfully`,
      })

      // Reload data to ensure consistency
      setTimeout(() => {
        loadData()
      }, 1000)
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete Failed",
        description: `Failed to delete "${fileName}": ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = (file: BlobFile) => {
    const currentCategory = file.category || getCategory(file.pathname)
    const fileName = file.displayName || getFileName(file.pathname)

    setEditingFile({
      url: file.url,
      pathname: file.pathname,
      currentCategory,
      newCategory: currentCategory,
      newName: fileName.replace(/\.[^/.]+$/, ""),
      newDescription: "",
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!editingFile) return

    setSaving(true)
    try {
      console.log("Saving edit:", editingFile)

      const response = await fetch("/api/media-manager/update-name", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: editingFile.url,
          newName: editingFile.newName,
          category: editingFile.newCategory,
          description: editingFile.newDescription,
        }),
      })

      const result = await response.json()
      console.log("Update response:", result)

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: `${result.action === "created" ? "Created" : "Updated"} "${editingFile.newName}" successfully`,
        })
        await loadData() // Refresh the data
        setShowEditDialog(false)
        setEditingFile(null)
      } else {
        toast({
          title: "Error",
          description: `Failed to update: ${result.error || "Unknown error"}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating media:", error)
      toast({
        title: "Error",
        description: "Failed to update media file",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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
        title: "Photo Selected",
        description: "Photo has been selected successfully",
      })
    }
  }

  const saveLogo = async () => {
    if (!logoName || !logoType || !logoUrl) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const method = editingLogo ? "PUT" : "POST"
      const body = editingLogo
        ? { id: editingLogo.id, entity_name: logoName, entity_type: logoType, logo_url: logoUrl }
        : { entity_name: logoName, entity_type: logoType, logo_url: logoUrl }

      const response = await fetch("/api/logo-mappings-simple", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Success",
          description: `${editingLogo ? "Updated" : "Added"} ${logoName}`,
        })
        await loadData()
        resetLogoForm()
        setShowLogoDialog(false)
        setEditingLogo(null)
      } else {
        toast({
          title: "Error",
          description: `Failed to save: ${result.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error saving logo",
        variant: "destructive",
      })
    }
    setSaving(false)
  }

  const deleteLogo = async (logo: LogoMapping) => {
    if (!confirm(`Delete logo for ${logo.entity_name}?`)) return

    setSaving(true)
    try {
      const response = await fetch("/api/logo-mappings-simple", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: logo.id }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Success",
          description: `Deleted ${logo.entity_name}`,
        })
        await loadData()
      } else {
        toast({
          title: "Error",
          description: `Failed to delete: ${result.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error deleting logo",
        variant: "destructive",
      })
    }
    setSaving(false)
  }

  const resetLogoForm = () => {
    setLogoName("")
    setLogoType("college")
    setLogoUrl("")
  }

  const startEditLogo = (logo: LogoMapping) => {
    setEditingLogo({
      id: logo.id,
      entity_name: logo.entity_name,
      entity_type: logo.entity_type,
      logo_url: logo.logo_url,
    })
    setLogoName(logo.entity_name)
    setLogoType(logo.entity_type)
    setLogoUrl(logo.logo_url)
    setShowLogoDialog(true)
  }

  const startAddLogo = () => {
    setEditingLogo(null)
    resetLogoForm()
    setShowLogoDialog(true)
  }

  const startUploadLogo = () => {
    setLogoUploadFile(null)
    setLogoUploadName("")
    setLogoUploadType("college")
    setShowLogoUploadDialog(true)
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

  const getCategory = (pathname: string): string => {
    const path = pathname.toLowerCase()

    if (path.includes("/athlete/") || path.startsWith("athlete/")) return "athlete"
    if (path.includes("/highschool/") || path.startsWith("highschool/")) return "highschool"
    if (path.includes("/college/") || path.startsWith("college/")) return "college"
    if (path.includes("/club/") || path.startsWith("club/")) return "club"

    if (path.includes("athlete")) return "athlete"
    if (path.includes("highschool") || path.includes("high-school")) return "highschool"
    if (path.includes("college") || path.includes("university")) return "college"
    if (path.includes("club") || path.includes("wrestling")) return "club"

    return "uncategorized"
  }

  const getCategoryLabel = (category: string): string => {
    switch (category.toLowerCase()) {
      case "athlete":
        return "Athletes"
      case "highschool":
        return "High Schools"
      case "college":
        return "Colleges"
      case "club":
        return "Clubs"
      case "uncategorized":
        return "Uncategorized"
      default:
        return category
    }
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
              <h1 className="text-4xl font-bold text-white mb-2">Media Manager Pro</h1>
              <p className="text-gray-300 text-lg">
                {onImageSelect
                  ? "Select a photo for your commitment card"
                  : "Manage your media files and logos with advanced analytics"}
              </p>
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
              {duplicateGroups.length > 0 && (
                <Dialog open={showDeduplicateDialog} onOpenChange={setShowDeduplicateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 text-white hover:bg-orange-600 font-semibold">
                      <Zap className="h-4 w-4 mr-2" />
                      Fix Duplicates ({duplicateGroups.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-nc-blue flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Remove Duplicate Logo Mappings
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Found {duplicateGroups.length} entities with duplicate logo mappings. This can cause confusion
                          when displaying logos.
                        </AlertDescription>
                      </Alert>

                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {duplicateGroups.map((group, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-nc-blue">{group.entity_name}</h4>
                              <Badge variant="destructive">{group.count} duplicates</Badge>
                            </div>
                            <p className="text-sm text-gray-600 capitalize">{group.entity_type}</p>
                            <div className="mt-2 space-y-1">
                              {group.mappings.map((mapping, idx) => (
                                <div key={mapping.id} className="text-xs text-gray-500 flex items-center gap-2">
                                  {idx === 0 ? (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      KEEP
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-red-600 border-red-600">
                                      REMOVE
                                    </Badge>
                                  )}
                                  <span>Created: {new Date(mapping.created_at).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleDeduplicate}
                          disabled={deduplicating}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          {deduplicating ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Removing Duplicates...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Remove All Duplicates
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => setShowDeduplicateDialog(false)} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
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
                      <Label className="text-sm font-medium text-gray-700">Photo Name *</Label>
                      <Input
                        placeholder="e.g., John Smith Headshot, UNC Logo, etc."
                        value={photoName}
                        onChange={(e) => {
                          setPhotoName(e.target.value)
                          setUploadResult(null)
                        }}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">This will be used as the filename</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Category *</Label>
                      <Select
                        value={selectedCategory === "all" ? "athlete" : selectedCategory}
                        onValueChange={(value) => setSelectedCategory(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="athlete">Athlete Photos</SelectItem>
                          <SelectItem value="highschool">High School Logos</SelectItem>
                          <SelectItem value="college">College Logos</SelectItem>
                          <SelectItem value="club">Club Logos</SelectItem>
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
                        placeholder="Add any additional details about this photo..."
                        value={photoDescription}
                        onChange={(e) => setPhotoDescription(e.target.value)}
                        className="w-full h-20 resize-none"
                      />
                    </div>

                    {selectedFile && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-nc-blue">{photoName || selectedFile.name}</p>
                        <p className="text-xs text-gray-600">
                          {formatFileSize(selectedFile.size)} • {selectedFile.type}
                        </p>
                        {photoDescription && <p className="text-xs text-gray-600 mt-1 italic">"{photoDescription}"</p>}
                      </div>
                    )}

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
                          Uploading "{photoName}"...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload "{photoName || "File"}"
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Edit Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="text-nc-blue">Edit Media File</DialogTitle>
              </DialogHeader>
              {editingFile && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Display Name</Label>
                    <Input
                      value={editingFile.newName}
                      onChange={(e) => setEditingFile({ ...editingFile, newName: e.target.value })}
                      placeholder="Enter display name for this file"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Category</Label>
                    <Select
                      value={editingFile.newCategory}
                      onValueChange={(value) => setEditingFile({ ...editingFile, newCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="athlete">Athlete Photos</SelectItem>
                        <SelectItem value="highschool">High School Logos</SelectItem>
                        <SelectItem value="college">College Logos</SelectItem>
                        <SelectItem value="club">Club Logos</SelectItem>
                        <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Description (Optional)</Label>
                    <Textarea
                      value={editingFile.newDescription}
                      onChange={(e) => setEditingFile({ ...editingFile, newDescription: e.target.value })}
                      placeholder="Add description or notes about this file"
                      className="h-20 resize-none"
                    />
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Current URL:</p>
                    <p className="text-xs font-mono text-gray-700 break-all">{editingFile.url}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveEdit}
                      className="flex-1 bg-nc-blue hover:bg-nc-blue/90 text-white"
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEditDialog(false)
                        setEditingFile(null)
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Logo Dialog */}
          <Dialog open={showLogoDialog} onOpenChange={setShowLogoDialog}>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="text-nc-blue">{editingLogo ? "Edit Logo" : "Add New Logo"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Entity Name" value={logoName} onChange={(e) => setLogoName(e.target.value)} />
                <Select value={logoType} onValueChange={setLogoType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="highschool">High School</SelectItem>
                    <SelectItem value="club">Wrestling Club</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={saveLogo} disabled={saving}>
                    {saving ? "Saving..." : editingLogo ? "Update" : "Add"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLogoDialog(false)
                      setEditingLogo(null)
                      resetLogoForm()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Logo Upload Dialog */}
          <Dialog open={showLogoUploadDialog} onOpenChange={setShowLogoUploadDialog}>
            <DialogContent className="bg-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-nc-blue">Upload New Logo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Entity Name *</Label>
                  <Input
                    placeholder="e.g., Cardinal Gibbons High School, UNC Chapel Hill, etc."
                    value={logoUploadName}
                    onChange={(e) => setLogoUploadName(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">Enter the exact name as it appears in athlete profiles</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Entity Type *</Label>
                  <Select value={logoUploadType} onValueChange={setLogoUploadType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="highschool">High School</SelectItem>
                      <SelectItem value="club">Wrestling Club</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Logo File *</Label>
                  <Input
                    id="logo-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      setLogoUploadFile(file || null)

                      if (file && !logoUploadName) {
                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
                        setLogoUploadName(nameWithoutExt)
                      }
                    }}
                  />
                </div>

                {logoUploadFile && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-nc-blue">{logoUploadName}</p>
                    <p className="text-xs text-gray-600">
                      {formatFileSize(logoUploadFile.size)} • {logoUploadFile.type}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Will be uploaded as {logoUploadType} logo</p>
                  </div>
                )}

                <Button
                  onClick={handleLogoUpload}
                  disabled={!logoUploadFile || !logoUploadName.trim() || saving}
                  className="w-full bg-nc-blue hover:bg-nc-blue/90 text-white"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Uploading Logo...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Upload & Map Logo
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Tabs defaultValue="gallery" className="space-y-4">
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
              <TabsTrigger
                value="logos"
                className="text-white data-[state=active]:bg-nc-gold data-[state=active]:text-nc-blue"
              >
                Logo Manager
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
                    value="duplicates"
                    className="text-white data-[state=active]:bg-nc-gold data-[state=active]:text-nc-blue"
                  >
                    Duplicates
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {!onImageSelect && (
              <TabsContent value="overview" className="space-y-6">
                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-nc-blue">Total Files</CardTitle>
                      <FileImage className="h-5 w-5 text-nc-gold" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-nc-blue">{analytics?.totalFiles || allFiles.length}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-nc-blue">Total Size</CardTitle>
                      <BarChart3 className="h-5 w-5 text-nc-gold" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-nc-blue">
                        {formatFileSize(analytics?.totalSize || allFiles.reduce((sum, file) => sum + file.size, 0))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-nc-blue">Logo Mappings</CardTitle>
                      <FolderOpen className="h-5 w-5 text-nc-gold" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-nc-blue">{logos.length}</div>
                      {duplicateGroups.length > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          {duplicateGroups.length} entities have duplicates
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Categories Breakdown */}
                <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-nc-blue text-xl">Categories Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics?.categories
                        ? Object.entries(analytics.categories).map(([category, data]) => (
                            <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-nc-blue text-white border-nc-blue font-medium">
                                  {category}
                                </Badge>
                                <span className="text-sm text-gray-600 font-medium">{data.count} files</span>
                              </div>
                              <span className="text-sm font-bold text-nc-blue">{formatFileSize(data.size)}</span>
                            </div>
                          ))
                        : ["athlete", "highschool", "college", "club"].map((category) => {
                            const categoryFiles = allFiles.filter(
                              (file) =>
                                file.pathname.toLowerCase().includes(category) ||
                                file.category?.toLowerCase().includes(category),
                            )
                            const totalSize = categoryFiles.reduce((sum, file) => sum + file.size, 0)

                            return (
                              <div
                                key={category}
                                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="bg-nc-blue text-white border-nc-blue font-medium">
                                    {getCategoryLabel(category)}
                                  </Badge>
                                  <span className="text-sm text-gray-600 font-medium">
                                    {categoryFiles.length} files
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-nc-blue">{formatFileSize(totalSize)}</span>
                              </div>
                            )
                          })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="gallery" className="space-y-4">
              <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-nc-blue">
                    <Search className="h-5 w-5" />
                    {onImageSelect ? "Select Photo" : "Media Gallery"}
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
                      <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value)}>
                        <SelectTrigger className="w-48">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="athlete">Athlete Photos</SelectItem>
                          <SelectItem value="highschool">High School Logos</SelectItem>
                          <SelectItem value="college">College Logos</SelectItem>
                          <SelectItem value="club">Club Logos</SelectItem>
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
                      {filteredFiles.map((file, index) => (
                        <Card
                          key={`${file.url}-${index}`}
                          className="group hover:shadow-lg transition-all duration-200 bg-white border-gray-200 hover:border-nc-blue/30 cursor-pointer"
                          onClick={() => onImageSelect && handleSelectImage(file.url)}
                        >
                          <CardContent className="p-3">
                            <div className="aspect-square relative mb-3 bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={file.url || "/placeholder.svg"}
                                alt={file.displayName || getFileName(file.pathname)}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder.svg?height=200&width=200&text=Failed+to+Load"
                                  console.error("Failed to load image:", file.url)
                                }}
                                onLoad={() => {
                                  console.log("Successfully loaded image:", file.url)
                                }}
                              />

                              {/* Action buttons overlay */}
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onImageSelect ? (
                                  <Button
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-nc-gold text-nc-blue hover:bg-nc-gold/90 shadow-sm"
                                    onClick={(e) => handleSelectImage(file.url, e)}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
                                      onClick={(e) => handleCopyUrl(file.url, e)}
                                      title="Copy URL"
                                    >
                                      {copiedUrl === file.url ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEdit(file)
                                      }}
                                      title="Edit"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-600 shadow-sm"
                                      onClick={(e) => handleDelete(file.url, e)}
                                      disabled={deleting === file.url}
                                      title="Delete"
                                    >
                                      {deleting === file.url ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>

                              {/* Category badge */}
                              <div className="absolute bottom-2 left-2">
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-white/90 text-nc-blue border-nc-blue/20"
                                >
                                  {getCategoryLabel(file.category || getCategory(file.pathname))}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h3
                                className="font-medium text-sm truncate text-nc-blue"
                                title={file.displayName || getFileName(file.pathname)}
                              >
                                {file.displayName || getFileName(file.pathname)}
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
                                  Select This Photo
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredFiles.map((file, index) => (
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
                              alt={file.displayName || getFileName(file.pathname)}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg?height=64&width=64&text=Failed"
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate text-nc-blue">
                              {file.displayName || getFileName(file.pathname)}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {getCategoryLabel(file.category || getCategory(file.pathname))}
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
                                  onClick={(e) => handleCopyUrl(file.url, e)}
                                  title="Copy URL"
                                >
                                  {copiedUrl === file.url ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleEdit(file)} title="Edit">
                                  <Edit className="h-4 w-4" />
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
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logos" className="space-y-4">
              <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-nc-blue">
                    <FolderOpen className="h-5 w-5" />
                    Logo Manager
                    <Badge variant="outline" className="ml-auto">
                      {logos.length} logos
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        onClick={startUploadLogo}
                        size="sm"
                        className="bg-nc-gold text-nc-blue hover:bg-nc-gold/90"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      <Button
                        onClick={startAddLogo}
                        size="sm"
                        variant="outline"
                        className="border-nc-blue text-nc-blue bg-transparent"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add URL
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {logos.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No logos found</p>
                      <p className="text-sm mt-2">Upload your first logo to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {logos.map((logo) => (
                        <Card key={logo.id} className="bg-white border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 border rounded overflow-hidden bg-gray-50 flex-shrink-0">
                                <img
                                  src={logo.logo_url || "/placeholder.svg"}
                                  alt={logo.entity_name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = "/placeholder.svg?height=64&width=64&text=Logo"
                                  }}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-nc-blue">{logo.entity_name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {logo.entity_type}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(logo.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 truncate max-w-md mt-1">{logo.logo_url}</p>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() => startEditLogo(logo)}
                                  variant="outline"
                                  size="sm"
                                  disabled={saving}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => deleteLogo(logo)}
                                  variant="outline"
                                  size="sm"
                                  disabled={saving}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
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
                            {formatFileSize(analytics?.totalSize || allFiles.reduce((sum, file) => sum + file.size, 0))}
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

                <TabsContent value="duplicates" className="space-y-4">
                  {analytics?.duplicates && analytics.duplicates.length > 0 ? (
                    <div className="grid gap-4">
                      {analytics.duplicates.map((duplicate, index) => (
                        <Card key={index} className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                          <CardHeader>
                            <CardTitle className="text-sm text-nc-blue">{duplicate.filename}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <Badge variant="destructive" className="bg-nc-red">
                                {duplicate.count} duplicates
                              </Badge>
                              <div className="space-y-2">
                                {duplicate.urls.map((url, urlIndex) => (
                                  <div
                                    key={urlIndex}
                                    className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                                  >
                                    <span className="truncate flex-1 mr-2 font-mono">{url}</span>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDelete(url)}
                                      className="bg-nc-red hover:bg-nc-red/90"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-white/95 backdrop-blur border-white/20 shadow-xl">
                      <CardContent className="text-center py-12">
                        <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-nc-blue mb-2">No Duplicates Found</h3>
                        <p className="text-gray-600">Your media library is clean and optimized!</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
