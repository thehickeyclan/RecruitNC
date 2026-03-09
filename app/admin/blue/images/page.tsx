"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/image-upload"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ArrowLeft } from "lucide-react"
import { BLUE_IMAGE_KEYS, type BlueContent, type BlueImageKey } from "@/lib/blue-content"

const SLOT_LABELS: Record<BlueImageKey, string> = {
  blue_banner_url: "Page banner (top)",
  blue_national_team_kids: "National Team kids (Tobin, Mac, Bentley)",
  blue_what_makes_1: "What Makes Blue Different — image 1",
  blue_what_makes_2: "What Makes Blue Different — image 2",
  blue_training_env: "Training Environment (large)",
  blue_pipeline: "National Team Pipeline (one wide rectangle)",
  blue_coach_colton_palmer: "Coaching Excellence — Colton Palmer",
  blue_coach_mike_macchiavello: "Coaching Excellence — Mike Macchiavello",
  blue_coach_araad_fischer: "Coaching Excellence — Araad Fisher",
  blue_team_photo: "Blue Roster (team photo)",
  blue_shirt: "Blue shirt (Membership & Registration section)",
}

const PAGE_IMAGE_KEYS: BlueImageKey[] = [
  "blue_banner_url",
  "blue_national_team_kids",
  "blue_what_makes_1",
  "blue_what_makes_2",
  "blue_training_env",
  "blue_pipeline",
  "blue_shirt",
  "blue_team_photo",
]

const COACH_PHOTO_KEYS: BlueImageKey[] = [
  "blue_coach_colton_palmer",
  "blue_coach_mike_macchiavello",
  "blue_coach_araad_fischer",
]

export default function AdminBlueImagesPage() {
  const [content, setContent] = useState<BlueContent | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadContent = useCallback(async (retryCount = 0) => {
    setLoading(true)
    try {
      const res = await fetch("/api/blue/content", {
        cache: "no-store",
        credentials: "include",
        headers: { "Cache-Control": "no-cache, no-store" },
      })
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setContent(data)
    } catch {
      if (retryCount < 2) {
        await new Promise((r) => setTimeout(r, 600 + retryCount * 400))
        return loadContent(retryCount + 1)
      }
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadContent(), 300)
    return () => clearTimeout(t)
  }, [loadContent])

  const saveSlot = async (key: BlueImageKey, url: string) => {
    // "Remove" sends empty string; API requires a valid URL, so reset to default locally
    if (!url || !url.startsWith("http")) {
      setContent((prev) => (prev ? { ...prev, [key]: BLUE_IMAGE_KEYS[key] } : null))
      toast({
        title: "Image reset",
        description: `${SLOT_LABELS[key]} reverted to default.`,
      })
      return
    }
    try {
      const res = await fetch("/api/admin/blue/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, value: url }),
      })
      const errBody = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = errBody.error || errBody.details || `HTTP ${res.status}`
        throw new Error(msg)
      }
      setContent((prev) => (prev ? { ...prev, [key]: url } : null))
      toast({
        title: "Image saved",
        description: `${SLOT_LABELS[key]} updated. Check the Blue page to see it.`,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      toast({
        title: "Could not save",
        description: msg,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/blue" prefetch={false}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-[#03154C]">Blue Page Images</h1>
      </div>
      <p className="text-muted-foreground">
        Upload or replace any image on the{" "}
        <Link href="/blue" className="font-medium text-[#03154C] hover:underline">
          Blue
        </Link>{" "}
        page. Same as profile pics: pick a file and it updates. Only admins see this page; when the page looks good you can leave it as-is and the public never sees uploads.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Coach photos first so they're impossible to miss */}
          <section className="rounded-lg border-2 border-[#D3B574] bg-[#03154C]/5 p-4">
            <h2 className="text-lg font-semibold text-[#03154C] mb-1">Coach photos (Coaching Excellence)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Colton Palmer, Mike Macchiavello, Araad Fisher — update each photo below.
            </p>
            <div className="space-y-6">
              {COACH_PHOTO_KEYS.map((key) => {
                const url = content?.[key]
                return (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle className="text-base">{SLOT_LABELS[key]}</CardTitle>
                      <CardDescription>Upload a new image to use on the Blue page</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {url && (
                        <div className="overflow-hidden rounded-lg border-2 border-[#D3B574]/30 bg-gray-50">
                          <Image
                            src={url}
                            alt={SLOT_LABELS[key]}
                            width={600}
                            height={300}
                            className="h-auto w-full object-contain max-h-48"
                            unoptimized
                          />
                        </div>
                      )}
                      <ImageUpload
                        category="blue"
                        entityName={key.replace("blue_", "")}
                        existingImageUrl={url}
                        onUploadComplete={(newUrl) => saveSlot(key, newUrl)}
                        aspectRatio="square"
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#03154C] mb-4">Other page images</h2>
            <div className="space-y-6">
              {PAGE_IMAGE_KEYS.map((key) => {
                const url = content?.[key]
                return (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle className="text-base">{SLOT_LABELS[key]}</CardTitle>
                      <CardDescription>Upload a new image to use on the Blue page</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {url && (
                        <div className="overflow-hidden rounded-lg border-2 border-[#D3B574]/30 bg-gray-50">
                          <Image
                            src={url}
                            alt={SLOT_LABELS[key]}
                            width={600}
                            height={300}
                            className="h-auto w-full object-contain max-h-48"
                            unoptimized
                          />
                        </div>
                      )}
                      <ImageUpload
                        category="blue"
                        entityName={key.replace("blue_", "")}
                        existingImageUrl={url}
                        onUploadComplete={(newUrl) => saveSlot(key, newUrl)}
                        aspectRatio={key === "blue_banner_url" || key === "blue_pipeline" ? "wide" : "square"}
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/blue" className="hover:underline">
          View Blue page →
        </Link>
      </p>
    </div>
  )
}
