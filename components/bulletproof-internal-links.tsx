"use client"

import { useEffect } from "react"

/**
 * Force every internal link and form navigation to a single full page load (window.location).
 * Prevents any other handler (Next.js router, auth redirect, etc.) from running and canceling the request.
 *
 * - Clicks on same-origin <a>: capture phase → preventDefault, stopPropagation, window.location.href.
 * - Submits of same-origin <form> (e.g. Store GET /store-app): capture phase → preventDefault, window.location.href.
 * No exceptions (store, admin, etc.) — one code path so nothing can race or cancel.
 */
export function BulletproofInternalLinks() {
  useEffect(() => {
    const isSameOrigin = (url: URL) => url.origin === window.location.origin

    const handleClick = (e: MouseEvent) => {
      if (typeof window === "undefined") return
      const target = e.target as Node
      let el: Element | null = target?.nodeType === 1 ? (target as Element) : (target?.parentElement ?? null)
      const anchor = el?.closest?.("a") ?? null
      if (!anchor || !anchor.href) return

      const isNewTab = anchor.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey
      if (isNewTab) return

      try {
        const url = new URL(anchor.href)
        if (!isSameOrigin(url)) return
      } catch {
        return
      }

      if (window.location.search.includes("bulletproof_debug=1")) {
        console.log("[RecruitNC] BulletproofInternalLinks: link →", anchor.href)
      }
      e.preventDefault()
      e.stopPropagation()
      window.location.href = anchor.href
    }

    const handleSubmit = (e: Event) => {
      if (typeof window === "undefined") return
      const form = e.target as HTMLFormElement
      if (!form || form.tagName !== "FORM") return
      const method = (form.getAttribute("method") ?? "").toLowerCase()
      if (method !== "get") return
      const action = (form.getAttribute("action") ?? "").trim() || window.location.pathname
      try {
        const url = new URL(action, window.location.origin)
        if (!isSameOrigin(url)) return
      } catch {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const finalUrl = new URL(form.action, window.location.origin)
      const formData = new FormData(form)
      formData.forEach((value, key) => {
        finalUrl.searchParams.set(key, String(value))
      })
      if (window.location.search.includes("bulletproof_debug=1")) {
        console.log("[RecruitNC] BulletproofInternalLinks: form →", finalUrl.toString())
      }
      window.location.href = finalUrl.toString()
    }

    document.addEventListener("click", handleClick, true)
    document.addEventListener("submit", handleSubmit, true)
    return () => {
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("submit", handleSubmit, true)
    }
  }, [])

  return null
}
