"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Messages inbox has been replaced by Community (forum).
 * Redirect so all messaging lives in the navy dark Community UI.
 */
export default function MessagesPage() {
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
