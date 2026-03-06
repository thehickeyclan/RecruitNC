"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Old messaging thread URLs redirect to Community (forum).
 * All messaging now lives in the navy dark Community UI.
 */
export default function MessagesThreadPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/forum")
  }, [router])
  return (
    <div className="min-h-screen bg-[#0B2545] flex items-center justify-center">
      <p className="text-white/70">Taking you to Community…</p>
    </div>
  )
}
