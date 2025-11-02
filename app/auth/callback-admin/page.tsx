"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function AdminCallbackPage() {
  const router = useRouter()
  const { session, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        setTimeout(() => {
          router.push("/admin")
          router.refresh()
        }, 100)
      } else {
        router.push("/auth/signin")
      }
    }
  }, [session, isLoading, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Redirecting to admin...</p>
      </div>
    </div>
  )
}
