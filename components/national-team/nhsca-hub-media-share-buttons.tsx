"use client"

import { useState } from "react"
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
    const type =
      blob.type ||
      (mediaType === "video" ? "video/mp4" : "image/jpeg")
    const base = (filename || `nc-united.${ext}`).replace(/[^\w.-]+/g, "_")
    return new File([blob], base.includes(".") ? base : `${base}.${ext}`, { type })
  } catch {
    return null
  }
}

async function shareFileNative(file: File, text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false
  const payload: ShareData = { files: [file], text }
  if (navigator.canShare && !navigator.canShare(payload)) return false
  try {
    await navigator.share(payload)
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return true
    return false
  }
}

export function NhscaHubMediaShareButtons({
  url,
  caption,
  mediaType = "image",
  compact = false,
  className,
}: {
  url: string
  caption?: string | null
  mediaType?: NhscaHubMediaType
  compact?: boolean
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const message = shareMessage(url, caption)

  const shareWithFile = async (afterNative?: () => void) => {
    setBusy(true)
    try {
      const file = await fetchMediaFile(url, mediaType)
      if (file && (await shareFileNative(file, message))) return
      afterNative?.()
    } finally {
      setBusy(false)
    }
  }

  const shareInstagram = () =>
    void shareWithFile(async () => {
      try {
        await navigator.clipboard.writeText(message)
      } catch {
        /* ignore */
      }
      window.location.href = "instagram://app"
      window.setTimeout(() => {
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer")
      }, 600)
    })

  const shareFacebook = () =>
    void shareWithFile(() => {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        "_blank",
        "noopener,noreferrer"
      )
    })

  const shareText = () =>
    void shareWithFile(() => {
      window.location.href = `sms:?&body=${encodeURIComponent(message)}`
    })

  const btnClass = cn(
    "inline-flex items-center justify-center rounded-md transition-opacity",
    "bg-white/10 hover:bg-white/20 active:scale-95",
    compact ? "h-7 w-7 text-sm" : "h-9 w-9 text-base",
    busy && "opacity-50 pointer-events-none"
  )

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label="Share photo"
    >
      <button
        type="button"
        onClick={shareInstagram}
        disabled={busy}
        className={btnClass}
        aria-label="Share on Instagram"
        title="Instagram"
      >
        📸
      </button>
      <button
        type="button"
        onClick={shareFacebook}
        disabled={busy}
        className={btnClass}
        aria-label="Share on Facebook"
        title="Facebook"
      >
        📘
      </button>
      <button
        type="button"
        onClick={shareText}
        disabled={busy}
        className={btnClass}
        aria-label="Share via text message"
        title="Text"
      >
        💬
      </button>
    </div>
  )
}
