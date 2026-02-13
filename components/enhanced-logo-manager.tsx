"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ExternalLink,
  Copy,
  RefreshCw,
  Edit,
  Save,
  X,
  Search,
  Plus,
  Trash2,
  Upload,
  ImagePlus,
  CheckCircle,
} from "lucide-react"
import Image from "next/image"

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  aliases?: string
  division?: string // Added division field
  created_at: string
  updated_at: string
}

export default function EnhancedLogoManager() {
  const [logoMappings, setLogoMappings] = useState<LogoMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<LogoMapping | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // Upload helpers
  const sanitizeForId = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

  // New Mapping upload state
  const [nmSelectedFile, setNmSelectedFile] = useState<File | null>(null)
  const [nmUploading, setNmUploading] = useState(false)
  const [nmUploadError, setNmUploadError] = useState<string | null>(null)
  const [nmUploadedUrl, setNmUploadedUrl] = useState<string | null>(null)

  // Edit Dialog upload state
  const [edSelectedFile, setEdSelectedFile] = useState<File | null>(null)
  const [edUploading, setEdUploading] = useState(false)
  const [edUploadError, setEdUploadError] = useState<string | null>(null)
  const [edUploadedUrl, setEdUploadedUrl] = useState<string | null>(null)

  // Form states for editing
  const [editForm, setEditForm] = useState({
    entityName: "",
    entityType: "club",
    aliases: "",
    logoUrl: "",
    division: "", // Added division to edit form
  })

  // New mapping form
  const [newMappingForm, setNewMappingForm] = useState({
    entityName: "",
    entityType: "club",
    logoUrl: "",
    aliases: "",
    division: "", // Added division to new mapping form
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      console.log("[v0] Loading logo mappings...")

      // Load logo mappings
      const mappingsResponse = await fetch("/api/logo-mappings")
      const mappingsData = await mappingsResponse.json()
      console.log("[v0] Mappings response:", mappingsData)

      if (mappingsData.success && mappingsData.mappings) {
        setLogoMappings(mappingsData.mappings)
        console.log("[v0] Set logo mappings:", mappingsData.mappings.length)
      } else {
        console.error("[v0] Failed to load logo mappings:", mappingsData.error)
        setLogoMappings([])
      }
    } catch (error) {
      console.error("[v0] Failed to load data:", error)
      setLogoMappings([])
    } finally {
      setLoading(false)
    }
  }

  function uploadLogo(file: File, entityName: string, entityType: string) {
    console.log("[v0] Upload logo called", { fileName: file.name, entityName, entityType })

    const formData = new FormData()
    formData.append("file", file)
    formData.append("category", "logo")
    formData.append("altText", entityName || file.name)
    formData.append("caption", "")
    formData.append("entityType", entityType || "club")
    formData.append(
      "entityId",
      (entityName || file.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    )

    return fetch("/api/simple-media-upload", { method: "POST", body: formData }).then(async (res) => {
      console.log("[v0] Upload response status:", res.status)

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = (data && (data.error || data.message)) || res.statusText || "Upload failed"
        console.error("[v0] Upload failed:", message)
        throw new Error(message)
      }
      if (!data?.success || !data?.data?.url) {
        console.error("[v0] Upload failed: no URL returned", data)
        throw new Error((data && (data.error || data.message)) || "Upload failed: no URL returned")
      }

      console.log("[v0] Upload successful:", data.data.url)
      return {
        url: data.data.url as string,
        filename: data.data.filename as string | undefined,
        size: data.data.size as number | undefined,
      }
    })
  }

  const handleEditItem = (item: LogoMapping) => {
    setEditingItem(item)
    setEditForm({
      entityName: item.entity_name,
      entityType: item.entity_type,
      aliases: item.aliases || "",
      logoUrl: item.logo_url,
      division: item.division || "", // Added division to edit form initialization
    })
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    setSaveStatus("saving")

    try {
      const response = await fetch(`/api/logo-mappings/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_name: editForm.entityName,
          entity_type: editForm.entityType,
          logo_url: editForm.logoUrl,
          aliases: editForm.aliases,
          division: editForm.division, // Added division to save payload
        }),
      })

      if (response.ok) {
        setSaveStatus("success")
        setEditingItem(null)
        loadData() // Reload data
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus("error")
        setTimeout(() => setSaveStatus(null), 3000)
      }
    } catch (error) {
      console.error("Save error:", error)
      setSaveStatus("error")
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const handleDeleteMapping = async (id: string) => {
    if (!confirm("Are you sure you want to delete this logo mapping?")) return

    try {
      const response = await fetch(`/api/logo-mappings/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData() // Reload data
      } else {
        alert("Failed to delete mapping")
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete mapping")
    }
  }

  const handleCreateMapping = async () => {
    console.log("[v0] Create mapping clicked", newMappingForm)

    if (!newMappingForm.entityName) {
      setSaveStatus("error")
      alert("Please fill in Entity Name")
      setTimeout(() => setSaveStatus(null), 3000)
      return
    }
    if (newMappingForm.entityType !== "club" && !newMappingForm.logoUrl) {
      setSaveStatus("error")
      alert("Logo URL is required for high school, college, and other entities")
      setTimeout(() => setSaveStatus(null), 3000)
      return
    }

    setSaveStatus("saving")

    try {
      console.log("[v0] Making POST request to /api/logo-mappings")
      const response = await fetch("/api/logo-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_name: newMappingForm.entityName,
          entity_type: newMappingForm.entityType,
          logo_url: newMappingForm.logoUrl?.trim() || undefined,
          aliases: newMappingForm.aliases,
          division: newMappingForm.division,
        }),
      })

      console.log("[v0] Response status:", response.status)

      if (response.ok) {
        console.log("[v0] Mapping created successfully")
        setNewMappingForm({
          entityName: "",
          entityType: "club",
          logoUrl: "",
          aliases: "",
          division: "",
        })
        setSaveStatus("success")
        loadData()
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Server error: ${response.status}`
        console.error("[v0] Mapping creation failed:", errorMessage)
        alert(`Failed to create mapping: ${errorMessage}`)
        setSaveStatus("error")
        setTimeout(() => setSaveStatus(null), 3000)
      }
    } catch (error) {
      console.error("[v0] Network error creating mapping:", error)
      alert(`Failed to create mapping: ${error instanceof Error ? error.message : "Network error"}`)
      setSaveStatus("error")
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      console.error("Failed to copy URL:", error)
    }
  }

  const filteredMappings = logoMappings.filter((mapping) => {
    const searchLower = searchTerm.toLowerCase()

    const matchesSearch =
      !searchTerm ||
      mapping.entity_name.toLowerCase().includes(searchLower) ||
      mapping.aliases?.toLowerCase().includes(searchLower)

    const matchesType = selectedType === "all" || mapping.entity_type === selectedType

    return matchesSearch && matchesType
  })

  async function handleNewMappingUpload() {
    if (!nmSelectedFile) return
    setNmUploading(true)
    setNmUploadError(null)
    setNmUploadedUrl(null)
    try {
      const { url } = await uploadLogo(
        nmSelectedFile,
        newMappingForm.entityName || nmSelectedFile.name,
        newMappingForm.entityType,
      )
      setNewMappingForm((prev) => ({ ...prev, logoUrl: url }))
      setNmUploadedUrl(url)
      setNmSelectedFile(null)
    } catch (err) {
      setNmUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setNmUploading(false)
    }
  }

  async function handleEditUpload() {
    if (!edSelectedFile || !editingItem) return
    setEdUploading(true)
    setEdUploadError(null)
    setEdUploadedUrl(null)
    try {
      const { url } = await uploadLogo(
        edSelectedFile,
        editForm.entityName || editingItem.entity_name,
        editForm.entityType,
      )
      setEditForm((prev) => ({ ...prev, logoUrl: url }))
      setEdUploadedUrl(url)
      setEdSelectedFile(null)
    } catch (err) {
      setEdUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setEdUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading logo manager...</span>
      </div>
    )
  }

  console.log("[v0] Logo Manager Counts:", {
    logoMappings: logoMappings.length,
    clubLogos: logoMappings.filter((m) => m.entity_type === "club").length,
    schoolLogos: logoMappings.filter((m) => m.entity_type === "highschool").length,
    collegeLogos: logoMappings.filter((m) => m.entity_type === "college").length,
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🏛️ Enhanced Logo Manager</span>
            <div className="flex gap-2">
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{logoMappings?.length || 0}</div>
              <div className="text-sm text-blue-600">Total Logos</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {logoMappings?.filter((m) => m.entity_type === "club").length || 0}
              </div>
              <div className="text-sm text-purple-600">Club Logos</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {logoMappings?.filter((m) => m.entity_type === "highschool").length || 0}
              </div>
              <div className="text-sm text-orange-600">School Logos</div>
            </div>
          </div>

          {saveStatus && (
            <Alert
              className={`mb-4 ${
                saveStatus === "success"
                  ? "border-green-500"
                  : saveStatus === "error"
                    ? "border-red-500"
                    : "border-blue-500"
              }`}
            >
              <AlertDescription>
                {saveStatus === "saving" && "Saving changes..."}
                {saveStatus === "success" && "✅ Changes saved successfully!"}
                {saveStatus === "error" && "❌ Failed to save changes. Please try again."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="mappings" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="mappings">Logo Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="space-y-4">
          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by entity name or aliases..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="type-filter">Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="club">Wrestling Clubs</SelectItem>
                      <SelectItem value="highschool">High Schools</SelectItem>
                      <SelectItem value="college">Colleges</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create New Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Logo Mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-entity-name">Entity Name</Label>
                  <Input
                    id="new-entity-name"
                    placeholder="e.g., Darkhorse Wrestling Club"
                    value={newMappingForm.entityName}
                    onChange={(e) =>
                      setNewMappingForm((prev) => ({
                        ...prev,
                        entityName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="new-entity-type">Entity Type</Label>
                  <Select
                    value={newMappingForm.entityType}
                    onValueChange={(value) =>
                      setNewMappingForm((prev) => ({
                        ...prev,
                        entityType: value,
                        division: value === "college" ? prev.division : "", // Clear division if not college
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="club">Wrestling Club</SelectItem>
                      <SelectItem value="highschool">High School</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newMappingForm.entityType === "college" && (
                <div>
                  <Label htmlFor="new-division">Division</Label>
                  <Select
                    value={newMappingForm.division}
                    onValueChange={(value) =>
                      setNewMappingForm((prev) => ({
                        ...prev,
                        division: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DI">DI</SelectItem>
                      <SelectItem value="DII">DII</SelectItem>
                      <SelectItem value="DIII">DIII</SelectItem>
                      <SelectItem value="NAIA">NAIA</SelectItem>
                      <SelectItem value="NJCAA">NJCAA</SelectItem>
                      <SelectItem value="Independent">Independent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="new-logo-url">Logo URL</Label>
                <Input
                  id="new-logo-url"
                  placeholder="https://..."
                  value={newMappingForm.logoUrl}
                  onChange={(e) =>
                    setNewMappingForm((prev) => ({
                      ...prev,
                      logoUrl: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="border rounded-md p-3 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Or upload a logo image</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <Label htmlFor="nm-file">Select image</Label>
                    <Input
                      id="nm-file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNmSelectedFile(e.target.files?.[0] || null)}
                      disabled={nmUploading}
                    />
                    {nmSelectedFile && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Selected: {nmSelectedFile.name} ({Math.round(nmSelectedFile.size / 1024)} KB)
                      </div>
                    )}
                  </div>
                  <Button onClick={handleNewMappingUpload} disabled={!nmSelectedFile || nmUploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {nmUploading ? "Uploading..." : "Upload Logo"}
                  </Button>
                </div>
                {nmUploadError && <div className="text-sm text-red-600 mt-2">❌ {nmUploadError}</div>}
                {nmUploadedUrl && (
                  <div className="text-sm text-green-600 mt-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Uploaded. URL added to the field above.
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="new-aliases">Aliases (comma-separated)</Label>
                <Input
                  id="new-aliases"
                  placeholder="e.g., Dark Horse, DH Wrestling, Darkhorse WC"
                  value={newMappingForm.aliases}
                  onChange={(e) =>
                    setNewMappingForm((prev) => ({
                      ...prev,
                      aliases: e.target.value,
                    }))
                  }
                />
              </div>

              <Button
                onClick={handleCreateMapping}
                className="w-full"
                disabled={
                  !newMappingForm.entityName ||
                  (newMappingForm.entityType !== "club" && !newMappingForm.logoUrl) ||
                  saveStatus === "saving"
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                {saveStatus === "saving" ? "Creating..." : "Create Mapping"}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Mappings */}
          <Card>
            <CardHeader>
              <CardTitle>Logo Mappings ({filteredMappings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMappings.map((mapping) => (
                  <div key={mapping.id} className="border rounded-lg p-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded flex items-center justify-center flex-shrink-0">
                      <Image
                        src={mapping.logo_url || "/placeholder.svg"}
                        alt={mapping.entity_name}
                        width={48}
                        height={48}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg"
                        }}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{mapping.entity_name}</h4>
                        <Badge variant="outline">{mapping.entity_type}</Badge>
                        {mapping.entity_type === "college" && mapping.division && (
                          <Badge variant="secondary">{mapping.division}</Badge>
                        )}
                      </div>
                      {mapping.aliases && (
                        <div className="text-sm text-muted-foreground">Aliases: {mapping.aliases}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-md">{mapping.logo_url}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleEditItem(mapping)} variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => copyToClipboard(mapping.logo_url)} variant="outline" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => window.open(mapping.logo_url, "_blank")} variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {copiedUrl === mapping.logo_url && (
                      <div className="absolute top-2 right-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                        ✅ Copied!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Logo Mapping</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-50 rounded flex items-center justify-center">
                  <Image
                    src={editForm.logoUrl || "/placeholder.svg"}
                    alt={editForm.entityName}
                    width={80}
                    height={80}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Current mapping:</div>
                  <div className="font-medium">{editingItem.entity_name}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-entity-name">Entity Name *</Label>
                  <Input
                    id="edit-entity-name"
                    placeholder="e.g., Darkhorse Wrestling Club"
                    value={editForm.entityName}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        entityName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-entity-type">Entity Type</Label>
                  <Select
                    value={editForm.entityType}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({
                        ...prev,
                        entityType: value,
                        division: value === "college" ? prev.division : "", // Clear division if not college
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="club">Wrestling Club</SelectItem>
                      <SelectItem value="highschool">High School</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editForm.entityType === "college" && (
                <div>
                  <Label htmlFor="edit-division">Division</Label>
                  <Select
                    value={editForm.division}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({
                        ...prev,
                        division: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DI">DI</SelectItem>
                      <SelectItem value="DII">DII</SelectItem>
                      <SelectItem value="DIII">DIII</SelectItem>
                      <SelectItem value="NAIA">NAIA</SelectItem>
                      <SelectItem value="NJCAA">NJCAA</SelectItem>
                      <SelectItem value="Independent">Independent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="edit-logo-url">Logo URL</Label>
                <Input
                  id="edit-logo-url"
                  value={editForm.logoUrl}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      logoUrl: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="border rounded-md p-3 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Upload a new logo image</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <Label htmlFor="ed-file">Select image</Label>
                    <Input
                      id="ed-file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEdSelectedFile(e.target.files?.[0] || null)}
                      disabled={edUploading}
                    />
                    {edSelectedFile && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Selected: {edSelectedFile.name} ({Math.round(edSelectedFile.size / 1024)} KB)
                      </div>
                    )}
                  </div>
                  <Button onClick={handleEditUpload} variant="outline" disabled={!edSelectedFile || edUploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {edUploading ? "Uploading..." : "Upload & Set URL"}
                  </Button>
                </div>
                {edUploadError && <div className="text-sm text-red-600 mt-2">❌ {edUploadError}</div>}
                {edUploadedUrl && (
                  <div className="text-sm text-green-600 mt-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Uploaded. The URL has been set above.
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="edit-aliases">Aliases (comma-separated)</Label>
                <Textarea
                  id="edit-aliases"
                  placeholder="e.g., Dark Horse, DH Wrestling, Darkhorse WC"
                  value={editForm.aliases}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      aliases: e.target.value,
                    }))
                  }
                  rows={2}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Add alternative names to improve matching (e.g., "Dark Horse" and "Darkhorse")
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button onClick={() => setEditingItem(null)} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={!editForm.entityName || saveStatus === "saving"}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveStatus === "saving" ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
