"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Search, Edit, Trash2, Save, X, Plus, AlertCircle, RefreshCw, Copy } from "lucide-react"

interface MediaItem {
  id: string
  file_name: string
  college_name: string | null
  alt_text: string | null
  division: string | null
  entity_type: string
  url: string
  blob_url: string | null
  file_size: number
  mime_type: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function WorkingMediaGallery() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableExists, setTableExists] = useState(false)
  const [checkingTable, setCheckingTable] = useState(true)
  const [creatingTable, setCreatingTable] = useState(false)

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCollegeName, setUploadCollegeName] = useState("")
  const [uploadAltText, setUploadAltText] = useState("")
  const [uploadDivision, setUploadDivision] = useState("")
  const [uploadEntityType, setUploadEntityType] = useState("college")
  const [uploadDescription, setUploadDescription] = useState("")

  const checkTable = async () => {
    setCheckingTable(true)
    setError(null)
    try {
      console.log("Checking if table exists...")
      const response = await fetch("/api/check-media-table")
      const result = await response.json()

      console.log("Table check result:", result)

      if (result.exists) {
        setTableExists(true)
        loadItems()
      } else {
        setTableExists(false)
        setError(result.error || "Table does not exist")
      }
    } catch (error) {
      console.error("Table check error:", error)
      setError("Failed to check table status")
      setTableExists(false)
    } finally {
      setCheckingTable(false)
    }
  }

  const loadItems = async () => {
    if (!tableExists) return

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)

      console.log("Loading items with search:", searchTerm)
      const response = await fetch(`/api/media-manager/search?${params}`)
      const result = await response.json()

      console.log("Load result:", result)

      if (result.success) {
        setItems(result.data || [])
      } else {
        setError(result.error || "Failed to load media items")
        setItems([])
      }
    } catch (error) {
      console.error("Load error:", error)
      setError("Failed to load media items")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkTable()
  }, [])

  useEffect(() => {
    if (tableExists) {
      loadItems()
    }
  }, [searchTerm, tableExists])

  const handleUpload = async () => {
    if (!uploadFile) {
      setError("Please select a file")
      return
    }

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("college_name", uploadCollegeName)
      formData.append("alt_text", uploadAltText)
      formData.append("division", uploadDivision)
      formData.append("entity_type", uploadEntityType)
      formData.append("description", uploadDescription)

      console.log("Uploading file:", uploadFile.name)
      const response = await fetch("/api/media-manager/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("Upload result:", result)

      if (result.success) {
        setUploadDialogOpen(false)
        resetUploadForm()
        loadItems()
      } else {
        setError(result.error || "Failed to upload file")
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError("An error occurred during upload")
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
      console.log("Saving edit for:", editingItem.id)
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
      console.log("Edit result:", result)

      if (result.success) {
        setEditingItem(null)
        loadItems()
      } else {
        setError(result.error || "Failed to update item")
      }
    } catch (error) {
      console.error("Update error:", error)
      setError("An error occurred during update")
    }
  }

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Delete "${item.file_name}"?`)) return

    try {
      console.log("Deleting item:", item.id)
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
      console.log("Delete result:", result)

      if (result.success) {
        loadItems()
      } else {
        setError(result.error || "Failed to delete item")
      }
    } catch (error) {
      console.error("Delete error:", error)
      setError("An error occurred during deletion")
    }
  }

  const handleCreateTable = async () => {
    setCreatingTable(true)
    setError(null)
    try {
      console.log("Creating table...")
      const response = await fetch("/api/create-media-table-direct", {
        method: "POST",
      })

      const result = await response.json()
      console.log("Create table result:", result)

      if (result.success) {
        setError(null)
        checkTable()
      } else {
        setError(result.error || "Failed to create table")
      }
    } catch (error) {
      console.error("Create table error:", error)
      setError("Failed to create table")
    } finally {
      setCreatingTable(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const manualSQL = `CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  college_name TEXT,
  alt_text TEXT,
  division TEXT,
  entity_type TEXT DEFAULT 'college',
  url TEXT NOT NULL,
  blob_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  tags TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on media_items" ON media_items;
CREATE POLICY "Allow all operations on media_items" ON media_items
  FOR ALL USING (true);`

  if (checkingTable) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking table status...</p>
        </div>
      </div>
    )
  }

  if (!tableExists) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The media_items table needs to be created before you can use the media manager.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please run this SQL in your Supabase SQL editor to create the required table:
          </p>
          <div className="relative">
            <Textarea readOnly className="font-mono text-sm min-h-[300px]" value={manualSQL} />
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 bg-transparent"
              onClick={() => copyToClipboard(manualSQL)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={checkTable} disabled={checkingTable}>
              <RefreshCw className={`h-4 w-4 mr-2 ${checkingTable ? "animate-spin" : ""}`} />
              {checkingTable ? "Checking..." : "Check Again"}
            </Button>
            <Button onClick={handleCreateTable} variant="outline" disabled={creatingTable}>
              {creatingTable ? "Creating..." : "Try Auto-Create"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
              <DialogDescription>Upload a logo or image file with metadata</DialogDescription>
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
          {!searchTerm && <p className="text-sm text-gray-400 mt-2">Upload your first file to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={item.url || "/placeholder.svg"}
                    alt={item.alt_text || item.file_name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=200&width=300&text=Image+Not+Found"
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {editingItem?.id === item.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">College Name</Label>
                      <Input
                        value={editingItem.college_name || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, college_name: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Alternative Text (Aliases)</Label>
                      <Input
                        value={editingItem.alt_text || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, alt_text: e.target.value })}
                        className="text-sm"
                        placeholder="UNC, Tar Heels, North Carolina"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Division</Label>
                      <Select
                        value={editingItem.division || ""}
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
