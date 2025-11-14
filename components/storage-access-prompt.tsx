"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export function StorageAccessPrompt() {
  const [needsAccess, setNeedsAccess] = useState(false)
  const [isInIframe, setIsInIframe] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    // Check if we're in an iframe
    const inIframe = window.self !== window.top
    setIsInIframe(inIframe)

    if (!inIframe) return

    // Check if Storage Access API is supported
    if (!document.hasStorageAccess || !document.requestStorageAccess) {
      console.log("[v0] Storage Access API not supported")
      return
    }

    // Check if we already have storage access
    document
      .hasStorageAccess()
      .then((hasAccess) => {
        console.log("[v0] Has storage access:", hasAccess)
        if (!hasAccess) {
          setNeedsAccess(true)
        }
      })
      .catch((error) => {
        console.error("[v0] Error checking storage access:", error)
      })
  }, [])

  const requestAccess = async () => {
    try {
      console.log("[v0] Requesting storage access...")
      await document.requestStorageAccess()
      console.log("[v0] Storage access granted!")
      setNeedsAccess(false)
      // Reload to apply the new permissions
      window.location.reload()
    } catch (error) {
      console.error("[v0] Storage access denied:", error)
      setAccessDenied(true)
      setNeedsAccess(false)
    }
  }

  if (accessDenied && !isDismissed) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black p-2 text-xs">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <span>Limited functionality: Cookies blocked. Some features may not work.</span>
          <button onClick={() => setIsDismissed(true)} className="ml-2 font-bold">
            ✕
          </button>
        </div>
      </div>
    )
  }

  if (!isInIframe || !needsAccess || isDismissed) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 shadow-lg">
      <div className="flex items-center justify-between max-w-4xl mx-auto gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Enable full access to use all features</p>
          <p className="text-xs opacity-90 mt-0.5">Your browser is blocking cookies. Click to grant access.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button onClick={requestAccess} size="sm" className="bg-white text-blue-600 hover:bg-gray-100">
            Enable Access
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-full hover:bg-white/20"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
