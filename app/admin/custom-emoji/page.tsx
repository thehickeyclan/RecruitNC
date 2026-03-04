"use client"

import { useState, useEffect } from "react"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminHeader } from "@/components/admin-header"
import { ArrowLeft, Loader2, Plus, Trash2, Upload } from "lucide-react"

type Category = "hs" | "college" | "club" | "ncu" | "other"

type EmojiRow = {
  id: string
  slug: string
  image_url: string
  category: string
  display_name: string | null
  sort_order: number
  created_at?: string
}

const CATEGORY_LABELS: Record<Category, string> = {
  hs: "High school",
  college: "College",
  club: "Club",
  ncu: "NCU / Org",
  other: "Other",
}

export default function AdminCustomEmojiPage() {
  const [list, setList] = useState<EmojiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [slug, setSlug] = useState("")
  const [category, setCategory] = useState<Category>("ncu")
  const [displayName, setDisplayName] = useState("")

  function load() {
    setLoading(true)
    fetch("/api/admin/custom-emoji", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setList(data.emoji ?? [])
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setFile(f ?? null)
    if (f && !slug) {
      const base = f.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
      setSlug(base || "emoji")
    }
  }

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError("Choose an image file")
      return
    }
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.set("file", file)
      if (slug.trim()) form.set("slug", slug.trim())
      form.set("category", category)
      if (displayName.trim()) form.set("display_name", displayName.trim())
      const res = await fetch("/api/admin/custom-emoji", {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Upload failed")
      setFile(null)
      setSlug("")
      setDisplayName("")
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this emoji? It will no longer appear in the picker; existing messages will show a broken image if they use it.")) return
    try {
      const res = await fetch(`/api/admin/custom-emoji/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) load()
    } catch {
      // ignore
    }
  }

  const byCategory = (list as EmojiRow[]).reduce(
    (acc, row) => {
      const c = (row.category || "other") as Category
      if (!acc[c]) acc[c] = []
      acc[c].push(row)
      return acc
    },
    {} as Record<Category, EmojiRow[]>
  )
  const order: Category[] = ["ncu", "hs", "college", "club", "other"]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#003366] to-[#004080] text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <HardLink
              href="/admin"
              className="text-white/90 hover:text-white flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Admin
            </HardLink>
            <h1 className="text-2xl font-bold">Custom emoji</h1>
          </div>
          <p className="text-blue-200 text-sm mt-1">
            Upload logos (HS, College, Club, NCU). They’re resized to emoji size and used as <code className="bg-white/20 px-1 rounded">:slug:</code> in group messages.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <AdminHeader />

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Add emoji
            </CardTitle>
            <CardDescription>Upload an image (PNG, JPEG, GIF, WebP). Slug is used in messages as :slug:</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitUpload} className="space-y-4 max-w-md">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div>
                <Label>Image</Label>
                <Input type="file" accept="image/*" onChange={onFileChange} className="mt-1" />
              </div>
              <div>
                <Label>Slug (e.g. ncu-logo, ettc)</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ncu-logo"
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {order.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Display name (optional)</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="NCU Logo"
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={!file || uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? " Uploading…" : " Upload"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emoji index</CardTitle>
            <CardDescription>By category. Use :slug: in messages to insert.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-6">
                {order.map((cat) => {
                  const rows = byCategory[cat] ?? []
                  if (rows.length === 0) return null
                  return (
                    <div key={cat}>
                      <h3 className="font-semibold text-[#003366] mb-2">{CATEGORY_LABELS[cat]}</h3>
                      <div className="flex flex-wrap gap-4">
                        {rows.map((row) => (
                          <div
                            key={row.id}
                            className="flex items-center gap-3 border rounded-lg p-3 bg-gray-50"
                          >
                            <img
                              src={row.image_url}
                              alt={row.slug}
                              className="w-10 h-10 object-contain"
                            />
                            <div>
                              <p className="font-mono text-sm">:{row.slug}:</p>
                              {row.display_name && (
                                <p className="text-xs text-gray-500">{row.display_name}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => remove(row.id)}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {list.length === 0 && !loading && (
                  <p className="text-gray-500">No custom emoji yet. Upload one above.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
