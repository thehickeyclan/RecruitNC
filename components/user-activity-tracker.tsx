"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

const SAME_PATH_THROTTLE_MS = 2 * 60 * 1000

export function UserActivityTracker() {
  const pathname = usePathname()
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id || !pathname) return

    const cleanPath = pathname.split("?")[0] || "/"
    const key = `recruitnc:last-activity:${cleanPath}`
    const now = Date.now()

    try {
      const last = Number(sessionStorage.getItem(key) || "0")
      if (last && now - last < SAME_PATH_THROTTLE_MS) return
      sessionStorage.setItem(key, String(now))
    } catch {
      // If storage is unavailable, still record the activity.
    }

    void fetch("/api/track-page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        page_url: cleanPath,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
        source: "global_activity_tracker",
      }),
    }).catch(() => {
      // Activity tracking must never interfere with normal browsing.
    })
  }, [pathname, user?.id])

  return null
}
