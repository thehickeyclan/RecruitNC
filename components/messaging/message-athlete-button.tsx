"use client"

import { useState, useCallback } from "react"
import { Mail } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface MessageAthleteButtonProps {
  athleteId: string
  /** If already known (e.g. from view-profile), avoids an extra fetch. */
  claimedByUserId?: string | null
  /** Optional label for tooltip and a11y. */
  athleteName?: string
  className?: string
  /** Size of the icon. */
  size?: "sm" | "md"
  /** Inline style for icon class. */
  iconClassName?: string
}

/**
 * Envelope button that starts a DM with the athlete's profile contact (claimed_by_user_id).
 * Shown next to athlete names in rankings and on view-profile. Only visible when logged in
 * and when the athlete has a claimed profile (someone to message).
 */
export function MessageAthleteButton({
  athleteId,
  claimedByUserId,
  athleteName,
  className,
  size = "sm",
  iconClassName,
}: MessageAthleteButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startDm = useCallback(
    async (otherUserId: string) => {
      if (!user || otherUserId === user.id) return
      setError(null)
      setLoading(true)
      try {
        const res = await fetch("/api/messaging/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ other_user_id: otherUserId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? "Failed to start conversation")
        window.location.href = `/messages/${data.threadId}`
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  const handleClick = useCallback(async () => {
    if (!user) {
      window.location.href = `/auth/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
      return
    }
    let otherUserId: string | null = claimedByUserId ?? null
    if (otherUserId === user.id) return
    if (!otherUserId && athleteId) {
      const res = await fetch(
        `/api/messaging/athlete-contact?athlete_id=${encodeURIComponent(athleteId)}`,
        { credentials: "include" }
      )
      const data = await res.json().catch(() => ({}))
      otherUserId = data?.user_id ?? null
    }
    if (!otherUserId) {
      setError("No contact to message for this profile.")
      return
    }
    await startDm(otherUserId)
  }, [user, athleteId, claimedByUserId, startDm])

  const label = athleteName ? `Message ${athleteName}` : "Message"
  const titleText = error ?? (loading ? "Opening conversation…" : label)

  if (!user) {
    return (
      <a
        href={`/auth/signin?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`}
        className={
          className ??
          "inline-flex h-8 w-8 items-center justify-center rounded border border-transparent text-gray-500 hover:bg-gray-100 hover:text-[#003366]"
        }
        aria-label={athleteName ? `Message ${athleteName}` : "Message"}
        title="Sign in to message"
      >
        <Mail className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={titleText}
      className={
        className ??
        "inline-flex h-8 w-8 items-center justify-center rounded border border-transparent text-gray-500 hover:bg-gray-100 hover:text-[#003366] disabled:opacity-50"
      }
      aria-label={label}
    >
      <Mail className={iconClassName ?? (size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
    </button>
  )
}
