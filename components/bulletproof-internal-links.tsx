"use client"

import { useEffect } from "react"

/**
 * Force every internal link click to do a full page load (window.location).
 * Fixes site-wide issue where new/internal links do nothing when clicked
 * (e.g. Next.js client nav or other scripts failing to navigate).
 *
 * Uses capture phase so we run before other handlers. Only affects same-origin
 * and path-only links; target="_blank" and modifier keys are left alone.
 */
export function BulletproofInternalLinks() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (typeof window === "undefined") return
      const target = e.target as Node
      // Find <a> even when click is on a child (e.g. text node or span inside Radix item)
      let el: Element | null = target?.nodeType === 1 ? (target as Element) : (target?.parentElement ?? null)
      const anchor = el?.closest?.("a") ?? null
      if (!anchor || !anchor.href) return

      // Leave external links and new-tab behavior alone
      const isNewTab = anchor.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey
      if (isNewTab) return

      try {
        const url = new URL(anchor.href)
        if (url.origin !== window.location.origin) return
        // Don't intercept store — let browser do native nav so request isn't canceled by layout
        if (url.pathname === "/store" || url.pathname.startsWith("/store/") || url.pathname === "/store-app" || url.pathname.startsWith("/store-app/")) return
      } catch {
        return
      }

      // Internal same-origin link: force full page load so navigation always works
      if (typeof window !== "undefined" && window.location.search.includes("bulletproof_debug=1")) {
        console.log("[BulletproofInternalLinks] intercepting internal link →", anchor.href)
      }
      e.preventDefault()
      e.stopPropagation()
      window.location.href = anchor.href
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [])

  return null
}
