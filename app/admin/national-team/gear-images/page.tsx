"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { HardLink } from "@/components/hard-link"
import type { NhscaGearPhoto } from "@/lib/nhsca-duals-2026-gear-images"

const NATIONAL_TEAM_NAVY = "#003366"
const GOLD = "#D3B574"

type ProcessResult = {
  id: string
  label: string
  status: "success" | "error"
  message?: string
  localPath?: string
  savedLocal?: boolean
  blobUrl?: string
}

export default function AdminNhscaGearImagesPage() {
  const [photos, setPhotos] = useState<NhscaGearPhoto[]>([])
  const [falConfigured, setFalConfigured] = useState(false)
  const [blobConfigured, setBlobConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [results, setResults] = useState<ProcessResult[]>([])
  const [manifestJson, setManifestJson] = useState("")

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/process-nhsca-gear-images")
      if (!res.ok) throw new Error("Failed to load gear list")
      const data = await res.json()
      setPhotos(data.photos ?? [])
      setFalConfigured(Boolean(data.falConfigured))
      setBlobConfigured(Boolean(data.blobConfigured))
    } catch (err) {
      console.error("[RecruitNC] gear-images status:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const runProcess = async (ids?: string[]) => {
    setProcessing(true)
    setProcessingId(ids?.length === 1 ? ids[0] : null)
    setResults([])
    setManifestJson("")

    try {
      const res = await fetch("/api/admin/process-nhsca-gear-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Processing failed")

      setResults(data.results ?? [])
      if (data.manifest && Object.keys(data.manifest).length > 0) {
        setManifestJson(JSON.stringify(data.manifest, null, 2))
      }
      await loadStatus()
    } catch (err) {
      setResults([
        {
          id: "error",
          label: "Error",
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      ])
    } finally {
      setProcessing(false)
      setProcessingId(null)
    }
  }

  const envReady = falConfigured && blobConfigured

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <HardLink href="/admin/national-team">
              <ArrowLeft className="h-4 w-4" />
            </HardLink>
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: NATIONAL_TEAM_NAVY }}>
              NHSCA gear — background removal
            </h1>
            <p className="text-gray-600 mt-1">
              Run BiRefNet on team gear mockups (same pipeline as the store). Outputs transparent PNGs to Blob.
            </p>
          </div>
        </div>

        {!loading && !envReady && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-700" />
            <AlertDescription className="text-amber-900">
              Requires <code className="text-xs">FAL_KEY</code> and{" "}
              <code className="text-xs">BLOB_READ_WRITE_TOKEN</code> in Vercel env. Locally, use{" "}
              <code className="text-xs">npm run nhsca:gear-bg</code> to overwrite{" "}
              <code className="text-xs">public/images/nhsca-duals-2026-gear/</code>.
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-6 border-t-4 shadow-lg" style={{ borderTopColor: GOLD }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: NATIONAL_TEAM_NAVY }} />
              Process all gear photos
            </CardTitle>
            <CardDescription>
              Eight cropped PNGs (singlets + apparel). On Vercel, sources are fetched from your live site URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => runProcess()}
              disabled={processing || !envReady}
              className="font-semibold"
              style={{ backgroundColor: GOLD, color: NATIONAL_TEAM_NAVY }}
            >
              {processing && !processingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing all…
                </>
              ) : (
                "Remove backgrounds (all 8)"
              )}
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading gear list…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {photos.map((photo) => {
              const result = results.find((r) => r.id === photo.id)
              const isRunning = processing && processingId === photo.id
              return (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="relative aspect-[3/4] bg-[#002147]/5">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      className="object-contain p-4 drop-shadow-md"
                      sizes="(max-width: 640px) 100vw, 320px"
                      unoptimized
                    />
                  </div>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <p className="font-semibold text-sm">{photo.label}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{photo.id}</p>
                    </div>
                    {result && (
                      <p
                        className={`text-xs ${result.status === "success" ? "text-emerald-700" : "text-red-600"}`}
                      >
                        {result.status === "success" ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {result.message}
                          </span>
                        ) : (
                          result.message
                        )}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={processing || !envReady}
                      onClick={() => runProcess([photo.id])}
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        "Process this image"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {manifestJson && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Manifest JSON</CardTitle>
              <CardDescription>
                Paste into <code className="text-xs">lib/nhsca-gear-processed-manifest.json</code> and commit so
                production uses Blob URLs (or set NEXT_PUBLIC_NHSCA_GEAR_CDN).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-64">
                {manifestJson}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
