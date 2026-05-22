"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { upload } from "@vercel/blob/client"
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Play, Trash2, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  hubPanelClass,
  hubPanelDescClass,
  hubPanelHeaderClass,
  hubPanelTitleClass,
} from "@/components/national-team/nhsca-hub-theme"
import type { NhscaHubMediaRow } from "@/lib/nhsca-hub-media"
import { NHSCA_HUB_MEDIA_EVENT_SLUG, resolveNhscaHubMediaFile } from "@/lib/nhsca-hub-media"
import { NhscaHubMediaShareButtons } from "@/components/national-team/nhsca-hub-media-share-buttons"
import { NhscaHubMediaLikeButton } from "@/components/national-team/nhsca-hub-media-like-button"
import { cn } from "@/lib/utils"

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function NhscaHubMediaTab({
  isAdmin = false,
  userId,
}: {
  isAdmin?: boolean
  userId?: string | null
}) {
  const { session } = useAuth()
  const [items, setItems] = useState<NhscaHubMediaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tablesReady, setTablesReady] = useState(true)
  const [setupMessage, setSetupMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const authFetchInit = useCallback(
    (init: RequestInit = {}): RequestInit => {
      const headers = new Headers(init.headers)
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`)
      }
      return { ...init, credentials: "include", headers }
    },
    [session?.access_token]
  )

  const viewer = viewerIndex !== null ? items[viewerIndex] ?? null : null
  const canSlideshow = items.length > 1

  const openViewer = useCallback(
    (item: NhscaHubMediaRow) => {
      const i = items.findIndex((x) => x.id === item.id)
      if (i >= 0) setViewerIndex(i)
    },
    [items]
  )

  const closeViewer = useCallback(() => setViewerIndex(null), [])

  const goPrev = useCallback(() => {
    setViewerIndex((i) => {
      if (i === null || items.length === 0) return i
      return i <= 0 ? items.length - 1 : i - 1
    })
  }, [items.length])

  const goNext = useCallback(() => {
    setViewerIndex((i) => {
      if (i === null || items.length === 0) return i
      return i >= items.length - 1 ? 0 : i + 1
    })
  }, [items.length])

  useEffect(() => {
    if (viewerIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer()
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [viewerIndex, closeViewer, goPrev, goNext])

  useEffect(() => {
    if (viewerIndex === null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [viewerIndex])

  const load = useCallback(async () => {
    setError(null)
    const r = await fetch("/api/national-team/hub/media", authFetchInit())
    if (!r.ok) {
      if (r.status === 401) throw new Error("Sign in required.")
      const d = await r.json().catch(() => ({}))
      throw new Error((d as { error?: string }).error ?? `Failed to load (${r.status})`)
    }
    const data = await r.json()
    setItems(data.items ?? [])
    setTablesReady(data.tablesReady !== false)
    setSetupMessage(data.message ?? null)
  }, [authFetchInit])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void load()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load media.")
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    setUploading(true)
    const captionTrimmed = caption.trim()
    const added: NhscaHubMediaRow[] = []

    try {
      for (const file of Array.from(files)) {
        const resolved = resolveNhscaHubMediaFile(file)
        if (!resolved) {
          throw new Error("Use JPEG, PNG, GIF, WebP, HEIC, MP4, MOV, or WebM files only.")
        }

        const uploadHeaders: Record<string, string> = {}
        if (session?.access_token) {
          uploadHeaders.Authorization = `Bearer ${session.access_token}`
        }

        const storagePath = `nhsca-hub-media/${NHSCA_HUB_MEDIA_EVENT_SLUG}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

        const blob = await upload(storagePath, file, {
          access: "public",
          handleUploadUrl: "/api/national-team/hub/media/client-upload",
          headers: uploadHeaders,
          clientPayload: JSON.stringify({
            caption: captionTrimmed || undefined,
            eventSlug: NHSCA_HUB_MEDIA_EVENT_SLUG,
            mediaType: resolved.mediaType,
            contentType: resolved.contentType,
            originalName: file.name,
          }),
        })

        let item: NhscaHubMediaRow | null = null
        for (let attempt = 0; attempt < 5; attempt++) {
          const r = await fetch(
            `/api/national-team/hub/media/client-upload?url=${encodeURIComponent(blob.url)}`,
            authFetchInit()
          )
          if (r.ok) {
            const data = (await r.json()) as { item?: NhscaHubMediaRow }
            if (data.item) {
              item = { ...data.item, like_count: 0, liked_by_me: false }
              break
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 400))
        }

        if (!item) {
          item = {
            id: blob.url,
            event_slug: NHSCA_HUB_MEDIA_EVENT_SLUG,
            user_id: userId ?? "",
            uploader_email: null,
            uploader_name: null,
            media_type: resolved.mediaType,
            url: blob.url,
            filename: file.name,
            caption: captionTrimmed || null,
            content_type: resolved.contentType,
            created_at: new Date().toISOString(),
            like_count: 0,
            liked_by_me: false,
          }
        }

        added.push(item)
      }

      if (added.length) {
        setItems((prev) => [...added, ...prev])
        setCaption("")
        if (fileRef.current) fileRef.current.value = ""
        void load()
      }
    } catch (err) {
      console.error("[RecruitNC] nhsca hub media upload", err)
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const applyLikeUpdate = useCallback((mediaId: string, likeCount: number, likedByMe: boolean) => {
    setItems((prev) =>
      prev.map((x) => (x.id === mediaId ? { ...x, like_count: likeCount, liked_by_me: likedByMe } : x))
    )
  }, [])

  const onDelete = async (item: NhscaHubMediaRow) => {
    const canDelete = isAdmin || (userId && item.user_id === userId)
    if (!canDelete) return
    if (!window.confirm("Remove this from the team gallery?")) return
    setDeletingId(item.id)
    setError(null)
    try {
      const r = await fetch(`/api/national-team/hub/media/${item.id}`, {
        method: "DELETE",
        ...authFetchInit(),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error((data as { error?: string }).error ?? "Delete failed.")
      setItems((prev) => {
        const next = prev.filter((x) => x.id !== item.id)
        if (viewer?.id === item.id) {
          setViewerIndex((idx) => {
            if (idx === null || next.length === 0) return null
            if (idx >= next.length) return next.length - 1
            return idx
          })
        }
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <article className={hubPanelClass}>
        <header className={hubPanelHeaderClass}>
          <h3 className={hubPanelTitleClass}>Team media</h3>
          <p className={hubPanelDescClass}>
            Share photos and videos from the event with NC United families. Only signed-in hub members can view and
            upload.
          </p>
        </header>

        <div className="p-4 sm:p-5 md:p-6 space-y-4">
          {!tablesReady ? (
            <p className="text-sm text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3">
              {setupMessage ?? "Gallery database table is not set up yet. Ask NC United admin to run the Supabase script."}
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-dashed border-white/20 bg-[#0a2040]/60 p-4 space-y-3">
                <label className="block text-xs font-semibold text-white/70">Optional caption</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Day 1 pool duals"
                  maxLength={500}
                  className="w-full min-h-[44px] rounded-lg border border-white/15 bg-[#001a33] px-3 text-sm text-white placeholder:text-white/35"
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*,.heic,.heif,.HEIC,.HEIF"
                  multiple
                  className="sr-only"
                  onChange={(e) => void onUpload(e.target.files)}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="w-full min-h-[52px] rounded-xl bg-[#CBAF5D] hover:bg-[#D3B574] text-[#002147] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      Add photos or videos
                    </>
                  )}
                </button>
                <p className="text-[11px] text-white/40 text-center">
                  Photos up to 10 MB · Videos up to 80 MB · Up to 10 files at once
                </p>
              </div>

              {isAdmin ? (
                <p className="text-xs text-[#CBAF5D]/80">Admin: you can remove any upload to keep the gallery clean.</p>
              ) : null}
            </>
          )}

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#CBAF5D]" aria-label="Loading media" />
            </div>
          ) : items.length === 0 && tablesReady ? (
            <p className="text-sm text-white/50 text-center py-10">No uploads yet — be the first to share a moment.</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => {
                const canDelete = isAdmin || (userId && item.user_id === userId)
                return (
                  <li key={item.id} className="relative group">
                    <div className="relative">
                      <button
                        type="button"
                        className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/10 bg-[#002147]/50 text-left"
                        onClick={() => openViewer(item)}
                      >
                        {item.media_type === "video" ? (
                          <div className="relative h-full w-full flex items-center justify-center bg-black/40">
                            <video
                              src={item.url}
                              className="absolute inset-0 h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                            <span className="relative z-10 rounded-full bg-black/55 p-2.5">
                              <Play className="h-6 w-6 text-white fill-white" />
                            </span>
                          </div>
                        ) : (
                          <Image
                            src={item.url}
                            alt={item.caption || item.filename || "Team photo"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, 200px"
                            unoptimized
                          />
                        )}
                      </button>
                      <NhscaHubMediaLikeButton
                        mediaId={item.id}
                        likeCount={item.like_count ?? 0}
                        likedByMe={!!item.liked_by_me}
                        onUpdated={applyLikeUpdate}
                        overlay
                        className="absolute bottom-2 left-2 z-10"
                      />
                      {canDelete ? (
                        <button
                          type="button"
                          aria-label="Remove"
                          disabled={deletingId === item.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            void onDelete(item)
                          }}
                          className={cn(
                            "absolute top-2 right-2 min-h-[36px] min-w-[36px] rounded-lg bg-red-600/90 text-white flex items-center justify-center",
                            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-md z-10"
                          )}
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-1.5 px-0.5 space-y-1.5">
                      <p className="text-[11px] font-semibold text-white/85 truncate">
                        {item.uploader_name || item.uploader_email || "Parent"}
                      </p>
                      <p className="text-[10px] text-white/40">{formatWhen(item.created_at)}</p>
                      <NhscaHubMediaShareButtons
                        url={item.url}
                        caption={item.caption}
                        mediaType={item.media_type}
                        filename={item.filename}
                        compact
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </article>

      {viewer && viewerIndex !== null ? (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-label="Media slideshow"
        >
          <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {viewer.uploader_name || viewer.uploader_email || "Parent"}
              </p>
              <p className="text-xs text-white/50">
                {formatWhen(viewer.created_at)}
                {canSlideshow ? (
                  <span className="text-white/35">
                    {" "}
                    · {viewerIndex + 1} of {items.length}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <NhscaHubMediaLikeButton
                mediaId={viewer.id}
                likeCount={viewer.like_count ?? 0}
                likedByMe={!!viewer.liked_by_me}
                onUpdated={applyLikeUpdate}
              />
              <button
                type="button"
                onClick={closeViewer}
                className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 text-white flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            className="relative flex-1 min-h-0 flex items-center justify-center"
            onTouchStart={(e) => {
              touchStartX.current = e.changedTouches[0]?.clientX ?? null
            }}
            onTouchEnd={(e) => {
              if (!canSlideshow || touchStartX.current === null) return
              const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
              touchStartX.current = null
              if (Math.abs(dx) < 48) return
              if (dx > 0) goPrev()
              else goNext()
            }}
          >
            {canSlideshow ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-0 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-0 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  aria-label="Next"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}

            {viewer.media_type === "video" ? (
              <video
                key={viewer.id}
                src={viewer.url}
                controls
                playsInline
                className="max-h-full max-w-full rounded-lg px-10"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={viewer.id}
                src={viewer.url}
                alt={viewer.caption || viewer.filename || "Team photo"}
                className="max-h-full max-w-full object-contain rounded-lg px-10 sm:px-14"
              />
            )}
          </div>

          {viewer.caption ? <p className="mt-3 text-sm text-white/80 text-center shrink-0">{viewer.caption}</p> : null}
          {canSlideshow ? (
            <p className="mt-1 text-[11px] text-white/40 text-center shrink-0">Swipe or use arrows to browse</p>
          ) : null}
          <div className="mt-3 shrink-0 max-w-md mx-auto w-full">
            <NhscaHubMediaShareButtons
              url={viewer.url}
              caption={viewer.caption}
              mediaType={viewer.media_type}
              filename={viewer.filename}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
