"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    // Check if we're in impersonation mode
    const checkImpersonation = async () => {
      try {
        const response = await fetch("/api/admin/check-impersonation")
        if (response.ok) {
          const data = await response.json()
          setIsImpersonating(data.isImpersonating)
        }
      } catch (error) {
        console.error("[v0] Failed to check impersonation status:", error)
      }
    }

    checkImpersonation()
  }, [])

  const handleStopImpersonation = async () => {
    try {
      const response = await fetch("/api/admin/stop-impersonation", {
        method: "POST",
      })

      if (response.ok) {
        window.location.href = "/admin/schools"
      }
    } catch (error) {
      console.error("[v0] Failed to stop impersonation:", error)
    }
  }

  if (!isImpersonating) return null

  return (
    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <span className="font-medium">Admin Impersonation Mode Active</span>
      </div>
      <Button size="sm" variant="secondary" onClick={handleStopImpersonation}>
        Exit Impersonation
      </Button>
    </div>
  )
}
