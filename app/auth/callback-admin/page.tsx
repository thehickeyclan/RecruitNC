"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

export default function AdminCallbackPage() {
  const { session, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        // Full page load so admin receives cookies; client nav can drop them
        setTimeout(() => { window.location.href = "/admin" }, 300)
      } else {
        window.location.href = "/auth/signin"
      }
    }
  }, [session, isLoading])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Redirecting to admin...</p>
      </div>
    </div>
  )
}
