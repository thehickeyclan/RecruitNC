"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2, Play, Trash2, X } from "lucide-react"
import {
  hubPanelClass,
  hubPanelDescClass,
  hubPanelHeaderClass,
  hubPanelTitleClass,
} from "@/components/national-team/nhsca-hub-theme"
import type { NhscaHubMediaRow } from "@/lib/nhsca-hub-media"
import { NhscaHubMediaShareButtons } from "@/components/national-team/nhsca-hub-media-share-buttons"
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
  const [items, setItems] = useState<NhscaHubMediaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tablesReady, setTablesReady] = useState(true)
  const [setupMessage, setSetupMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewer, setViewer] = useState<NhscaHubMediaRow | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setError(null)
    const r = await fetch("/api/national-team/hub/media", { credentials: "include" })
    if (!r.ok) {
      if (r.status === 401) throw new Error("Sign in required.")
      const d = await r.json().catch(() => ({}))
      throw new Error((d as { error?: string }).error ?? `Failed to load (${r.status})`)
    }
    const data = await r.json()
    setItems(data.items ?? [])
    setTablesReady(data.tablesReady !== false)
    setSetupMessage(data.message ?? null)
  }, [])

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
    try {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append("file", f))
      if (caption.trim()) form.append("caption", caption.trim())
      const r = await fetch("/api/national-team/hub/media", {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error((data as { error?: string }).error ?? "Upload failed.")
      const added = (data as { items?: NhscaHubMediaRow[] }).items ?? []
      setItems((prev) => [...added, ...prev])
      setCaption("")
      if (fileRef.current) fileRef.current.value = ""
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const onDelete = async (item: NhscaHubMediaRow) => {
    const canDelete = isAdmin || (userId && item.user_id === userId)
    if (!canDelete) return
    if (!window.confirm("Remove this from the team gallery?")) return
    setDeletingId(item.id)
    setError(null)
    try {
      const r = await fetch(`/api/national-team/hub/media/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error((data as { error?: string }).error ?? "Delete failed.")
      setItems((prev) => prev.filter((x) => x.id !== item.id))
      if (viewer?.id === item.id) setViewer(null)
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
                  accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
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
                    <button
                      type="button"
                      className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/10 bg-[#002147]/50 text-left"
                      onClick={() => setViewer(item)}
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
                          "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-md"
                        )}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </article>

      {viewer ? (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {viewer.uploader_name || viewer.uploader_email || "Parent"}
              </p>
              <p className="text-xs text-white/50">{formatWhen(viewer.created_at)}</p>
            </div>
            <button
              type="button"
              onClick={() => setViewer(null)}
              className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 text-white flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            {viewer.media_type === "video" ? (
              <video src={viewer.url} controls playsInline className="max-h-full max-w-full rounded-lg" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewer.url}
                alt={viewer.caption || viewer.filename || "Team photo"}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            )}
          </div>
          {viewer.caption ? <p className="mt-3 text-sm text-white/80 text-center shrink-0">{viewer.caption}</p> : null}
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
