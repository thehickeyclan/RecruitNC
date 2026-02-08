"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/image-upload"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ArrowLeft } from "lucide-react"
import type { BlueContent, BlueImageKey } from "@/lib/blue-content"

const SLOT_LABELS: Record<BlueImageKey, string> = {
  blue_banner_url: "Page banner (top)",
  blue_national_team_kids: "National Team kids (Tobin, Mac, Bentley)",
  blue_what_makes_1: "What Makes Blue Different — image 1",
  blue_what_makes_2: "What Makes Blue Different — image 2",
  blue_training_env: "Training Environment (large)",
  blue_pipeline_1: "National Team Pipeline — image 1",
  blue_pipeline_2: "National Team Pipeline — image 2",
  blue_pipeline_3: "National Team Pipeline — image 3",
}

const SLOT_ORDER: BlueImageKey[] = [
  "blue_banner_url",
  "blue_national_team_kids",
  "blue_what_makes_1",
  "blue_what_makes_2",
  "blue_training_env",
  "blue_pipeline_1",
  "blue_pipeline_2",
  "blue_pipeline_3",
]

export default function AdminBluePage() {
  const [content, setContent] = useState<BlueContent | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadContent = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/blue/content")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setContent(data)
    } catch {
      setContent(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContent()
  }, [])

  const saveSlot = async (key: BlueImageKey, url: string) => {
    try {
      const res = await fetch("/api/admin/blue/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: url }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save")
      }
      setContent((prev) => (prev ? { ...prev, [key]: url } : null))
      toast({
        title: "Image saved",
        description: `${SLOT_LABELS[key]} updated. Check the Blue page to see it.`,
      })
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
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
        <div className="space-y-6">
          {SLOT_ORDER.map((key) => {
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
                    aspectRatio={key === "blue_banner_url" ? "wide" : "square"}
                  />
                </CardContent>
              </Card>
            )
          })}
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
