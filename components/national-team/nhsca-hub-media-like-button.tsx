"use client"

import { useState, type MouseEvent } from "react"
import { Heart, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function NhscaHubMediaLikeButton({
  mediaId,
  likeCount,
  likedByMe,
  onUpdated,
  overlay = false,
  className,
}: {
  mediaId: string
  likeCount: number
  likedByMe: boolean
  onUpdated: (mediaId: string, likeCount: number, likedByMe: boolean) => void
  overlay?: boolean
  className?: string
}) {
  const [busy, setBusy] = useState(false)

  const toggle = async (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const r = await fetch(`/api/national-team/hub/media/${mediaId}/like`, {
        method: "POST",
        credentials: "include",
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error((data as { error?: string }).error ?? "Could not update like.")
      onUpdated(mediaId, (data as { likeCount?: number }).likeCount ?? 0, !!(data as { likedByMe?: boolean }).likedByMe)
    } catch {
      /* ignore — parent can show error if needed */
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void toggle(e)}
      disabled={busy}
      aria-label={likedByMe ? "Unlike" : "Like"}
      aria-pressed={likedByMe}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold transition-colors disabled:opacity-60",
        overlay
          ? "min-h-[36px] px-2.5 bg-black/55 text-white hover:bg-black/70 backdrop-blur-sm"
          : "min-h-[44px] px-4 bg-white/10 text-white hover:bg-white/15 border border-white/15",
        className
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className={cn("h-4 w-4 shrink-0", likedByMe && "fill-[#E85D75] text-[#E85D75]")}
          aria-hidden
        />
      )}
      <span className={cn("tabular-nums", overlay ? "text-xs" : "text-sm")}>{likeCount}</span>
    </button>
  )
}
