"use client"

import { useEffect } from "react"

/**
 * Logs every click on profile links so we can see in console:
 * - If the log appears: the link received the click (navigation should follow; if it doesn't, something else is wrong).
 * - If the log never appears: something is blocking the click (overlay, or wrong element is on top).
 * Remove this component once profile links are verified working.
 */
export function ProfileLinkDebug() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target?.closest?.("a[href*='/unified-profile/'], a[href*='/athletes/'], a[href*='/prospects/']") as HTMLAnchorElement | null
      if (link?.href) {
        const href = link.getAttribute("href") ?? link.href
        console.log("[RecruitNC profile link] clicked href:", href, "resolved:", link.href)
      }
    }
    document.addEventListener("click", handler, true)
    return () => document.removeEventListener("click", handler, true)
  }, [])
  return null
}
