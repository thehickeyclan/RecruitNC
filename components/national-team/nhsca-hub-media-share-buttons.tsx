"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Download, Link2, Loader2, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NhscaHubMediaType } from "@/lib/nhsca-hub-media"

function shareMessage(url: string, caption?: string | null) {
  const line = caption?.trim() || "NC United at NHSCA Duals"
  return `${line}\n${url}`
}

async function fetchMediaFile(
  url: string,
  mediaType: NhscaHubMediaType,
  filename?: string | null
): Promise<File | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const ext = mediaType === "video" ? "mp4" : "jpg"
    const type = blob.type || (mediaType === "video" ? "video/mp4" : "image/jpeg")
    const base = (filename || `nc-united.${ext}`).replace(/[^\w.-]+/g, "_")
    return new File([blob], base.includes(".") ? base : `${base}.${ext}`, { type })
  } catch {
    return null
  }
}

function canShareFiles(file: File): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false
  const payload: ShareData = { files: [file] }
  return !navigator.canShare || navigator.canShare(payload)
}

export function NhscaHubMediaShareButtons({
  url,
  caption,
  mediaType = "image",
  filename,
  compact = false,
  className,
}: {
  url: string
  caption?: string | null
  mediaType?: NhscaHubMediaType
  filename?: string | null
  compact?: boolean
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [nativeShareOk, setNativeShareOk] = useState(false)

  const message = shareMessage(url, caption)
  const mediaLabel = mediaType === "video" ? "video" : "photo"

  useEffect(() => {
    setNativeShareOk(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [])

  const flash = useCallback((text: string) => {
    setFeedback(text)
    window.setTimeout(() => setFeedback(null), 2200)
  }, [])

  const getFile = useCallback(async () => {
    return fetchMediaFile(url, mediaType, filename)
  }, [url, mediaType, filename])

  const onShare = async () => {
    setBusy(true)
    try {
      const file = await getFile()
      const text = message

      if (file && canShareFiles(file)) {
        try {
          await navigator.share({
            files: [file],
            text,
            title: "NC United",
          })
          flash("Shared!")
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return
        }
      }

      if (nativeShareOk) {
        try {
          await navigator.share({ url, text, title: "NC United" })
          flash("Shared!")
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return
        }
      }

      await onDownload(true)
      flash("Saved — attach from your photos to text or post")
    } finally {
      setBusy(false)
    }
  }

  const onDownload = async (quiet = false) => {
    if (!quiet) setBusy(true)
    try {
      const file = await getFile()
      if (file) {
        const blobUrl = URL.createObjectURL(file)
        const a = document.createElement("a")
        a.href = blobUrl
        a.download = file.name
        a.rel = "noopener"
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(blobUrl)
        if (!quiet) flash("Downloaded!")
        return
      }
      window.open(url, "_blank", "noopener,noreferrer")
      if (!quiet) flash("Opened in new tab")
    } finally {
      if (!quiet) setBusy(false)
    }
  }

  const onCopyLink = async () => {
    setBusy(true)
    try {
      await navigator.clipboard.writeText(message)
      flash("Link copied!")
    } catch {
      flash("Could not copy — try Share or Download")
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <div
        className={cn("space-y-1", className)}
        onClick={(e) => e.stopPropagation()}
        role="group"
        aria-label={`Share ${mediaLabel}`}
      >
        <div className="flex items-center gap-1">
          <ActionBtn
            compact
            busy={busy}
            onClick={() => void onShare()}
            icon={<Share2 className="h-3.5 w-3.5" />}
            label="Share"
            primary
          />
          <ActionBtn
            compact
            busy={busy}
            onClick={() => void onDownload()}
            icon={<Download className="h-3.5 w-3.5" />}
            label="Save"
          />
          <ActionBtn
            compact
            busy={busy}
            onClick={() => void onCopyLink()}
            icon={<Link2 className="h-3.5 w-3.5" />}
            label="Link"
          />
        </div>
        {feedback ? <p className="text-[10px] text-[#CBAF5D] leading-tight">{feedback}</p> : null}
      </div>
    )
  }

  return (
    <div
      className={cn("space-y-2", className)}
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label={`Share ${mediaLabel}`}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => void onShare()}
        className={cn(
          "w-full min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2",
          "bg-[#CBAF5D] hover:bg-[#D3B574] text-[#002147] disabled:opacity-50"
        )}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
        Share {mediaLabel}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDownload()}
          className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCopyLink()}
          className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Link2 className="h-4 w-4" />
          Copy link
        </button>
      </div>

      <p className="text-[11px] text-white/45 text-center leading-snug">
        {nativeShareOk
          ? "On your phone, Share opens Messages, Instagram, Facebook, and more."
          : "Download the file, then attach it in Messages or your favorite app."}
      </p>

      {feedback ? (
        <p className="text-xs text-center text-[#CBAF5D] font-medium" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  )
}

function ActionBtn({
  compact,
  busy,
  onClick,
  icon,
  label,
  primary,
}: {
  compact?: boolean
  busy: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  primary?: boolean
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1 rounded-md font-semibold transition-opacity min-h-[28px]",
        compact ? "px-1.5 py-1 text-[10px]" : "px-2 py-1.5 text-xs",
        primary
          ? "bg-[#CBAF5D]/90 hover:bg-[#CBAF5D] text-[#002147]"
          : "bg-white/10 hover:bg-white/20 text-white",
        busy && "opacity-50 pointer-events-none"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
