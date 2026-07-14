"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

interface WatchListButtonProps {
  athleteId: string
  className?: string
  /** Icon-only control for tight mobile hero toolbars. */
  compact?: boolean
}

export function WatchListButton({ athleteId, className, compact = false }: WatchListButtonProps) {
  const { user, profile } = useAuth()
  const [isStarred, setIsStarred] = useState(false)
  const [loading, setLoading] = useState(false)

  const isCoach =
    profile?.role === "admin" ||
    profile?.is_admin === true ||
    profile?.role === "college-coach" ||
    profile?.role === "coach" ||
    profile?.verified_coach === true

  console.log("[v0] WatchListButton - Auth state:", {
    hasUser: !!user,
    hasProfile: !!profile,
    role: profile?.role,
    is_admin: profile?.is_admin,
    verified_coach: profile?.verified_coach,
    isCoach,
  })

  useEffect(() => {
    if (!user || !isCoach) return

    const checkStarred = async () => {
      try {
        const res = await fetch("/api/coaches/starred-athletes")
        if (res.ok) {
          const { athletes } = await res.json()
          const starred = athletes?.some((item: any) => item.id === athleteId)
          setIsStarred(starred)
          console.log("[v0] WatchListButton - Starred check:", { athleteId, starred, totalStarred: athletes?.length })
        }
      } catch (error) {
        console.error("Error checking watch list:", error)
      }
    }

    checkStarred()
  }, [user, athleteId, isCoach])

  const handleToggleStar = async () => {
    if (!user || !isCoach) {
      console.log("[v0] WatchListButton - Not authorized:", { hasUser: !!user, isCoach })
      alert("Please sign in as a coach to use the watch list feature")
      return
    }

    setLoading(true)
    try {
      console.log("[v0] WatchListButton - Toggling star for athlete:", athleteId)
      const res = await fetch("/api/coach-portal/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          action: isStarred ? "remove" : "add",
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setIsStarred(data.action === "added")
        console.log("[v0] WatchListButton - Star toggled successfully:", data.action)
      } else {
        const errorData = await res.json()
        console.error("[v0] WatchListButton - Failed to toggle:", errorData)
        alert(errorData.error || "Failed to update watch list")
      }
    } catch (error) {
      console.error("Error toggling watch list:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Only show button to coaches and admins
  if (!isCoach) {
    console.log("[v0] WatchListButton - Hiding button, not a coach")
    return null
  }

  return (
    <Button
      onClick={handleToggleStar}
      disabled={loading}
      variant="outline"
      size="sm"
      data-starred={isStarred ? "true" : "false"}
      aria-label={isStarred ? "On Watch List" : "Add to Watch List"}
      title={isStarred ? "On Watch List" : "Add to Watch List"}
      className={`${compact ? "h-9 w-9 p-0 justify-center" : ""} ${
        isStarred
          ? "bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600"
          : "bg-white/90 text-gray-900 border-white hover:bg-white"
      } ${className ?? ""}`}
    >
      <Star className={`w-4 h-4 ${compact ? "" : "mr-2"} ${isStarred ? "fill-white" : ""}`} />
      {compact ? null : isStarred ? "On Watch List" : "Add to Watch List"}
    </Button>
  )
}
