"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * Messaging thread URLs redirect to the same thread in Community (Slack-like, one place).
 */
export default function MessagesThreadPage() {
  const router = useRouter()
  const params = useParams()
  const threadId = params?.threadId as string | undefined
  useEffect(() => {
    if (threadId) {
      router.replace(`/forum/dm/${threadId}`)
    } else {
      router.replace("/forum")
    }
  }, [router, threadId])
  return (
    <div className="min-h-screen bg-[#0B2545] flex items-center justify-center">
      <p className="text-white/70">Taking you to Community…</p>
    </div>
  )
}
