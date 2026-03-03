"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"

export default function AdminCallbackPage() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next")
  const { session, isLoading } = useAuth()
  const [retried, setRetried] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        const target = next && next !== "/auth/signin" && next.startsWith("/") ? decodeURIComponent(next) : "/admin"
        setTimeout(() => { window.location.href = target }, 800)
        return
      }
      if (!retried) {
        setRetried(true)
        const t = setTimeout(async () => {
          const supabase = createClient()
          const { data: { session: s } } = await supabase.auth.getSession()
          if (s) {
            const target = next && next !== "/auth/signin" && next.startsWith("/") ? decodeURIComponent(next) : "/admin"
            window.location.href = target
          } else {
            const returnTo = next ? `?returnTo=${next}` : ""
            window.location.href = `/auth/signin${returnTo}`
          }
        }, 1200)
        return () => clearTimeout(t)
      }
    }
  }, [session, isLoading, next, retried])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Redirecting to admin...</p>
      </div>
    </div>
  )
}
