"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Search, Edit, Trash2, Save, X, Plus, Database, AlertCircle } from "lucide-react"

interface MediaItem {
  id: string
  file_name: string
  college_name: string
  alt_text: string
  division: string
  entity_type: string
  url: string
  blob_url: string
  file_size: number
  mime_type: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function EnhancedMediaGallery() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupInstructions, setSetupInstructions] = useState<any>(null)
  const [settingUp, setSettingUp] = useState(false)

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCollegeName, setUploadCollegeName] = useState("")
  const [uploadAltText, setUploadAltText] = useState("")
  const [uploadDivision, setUploadDivision] = useState("")
  const [uploadEntityType, setUploadEntityType] = useState("college")
  const [uploadDescription, setUploadDescription] = useState("")

  const { toast } = useToast()

  const loadItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)

      const response = await fetch(`/api/media-manager/search?${params}`)
      const result = await response.json()

      if (result.success) {
        setItems(result.data || [])
        setNeedsSetup(false)
      } else if (result.needsSetup) {
        setNeedsSetup(true)
        setSetupInstructions(result.setupInstructions)
        setItems([])
      } else {
        console.error("Load failed:", result.error)
        toast({
          title: "Error",
          description: result.error || "Failed to load media items",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Load error:", error)
      toast({
        title: "Error",
        description: "Failed to load media items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [searchTerm])

  const handleSetupDatabase = async () => {
    setSettingUp(true)
    try {
      const response = await fetch("/api/create-media-table-direct", {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Database setup completed!",
        })
        setNeedsSetup(false)
        loadItems()
      } else if (result.needsManualSetup) {
        toast({
          title: "Manual Setup Required",
          description: "Please check the console for SQL to run in Supabase dashboard",
          variant: "destructive",
        })
        console.log("=== MANUAL SETUP REQUIRED ===")
        console.log(result.sql)
        console.log("Instructions:", result.instructions)
      } else {
        toast({
          title: "Setup Failed",
          description: result.error || "Failed to setup database",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Setup error:", error)
      toast({
        title: "Setup Failed",
        description: "An error occurred during setup",
        variant: "destructive",
      })
    } finally {
      setSettingUp(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("college_name", uploadCollegeName)
      formData.append("alt_text", uploadAltText)
      formData.append("division", uploadDivision)
      formData.append("entity_type", uploadEntityType)
      formData.append("description", uploadDescription)

      const response = await fetch("/api/media-manager/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "File uploaded successfully",
        })
        setUploadDialogOpen(false)
        resetUploadForm()
        loadItems()
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload file",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: "An error occurred during upload",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const resetUploadForm = () => {
    setUploadFile(null)
    setUploadCollegeName("")
    setUploadAltText("")
    setUploadDivision("")
    setUploadEntityType("college")
    setUploadDescription("")
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    try {
      const response = await fetch(`/api/media-manager/update/${editingItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          college_name: editingItem.college_name,
          alt_text: editingItem.alt_text,
          division: editingItem.division,
          entity_type: editingItem.entity_type,
          description: editingItem.description,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Item updated successfully",
        })
        setEditingItem(null)
        loadItems()
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "Failed to update item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Update Failed",
        description: "An error occurred during update",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Delete "${item.file_name}"?`)) return

    try {
      const response = await fetch(`/api/media-manager/update/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: false,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Item deleted successfully",
        })
        loadItems()
      } else {
        toast({
          title: "Delete Failed",
          description: result.error || "Failed to delete item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete Failed",
        description: "An error occurred during deletion",
        variant: "destructive",
      })
    }
  }

  if (needsSetup) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Setup Required</AlertTitle>
          <AlertDescription>
            {setupInstructions?.message || "The media items table needs to be created before you can manage logos."}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold">Setup Media Manager</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The media manager database table needs to be created. Click the button below to set it up automatically.
            </p>
            <Button onClick={handleSetupDatabase} disabled={settingUp} className="w-full">
              {settingUp ? (
                <>
                  <Database className="mr-2 h-4 w-4 animate-pulse" />
                  Setting up database...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Setup Database
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Media Gallery</h2>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload New File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  accept="image/*"
                />
              </div>

              <div>
                <Label htmlFor="college-name">College Name</Label>
                <Input
                  id="college-name"
                  value={uploadCollegeName}
                  onChange={(e) => setUploadCollegeName(e.target.value)}
                  placeholder="University of North Carolina at Chapel Hill"
                />
              </div>

              <div>
                <Label htmlFor="alt-text">Alternative Text (Aliases)</Label>
                <Input
                  id="alt-text"
                  value={uploadAltText}
                  onChange={(e) => setUploadAltText(e.target.value)}
                  placeholder="UNC, Tar Heels, North Carolina"
                />
              </div>

              <div>
                <Label htmlFor="division">Division</Label>
                <Select value={uploadDivision} onValueChange={setUploadDivision}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NCAA Division I">NCAA Division I</SelectItem>
                    <SelectItem value="NCAA Division II">NCAA Division II</SelectItem>
                    <SelectItem value="NCAA Division III">NCAA Division III</SelectItem>
                    <SelectItem value="NAIA">NAIA</SelectItem>
                    <SelectItem value="NJCAA">NJCAA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="entity-type">Type</Label>
                <Select value={uploadEntityType} onValueChange={setUploadEntityType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="high-school">High School</SelectItem>
                    <SelectItem value="club">Club</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleUpload} disabled={!uploadFile || uploading} className="w-full">
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No media items found</p>
          <p className="text-sm text-gray-400 mt-2">Upload some files to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={item.url || "/placeholder.svg?height=200&width=300"}
                    alt={item.alt_text || item.file_name}
                    className="w-full h-full object-contain"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {editingItem?.id === item.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">College Name</Label>
                      <Input
                        value={editingItem.college_name}
                        onChange={(e) => setEditingItem({ ...editingItem, college_name: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Alternative Text (Aliases)</Label>
                      <Input
                        value={editingItem.alt_text}
                        onChange={(e) => setEditingItem({ ...editingItem, alt_text: e.target.value })}
                        className="text-sm"
                        placeholder="UNC, Tar Heels, North Carolina"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Division</Label>
                      <Select
                        value={editingItem.division}
                        onValueChange={(value) => setEditingItem({ ...editingItem, division: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NCAA Division I">NCAA Division I</SelectItem>
                          <SelectItem value="NCAA Division II">NCAA Division II</SelectItem>
                          <SelectItem value="NCAA Division III">NCAA Division III</SelectItem>
                          <SelectItem value="NAIA">NAIA</SelectItem>
                          <SelectItem value="NJCAA">NJCAA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm truncate">{item.file_name}</h3>
                    {item.college_name && (
                      <p className="text-xs text-gray-600">
                        <strong>College:</strong> {item.college_name}
                      </p>
                    )}
                    {item.alt_text && (
                      <p className="text-xs text-gray-600">
                        <strong>Aliases:</strong> {item.alt_text}
                      </p>
                    )}
                    {item.division && (
                      <Badge variant="outline" className="text-xs">
                        {item.division}
                      </Badge>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingItem(item)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
