"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, X } from "lucide-react"

export function IframeSignInBanner() {
  const [isInIframe, setIsInIframe] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const inIframe = window.self !== window.top
    setIsInIframe(inIframe)
    return () => {
      document.body.classList.remove("iframe-banner-visible")
    }
  }, [])

  useEffect(() => {
    if (isInIframe && !dismissed) {
      document.body.classList.add("iframe-banner-visible")
    } else {
      document.body.classList.remove("iframe-banner-visible")
    }
    return () => document.body.classList.remove("iframe-banner-visible")
  }, [isInIframe, dismissed])

  if (!isInIframe || dismissed) return null

  const openInNewTab = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer")
  }

  const openInSameTab = () => {
    try {
      window.top!.location.href = window.location.href
    } catch {
      openInNewTab()
    }
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black shadow-lg border-b border-amber-600"
      role="banner"
    >
      <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            Login not working? You&apos;re viewing the app inside another site.
          </p>
          <p className="text-xs mt-0.5 opacity-90">
            Open the app in its own tab so sign-in works (Chrome blocks cookies in embedded views).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={openInNewTab}
            size="sm"
            variant="secondary"
            className="bg-black text-amber-400 hover:bg-gray-900 border-0"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Open in new tab
          </Button>
          <Button
            onClick={openInSameTab}
            size="sm"
            variant="outline"
            className="border-black bg-transparent hover:bg-black/10"
          >
            Open here instead
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full hover:bg-black/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
