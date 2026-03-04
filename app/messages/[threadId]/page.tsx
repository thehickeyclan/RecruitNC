"use client"

import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ThreadView } from "@/components/messaging/thread-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

export default function ThreadPage() {
  const params = useParams()
  const { user, isLoading } = useAuth()
  const threadId = typeof params?.threadId === "string" ? params.threadId : ""
  const [threadName, setThreadName] = useState<string>("")
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    if (!threadId || !user) return
    fetch(`/api/messaging/threads/${threadId}`, { credentials: "include" })
      .then((r) => {
        if (r.status === 403) setForbidden(true)
        return r.json()
      })
      .then((data) => setThreadName(data?.thread?.name ?? ""))
      .catch(() => setForbidden(true))
  }, [threadId, user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    )
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = `/auth/signin?returnTo=${encodeURIComponent(`/messages/${threadId}`)}`
    }
    return null
  }

  if (forbidden || !threadId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">You don’t have access to this conversation.</p>
          <Button asChild variant="outline">
            <a href="/messages">Back to Messages</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] bg-white max-w-2xl mx-auto">
      <div className="shrink-0 flex items-center gap-2 border-b px-4 py-3 bg-white">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <a href="/messages" aria-label="Back to messages">
            <ArrowLeft className="h-5 w-5" />
          </a>
        </Button>
        <h1 className="text-lg font-semibold truncate flex-1">{threadName || "…"}</h1>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <ThreadView
          threadId={threadId}
          threadName={threadName}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
