"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Camera, Upload, Image as ImageIcon, Video, Loader2, X, Check, Clock } from "lucide-react"

interface MediaItem {
  id: string
  team: string
  file_url: string
  file_name: string
  file_type: "image" | "video"
  caption: string | null
  status: "pending" | "approved" | "rejected"
  uploader_name: string | null
  uploaded_by: string
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function NhscaMediaGallery() {
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadTeam, setUploadTeam] = useState("all")
  const [caption, setCaption] = useState("")
  const [filterTeam, setFilterTeam] = useState("all")
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const { data, error, isLoading } = useSWR(
    `/api/nhsca-duals/media?team=${filterTeam}`,
    fetcher,
    { refreshInterval: 30000 }
  )

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
      mutate(`/api/nhsca-duals/media?team=${filterTeam}`)
      setCaption("")
      setUploadOpen(false)
    } catch (err) {
      console.error("Upload error:", err)
      alert("Upload failed")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }, [uploadTeam, caption, filterTeam])

  const media: MediaItem[] = data?.media || []
  const approvedMedia = media.filter(m => m.status === "approved")
  const myPendingMedia = media.filter(m => m.status === "pending")

  return (
    <div className="space-y-6">
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">Photo & Video Gallery</h3>
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-[140px] bg-[#1a2d4a] border-[#2a3f5f] text-white text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="national">National</SelectItem>
              <SelectItem value="select">Select</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#c9a227] hover:bg-[#b8912e] text-[#002147] font-semibold">
              <Camera className="h-4 w-4 mr-2" />
              Share Photos
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0d1f38] border-[#2a3f5f] text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-[#c9a227]" />
                Share Your Photos & Videos
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-white/60 text-sm">
                Share your photos and videos from the event! Uploads will be reviewed by our team before appearing in the gallery.
              </p>
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
                  <Label className="text-white/70 text-sm">Caption</Label>
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="bg-[#1a2d4a] border-[#2a3f5f] text-white"
                  />
                </div>
              </div>
              <label className="block">
                <div className="flex items-center justify-center gap-2 px-4 py-4 bg-[#1a2d4a] hover:bg-[#2a3f5f] border-2 border-dashed border-[#3a5f8f] rounded-lg cursor-pointer transition-colors">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#c9a227]" />
                  ) : (
                    <Upload className="h-6 w-6 text-[#c9a227]" />
                  )}
                  <span className="text-white/80">
                    {uploading ? "Uploading..." : "Select photos or videos"}
                  </span>
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
              <p className="text-white/40 text-xs text-center">
                Supported: JPEG, PNG, GIF, WebP, MP4, MOV, WebM (max 50MB)
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Pending Uploads */}
      {myPendingMedia.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Your Pending Uploads ({myPendingMedia.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {myPendingMedia.map((item) => (
                <div
                  key={item.id}
                  className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[#1a2d4a]"
                >
                  {item.file_type === "video" ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-8 w-8 text-white/50" />
                    </div>
                  ) : (
                    <img
                      src={item.file_url}
                      alt={item.caption || "Pending"}
                      className="w-full h-full object-cover opacity-60"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Badge className="bg-amber-500 text-black text-xs">Pending</Badge>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-amber-400/70 text-xs mt-2">
              These uploads are waiting for admin review and will appear in the gallery once approved.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Gallery */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#c9a227]" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-center py-8">Failed to load gallery</p>
      ) : approvedMedia.length === 0 ? (
        <Card className="bg-[#0d1f38] border-[#1e3a5f]">
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
            <p className="text-white/50">No photos yet. Be the first to share!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {approvedMedia.map((item) => (
            <div
              key={item.id}
              className="relative group rounded-xl overflow-hidden bg-[#1a2d4a] cursor-pointer"
              onClick={() => item.file_type === "image" && setLightboxImage(item.file_url)}
            >
              {item.file_type === "video" ? (
                <video
                  src={item.file_url}
                  className="aspect-square object-cover"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={item.file_url}
                  alt={item.caption || "Gallery image"}
                  className="aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              
              {/* Team badge */}
              {item.team !== "all" && (
                <Badge 
                  className={`absolute top-2 right-2 text-xs ${
                    item.team === "national" 
                      ? "bg-[#c9a227] text-[#002147]" 
                      : "bg-[#003366] text-white"
                  }`}
                >
                  {item.team === "national" ? "National" : "Select"}
                </Badge>
              )}

              {/* Caption overlay */}
              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs line-clamp-2">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
