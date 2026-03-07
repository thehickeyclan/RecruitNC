"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { ThreadView } from "@/components/messaging/thread-view"
import { Loader2 } from "lucide-react"

export default function ForumDmPage() {
  const params = useParams()
  const conversationId = params.conversationId as string
  const { user } = useAuth()
  const [threadName, setThreadName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!conversationId || !user) {
      setLoading(false)
      if (!user) setNotFound(true)
      return
    }
    fetch(`/api/messaging/threads/${conversationId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) {
          setNotFound(true)
          return null
        }
        return r.json()
      })
      .then(async (data) => {
        if (!data?.thread) {
          setNotFound(true)
          return
        }
        const name = data.thread.name?.trim()
        if (name) {
          setThreadName(name)
          return
        }
        try {
          const membersRes = await fetch(`/api/messaging/threads/${conversationId}/members`, { credentials: "include" })
          const membersData = await membersRes.json()
          const members = (membersData?.members ?? []) as { user_id: string; display_name: string }[]
          const other = members.find((m) => m.user_id !== user?.id)
          setThreadName(other?.display_name?.trim() || "Direct message")
        } catch {
          setThreadName("Direct message")
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [conversationId, user])

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[40vh] px-6 text-center">
        <p className="text-white/70">Sign in to view this conversation.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C8A94A]" />
      </div>
    )
  }

  if (notFound || !threadName) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[40vh] px-6 text-center">
        <p className="text-white/70">Conversation not found or you don’t have access.</p>
        <a href="/forum" className="mt-4 text-[#C8A94A] hover:underline">
          Back to Community
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0B2545]">
      <ThreadView
        threadId={conversationId}
        threadName={threadName}
        currentUserId={user.id}
      />
    </div>
  )
}
