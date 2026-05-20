"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Check, X, Trash2, Image as ImageIcon, Video, Loader2 } from "lucide-react"

interface MediaItem {
  id: string
  team: string
  file_url: string
  file_name: string
  file_type: "image" | "video"
  caption: string | null
  status: "pending" | "approved" | "rejected"
  uploader_name: string | null
  uploader_role: string | null
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function NhscaMediaAdmin() {
  const [uploading, setUploading] = useState(false)
  const [uploadTeam, setUploadTeam] = useState("all")
  const [caption, setCaption] = useState("")
  const [viewMode, setViewMode] = useState<"pending" | "approved" | "all">("pending")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const apiUrl = viewMode === "pending" 
    ? "/api/nhsca-duals/media?pending=true"
    : viewMode === "approved"
    ? "/api/nhsca-duals/media?status=approved"
    : "/api/nhsca-duals/media?status=all"

  const { data, error, isLoading } = useSWR(apiUrl, fetcher, {
    refreshInterval: 10000
  })

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("team", uploadTeam)
        if (caption) formData.append("caption", caption)

        const res = await fetch("/api/nhsca-duals/media", {
          method: "POST",
          body: formData
        })

        if (!res.ok) {
          const err = await res.json()
          alert(`Upload failed: ${err.error}`)
        }
      }
      mutate(apiUrl)
      setCaption("")
    } catch (err) {
      console.error("Upload error:", err)
      alert("Upload failed")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }, [uploadTeam, caption, apiUrl])

  const handleAction = async (id: string, action: "approved" | "rejected" | "delete") => {
    setActionLoading(id)
    try {
      if (action === "delete") {
        await fetch(`/api/nhsca-duals/media?id=${id}`, { method: "DELETE" })
      } else {
        await fetch("/api/nhsca-duals/media", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: action })
        })
      }
      mutate(apiUrl)
    } catch (err) {
      console.error("Action error:", err)
    } finally {
      setActionLoading(null)
    }
  }

  const pendingCount = data?.pendingCount || 0
  const media: MediaItem[] = data?.media || []

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-[#0d1f38] border-[#1e3a5f]">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#c9a227]" />
            Upload Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70 text-sm">Team</Label>
              <Select value={uploadTeam} onValueChange={setUploadTeam}>
                <SelectTrigger className="bg-[#1a2d4a] border-[#2a3f5f] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Both Teams</SelectItem>
                  <SelectItem value="national">National Team</SelectItem>
                  <SelectItem value="select">Select Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-sm">Caption (optional)</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="bg-[#1a2d4a] border-[#2a3f5f] text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex-1">
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#c9a227] hover:bg-[#b8912e] text-[#002147] font-semibold rounded-lg cursor-pointer transition-colors">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                {uploading ? "Uploading..." : "Select Files"}
              </div>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-white/50 text-xs">Admin uploads are auto-published</p>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Queue */}
      <Card className="bg-[#0d1f38] border-[#1e3a5f]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-[#c9a227]" />
              Media Gallery
              {pendingCount > 0 && (
                <Badge className="bg-amber-500 text-black ml-2">{pendingCount} pending</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === "pending" ? "default" : "outline"}
                onClick={() => setViewMode("pending")}
                className={viewMode === "pending" ? "bg-amber-500 text-black" : "border-[#2a3f5f] text-white/70"}
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={viewMode === "approved" ? "default" : "outline"}
                onClick={() => setViewMode("approved")}
                className={viewMode === "approved" ? "bg-green-600 text-white" : "border-[#2a3f5f] text-white/70"}
              >
                Approved
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#c9a227]" />
            </div>
          ) : error ? (
            <p className="text-red-400 text-center py-8">Failed to load media</p>
          ) : media.length === 0 ? (
            <p className="text-white/50 text-center py-8">
              {viewMode === "pending" ? "No pending uploads" : "No media yet"}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((item) => (
                <div
                  key={item.id}
                  className="relative group rounded-lg overflow-hidden bg-[#1a2d4a] border border-[#2a3f5f]"
                >
                  {item.file_type === "video" ? (
                    <div className="aspect-square flex items-center justify-center bg-black/50">
                      <Video className="h-12 w-12 text-white/50" />
                    </div>
                  ) : (
                    <img
                      src={item.file_url}
                      alt={item.caption || "Media"}
                      className="aspect-square object-cover"
                    />
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-between items-start">
                      <Badge className={
                        item.status === "pending" ? "bg-amber-500 text-black" :
                        item.status === "approved" ? "bg-green-600" : "bg-red-600"
                      }>
                        {item.status}
                      </Badge>
                      <Badge variant="outline" className="text-white/70 border-white/30 text-xs">
                        {item.team}
                      </Badge>
                    </div>
                    
                    <div>
                      {item.uploader_role === "parent" && (
                        <p className="text-white/70 text-xs mb-1">By: {item.uploader_name}</p>
                      )}
                      {item.caption && (
                        <p className="text-white text-xs line-clamp-2">{item.caption}</p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons for pending */}
                  {item.status === "pending" && (
                    <div className="absolute bottom-0 left-0 right-0 flex gap-1 p-2 bg-gradient-to-t from-black/80">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 h-8"
                        onClick={() => handleAction(item.id, "approved")}
                        disabled={actionLoading === item.id}
                      >
                        {actionLoading === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-red-600 hover:bg-red-700 h-8"
                        onClick={() => handleAction(item.id, "rejected")}
                        disabled={actionLoading === item.id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Delete button for approved */}
                  {item.status === "approved" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => handleAction(item.id, "delete")}
                      disabled={actionLoading === item.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
